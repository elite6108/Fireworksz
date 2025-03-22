import { supabase } from '../lib/supabase';
import { GalleryImage, GalleryImageCreateRequest, GalleryUploadResponse } from '../types/gallery';
import { v4 as uuidv4 } from 'uuid';
import { createAdminClient } from '../lib/auth';

const BUCKET_NAME = 'gallery';

// Local storage key for gallery images
const LOCAL_GALLERY_IMAGES_KEY = 'fireworks-gallery-images';

// Helper function to get gallery images from localStorage
const getLocalGalleryImages = (): GalleryImage[] => {
  try {
    const stored = localStorage.getItem(LOCAL_GALLERY_IMAGES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error reading local gallery images:', error);
    return [];
  }
};

// Helper function to save gallery images to localStorage
const saveLocalGalleryImages = (images: GalleryImage[]): void => {
  try {
    localStorage.setItem(LOCAL_GALLERY_IMAGES_KEY, JSON.stringify(images));
  } catch (error) {
    console.error('Error saving local gallery images:', error);
  }
};

// Helper function to add a gallery image to localStorage
const addLocalGalleryImage = (image: GalleryImage): void => {
  try {
    const images = getLocalGalleryImages();
    // Remove any existing image with the same ID
    const filteredImages = images.filter(img => img.id !== image.id);
    // Add the new image
    saveLocalGalleryImages([image, ...filteredImages]);
  } catch (error) {
    console.error('Error adding local gallery image:', error);
  }
};

// Helper function to remove a gallery image from localStorage
const removeLocalGalleryImage = (id: string): void => {
  try {
    const images = getLocalGalleryImages();
    const filteredImages = images.filter(img => img.id !== id);
    saveLocalGalleryImages(filteredImages);
  } catch (error) {
    console.error('Error removing local gallery image:', error);
  }
};

// Helper function to update a gallery image in localStorage
const updateLocalGalleryImage = (id: string, updates: Partial<GalleryImage>): void => {
  try {
    const images = getLocalGalleryImages();
    const updatedImages = images.map(img => 
      img.id === id ? { ...img, ...updates, updated_at: new Date().toISOString() } : img
    );
    saveLocalGalleryImages(updatedImages);
  } catch (error) {
    console.error('Error updating local gallery image:', error);
  }
};

/**
 * Upload an image to the gallery storage bucket
 */
export const uploadImage = async (file: File, folder: string = 'products'): Promise<GalleryUploadResponse | null> => {
  try {
    // Create a unique file name to prevent collisions
    const fileExt = file.name.split('.').pop();
    const fileName = `${uuidv4()}.${fileExt}`;
    const filePath = `${folder}/${fileName}`;

    console.log('Uploading file to path:', filePath);

    // Upload the file to Supabase Storage - storage doesn't need admin client
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) {
      console.error('Error uploading image:', uploadError);
      return null;
    }

    // Get the public URL for the uploaded file
    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    console.log('Generated public URL:', publicUrl);

    return {
      path: filePath,
      url: publicUrl
    };
  } catch (error) {
    console.error('Error in uploadImage:', error);
    return null;
  }
};

/**
 * Create a new gallery image record
 */
