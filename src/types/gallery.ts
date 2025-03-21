export interface GalleryImage {
  id: string;
  name: string;
  description?: string;
  url: string;
  storage_path: string;
  category?: string;
  tags?: string[];
  created_at: string;
  updated_at?: string;
  user_id?: string;
  is_public?: boolean;
}

export interface GalleryImageCreateRequest {
  name: string;
  description?: string;
  url: string;
  storage_path: string;
  category?: string;
  tags?: string[];
  is_public?: boolean;
}

export interface GalleryUploadResponse {
  path: string;
  url: string;
}
