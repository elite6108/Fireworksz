import { supabase } from '../lib/supabase';
import { GalleryImage, GalleryImageCreateRequest, GalleryUploadResponse } from '../types/gallery';
import { v4 as uuidv4 } from 'uuid';

const BUCKET_NAME = 'gallery';

/**
 * Upload an image to the gallery storage bucket
 */
export const uploadImage = async (file: File, folder: string = 'products'): Promise<GalleryUploadResponse | null> => {
  try {
    // Check if user is admin before attempting upload
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user?.id)
      .single();
    
    if (profileError || profile?.role !== 'admin') {
      console.error('Error: Only admin users can upload images');
      throw new Error('Only admin users can upload images');
    }

    // Create a unique file name to prevent collisions
    const fileExt = file.name.split('.').pop();
    const fileName = `${uuidv4()}.${fileExt}`;
    const filePath = `${folder}/${fileName}`;

    // Upload the file to Supabase Storage
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Error uploading image:', error);
      throw error;
    }

    // Get the public URL for the uploaded file
    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    return {
      path: data.path,
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
    const { data, error } = await supabase
      .from('gallery')
      .insert(imageData)
      .select()
      .single();

    if (error) {
      console.error('Error creating gallery image:', error);
      throw error;
    }

    return data;
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
    let query = supabase
      .from('gallery')
      .select('*')
      .order('created_at', { ascending: false });

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching gallery images:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error in getGalleryImages:', error);
    return [];
  }
};

/**
 * Delete a gallery image
 */
export const deleteGalleryImage = async (id: string, storagePath: string): Promise<boolean> => {
  try {
    // First delete the file from storage
    const { error: storageError } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([storagePath]);

    if (storageError) {
      console.error('Error deleting image from storage:', storageError);
      throw storageError;
    }

    // Then delete the database record
    const { error: dbError } = await supabase
      .from('gallery')
      .delete()
      .eq('id', id);

    if (dbError) {
      console.error('Error deleting gallery image record:', dbError);
      throw dbError;
    }

    return true;
  } catch (error) {
    console.error('Error in deleteGalleryImage:', error);
    return false;
  }
};

/**
 * Update a gallery image
 */
export const updateGalleryImage = async (id: string, updates: Partial<GalleryImage>): Promise<GalleryImage | null> => {
  try {
    const { data, error } = await supabase
      .from('gallery')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating gallery image:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in updateGalleryImage:', error);
    return null;
  }
};

/**
 * Toggle the public status of a gallery image
 */
export const toggleImagePublicStatus = async (id: string, isPublic: boolean): Promise<GalleryImage | null> => {
  try {
    const { data, error } = await supabase
      .from('gallery')
      .update({ is_public: isPublic })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating image public status:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in toggleImagePublicStatus:', error);
    return null;
  }
};

/**
 * Get public gallery images
 */
export const getPublicGalleryImages = async (category?: string): Promise<GalleryImage[]> => {
  try {
    let query = supabase
      .from('gallery')
      .select('*')
      .eq('is_public', true)
      .order('created_at', { ascending: false });

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching public gallery images:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error in getPublicGalleryImages:', error);
    return [];
  }
};
