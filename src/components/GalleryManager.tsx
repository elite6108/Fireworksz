import { useState, useEffect, ChangeEvent } from 'react';
import { Upload, X, Image as ImageIcon, RefreshCw, Check, Trash2, Globe, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import { 
  uploadImage, 
  createGalleryImage, 
  getGalleryImages, 
  deleteGalleryImage,
  toggleImagePublicStatus
} from '../services/galleryService';
import { GalleryImage } from '../types/gallery';
import { useAuth } from '../store/auth';

export function GalleryManager() {
  const { user } = useAuth();
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageName, setImageName] = useState('');
  const [imageDescription, setImageDescription] = useState('');
  const [imageCategory, setImageCategory] = useState('');
  const [imageTags, setImageTags] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [filter, setFilter] = useState('');

  // Fetch gallery images on component mount
  useEffect(() => {
    fetchGalleryImages();
  }, []);

  const fetchGalleryImages = async () => {
    setLoading(true);
    try {
      const galleryImages = await getGalleryImages();
      setImages(galleryImages);
    } catch (error) {
      console.error('Error fetching gallery images:', error);
      toast.error('Failed to load gallery images');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setImageName(file.name.split('.')[0]); // Set default name to filename without extension
      
      // Create a preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Please select a file to upload');
      return;
    }

    if (!imageName.trim()) {
      toast.error('Please enter a name for the image');
      return;
    }

    setUploading(true);
    try {
      // Upload the file to Supabase Storage
      const uploadResult = await uploadImage(selectedFile, 'products');
      
      if (!uploadResult) {
        throw new Error('Failed to upload image');
      }

      // Create a gallery record
      const tagsArray = imageTags.split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);

      const galleryImage = await createGalleryImage({
        name: imageName,
        description: imageDescription || undefined,
        url: uploadResult.url,
        storage_path: uploadResult.path,
        category: imageCategory || undefined,
        tags: tagsArray.length > 0 ? tagsArray : undefined,
        is_public: Boolean(isPublic) // Ensure is_public is sent as a boolean
      });

      if (galleryImage) {
        toast.success('Image uploaded successfully');
        // Reset form
        setSelectedFile(null);
        setImagePreview(null);
        setImageName('');
        setImageDescription('');
        setImageCategory('');
        setImageTags('');
        setIsPublic(false);
        // Refresh gallery
        fetchGalleryImages();
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (image: GalleryImage) => {
    if (window.confirm(`Are you sure you want to delete "${image.name}"?`)) {
      try {
        const success = await deleteGalleryImage(image.id, image.storage_path);
        if (success) {
          toast.success('Image deleted successfully');
          // Remove the image from the state
          setImages(images.filter(img => img.id !== image.id));
        } else {
          throw new Error('Failed to delete image');
        }
      } catch (error) {
        console.error('Error deleting image:', error);
        toast.error('Failed to delete image');
      }
    }
  };

  const handleTogglePublic = async (image: GalleryImage) => {
    try {
      const newPublicStatus = !image.is_public;
      const updatedImage = await toggleImagePublicStatus(image.id, newPublicStatus);
      
      if (updatedImage) {
        // Update the image in the state
        setImages(images.map(img => 
          img.id === image.id ? { ...img, is_public: newPublicStatus } : img
        ));
        
        toast.success(`Image is now ${newPublicStatus ? 'public' : 'private'}`);
      } else {
        throw new Error('Failed to update image status');
      }
    } catch (error) {
      console.error('Error toggling image public status:', error);
      toast.error('Failed to update image status');
    }
  };

  const filteredImages = filter
    ? images.filter(img => 
        img.name.toLowerCase().includes(filter.toLowerCase()) ||
        (img.description && img.description.toLowerCase().includes(filter.toLowerCase())) ||
        (img.category && img.category.toLowerCase().includes(filter.toLowerCase())) ||
        (img.tags && img.tags.some(tag => tag.toLowerCase().includes(filter.toLowerCase())))
      )
    : images;

  // Only allow admin users to access this component
  if (user?.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Admin Access Required</h2>
        <p className="text-gray-600">You need admin privileges to manage the gallery.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Image Gallery</h2>
        <button
          onClick={fetchGalleryImages}
          className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </button>
      </div>

      {/* Upload Section */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Upload New Image</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="mb-4">
              <label htmlFor="image-upload" className="block text-sm font-medium text-gray-700 mb-1">
                Select Image
              </label>
              <div className="flex items-center">
                <label 
                  htmlFor="image-upload" 
                  className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Choose File
                </label>
                <input
                  id="image-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="sr-only"
                />
                {selectedFile && (
                  <div className="ml-3 flex items-center">
                    <span className="text-sm text-gray-500">{selectedFile.name}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFile(null);
                        setImagePreview(null);
                      }}
                      className="ml-2 text-gray-400 hover:text-gray-500"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="mb-4">
              <label htmlFor="image-name" className="block text-sm font-medium text-gray-700 mb-1">
                Image Name*
              </label>
              <input
                id="image-name"
                type="text"
                value={imageName}
                onChange={(e) => setImageName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                placeholder="Enter image name"
                required
              />
            </div>

            <div className="mb-4">
              <label htmlFor="image-description" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="image-description"
                value={imageDescription}
                onChange={(e) => setImageDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                placeholder="Enter image description"
                rows={3}
              />
            </div>

            <div className="mb-4">
              <label htmlFor="image-category" className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <input
                id="image-category"
                type="text"
                value={imageCategory}
                onChange={(e) => setImageCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                placeholder="Enter image category"
              />
            </div>

            <div className="mb-4">
              <label htmlFor="image-tags" className="block text-sm font-medium text-gray-700 mb-1">
                Tags (comma separated)
              </label>
              <input
                id="image-tags"
                type="text"
                value={imageTags}
                onChange={(e) => setImageTags(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                placeholder="tag1, tag2, tag3"
              />
            </div>

            <div className="mb-4">
              <div className="flex items-center">
                <input
                  id="image-is-public"
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                />
                <label htmlFor="image-is-public" className="ml-2 block text-sm font-medium text-gray-700">
                  Make this image public (visible to all visitors)
                </label>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Public images will appear in the public gallery page and can be viewed by anyone.
              </p>
            </div>

            <button
              onClick={handleUpload}
              disabled={uploading || !selectedFile}
              className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {uploading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Upload Image
                </>
              )}
            </button>
          </div>

          <div className="flex items-center justify-center">
            {imagePreview ? (
              <div className="relative">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="max-h-64 max-w-full rounded-md object-contain"
                />
                <button
                  onClick={() => {
                    setSelectedFile(null);
                    setImagePreview(null);
                  }}
                  className="absolute top-2 right-2 p-1 bg-white rounded-full shadow-md text-gray-500 hover:text-gray-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 w-full border-2 border-dashed border-gray-300 rounded-md">
                <ImageIcon className="w-12 h-12 text-gray-400" />
                <p className="mt-2 text-sm text-gray-500">No image selected</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Gallery Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Gallery Images</h3>
          <div className="relative">
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search images..."
              className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center min-h-[200px]">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
          </div>
        ) : filteredImages.length === 0 ? (
          <div className="text-center py-12">
            <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No images</h3>
            <p className="mt-1 text-sm text-gray-500">
              {filter ? 'No images match your search criteria.' : 'Get started by uploading an image.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredImages.map((image) => (
              <div key={image.id} className="group relative bg-white border border-gray-200 rounded-md overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <div className="aspect-w-1 aspect-h-1 w-full overflow-hidden bg-gray-200">
                  <img
                    src={image.url}
                    alt={image.name}
                    className="w-full h-48 object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300?text=Image+Not+Found';
                    }}
                  />
                </div>
                <div className="p-4">
                  <h4 className="text-sm font-medium text-gray-900 truncate" title={image.name}>
                    {image.name}
                  </h4>
                  {image.description && (
                    <p className="mt-1 text-xs text-gray-500 line-clamp-2" title={image.description}>
                      {image.description}
                    </p>
                  )}
                  {image.category && (
                    <p className="mt-1 text-xs text-gray-500">
                      <span className="font-medium">Category:</span> {image.category}
                    </p>
                  )}
                  {image.tags && image.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {image.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleDelete(image)}
                    className="p-1 bg-white rounded-full shadow-md text-red-500 hover:text-red-700"
                    title="Delete image"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(image.url);
                      toast.success('Image URL copied to clipboard');
                    }}
                    className="p-1 bg-white rounded-full shadow-md text-gray-500 hover:text-gray-700"
                    title="Copy URL"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleTogglePublic(image)}
                    className="p-1 bg-white rounded-full shadow-md text-gray-500 hover:text-gray-700"
                    title="Toggle public status"
                  >
                    {image.is_public ? (
                      <Globe className="w-4 h-4" />
                    ) : (
                      <Lock className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default GalleryManager;