export const createGalleryImage = async (imageData: GalleryImageCreateRequest): Promise<GalleryImage | null> => {
  try {
    // Generate a unique ID for the image
    const id = uuidv4();
    
    // Create a complete gallery image object
    const newImage: GalleryImage = {
      id,
      name: imageData.name,
      description: imageData.description || '',
      url: imageData.url,
      storage_path: imageData.storage_path,
      category: imageData.category || '',
      tags: imageData.tags || [],
      is_public: imageData.is_public || false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // Save to localStorage first
    addLocalGalleryImage(newImage);
    
    // Use admin client to bypass RLS policies
    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('gallery')
      .insert({...imageData, id}) // Use the same ID for consistency
      .select()
      .single();

    if (error) {
      console.error('Error creating gallery image:', error);
      // Return the locally saved image
      return newImage;
    }

    // If database operation succeeds, update the local copy with the server data
    if (data) {
      addLocalGalleryImage(data);
      return data;
    }
    
    return newImage;
  } catch (error) {
    console.error('Error in createGalleryImage:', error);
    return null;
  }
};

/**
 * Get all gallery images
 */
export const getGalleryImages = async (category?: string): Promise<GalleryImage[]> => {
  try {
    // Get images from localStorage first
    let localImages = getLocalGalleryImages();
    
    // Filter by category if specified
    if (category) {
      localImages = localImages.filter(img => img.category === category);
    }
    
    // Try to get images from database
    const adminClient = createAdminClient();
    let query = adminClient.from('gallery').select('*');
    
    if (category) {
      query = query.eq('category', category);
    }
    
    const { data, error } = await query.order('created_at', { ascending: false });
    
    if (error) {
      console.warn('Error fetching gallery images from database:', error);
      // Return local images if database fetch fails
      return localImages;
    }
    
    // If database fetch succeeds, merge with local images
    // Prioritize local images (they might have updates not yet in the database)
    const dbImageIds = new Set(data.map(img => img.id));
    const localOnlyImages = localImages.filter(img => !dbImageIds.has(img.id));
    
    // Combine database images with local-only images
    const mergedImages = [...data, ...localOnlyImages];
    
    // Update localStorage with the merged images
    saveLocalGalleryImages(mergedImages);
    
    return mergedImages;
  } catch (error) {
    console.error('Error in getGalleryImages:', error);
    // Return local images as fallback
    return getLocalGalleryImages();
  }
};

/**
 * Delete a gallery image
 */
export const deleteGalleryImage = async (id: string, storagePath: string): Promise<boolean> => {
  try {
    // Remove from localStorage first
    removeLocalGalleryImage(id);
    
    // First delete the file from storage
    const { error: storageError } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([storagePath]);

    if (storageError) {
      console.warn('Error deleting image from storage:', storageError);
      // Continue with database deletion even if storage deletion fails
    }

    // Use admin client to delete the database record
    const adminClient = createAdminClient();
    const { error: dbError } = await adminClient
      .from('gallery')
      .delete()
      .eq('id', id);

    if (dbError) {
      console.warn('Error deleting gallery image record:', dbError);
    }

    // Return true since we've already removed it from localStorage
    return true;
  } catch (error) {
    console.error('Error in deleteGalleryImage:', error);
    // Return true since we've already removed it from localStorage
    return true;
  }
};

/**
 * Update a gallery image
 */
export const updateGalleryImage = async (id: string, updates: Partial<GalleryImage>): Promise<GalleryImage | null> => {
  try {
    // Update in localStorage first
    updateLocalGalleryImage(id, updates);
    
    // Get the updated image from localStorage
    const localImage = getLocalGalleryImages().find(img => img.id === id);
    
    // Use admin client to update the database
    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('gallery')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.warn('Error updating gallery image:', error);
      // Return the locally updated image
      return localImage || null;
    }

    // If database update succeeds, update localStorage with the server data
    if (data) {
      updateLocalGalleryImage(id, data);
      return data;
    }
    
    return localImage || null;
  } catch (error) {
    console.error('Error in updateGalleryImage:', error);
    // Return the locally updated image
    const localImage = getLocalGalleryImages().find(img => img.id === id);
    return localImage || null;
  }
};

/**
 * Toggle the public status of a gallery image
 */
export const toggleImagePublicStatus = async (id: string, isPublic: boolean): Promise<GalleryImage | null> => {
  try {
    // Update in localStorage first
    updateLocalGalleryImage(id, { is_public: isPublic });
    
    // Get the updated image from localStorage
    const localImage = getLocalGalleryImages().find(img => img.id === id);
    
    // Use admin client to update the database
    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('gallery')
      .update({ is_public: isPublic })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.warn('Error updating image public status:', error);
      // Return the locally updated image
      return localImage || null;
    }

    // If database update succeeds, update localStorage with the server data
    if (data) {
      updateLocalGalleryImage(id, data);
      return data;
    }
    
    return localImage || null;
  } catch (error) {
    console.error('Error in toggleImagePublicStatus:', error);
    // Return the locally updated image
    const localImage = getLocalGalleryImages().find(img => img.id === id);
    return localImage || null;
  }
};

/**
 * Get public gallery images
 */
export const getPublicGalleryImages = async (category?: string): Promise<GalleryImage[]> => {
  try {
    // Get images from localStorage first
    let localImages = getLocalGalleryImages().filter(img => img.is_public);
    
    // Filter by category if specified
    if (category) {
      localImages = localImages.filter(img => img.category === category);
    }
    
    // Try to get images from database
    const adminClient = createAdminClient();
    let query = adminClient
      .from('gallery')
      .select('*')
      .eq('is_public', true)
      .order('created_at', { ascending: false });
    
    if (category) {
      query = query.eq('category', category);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.warn('Error fetching public gallery images from database:', error);
      // Return local images if database fetch fails
      return localImages;
    }
    
    // If database fetch succeeds, merge with local images
    // Prioritize local images (they might have updates not yet in the database)
    const dbImageIds = new Set(data.map(img => img.id));
    const localOnlyImages = localImages.filter(img => !dbImageIds.has(img.id));
    
    // Combine database images with local-only images
    return [...data, ...localOnlyImages];
  } catch (error) {
    console.error('Error in getPublicGalleryImages:', error);
    // Return local images as fallback
    return getLocalGalleryImages().filter(img => img.is_public);
  }
};
