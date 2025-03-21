-- Create a storage bucket for gallery images
INSERT INTO storage.buckets (id, name, public, avif_autodetection)
VALUES ('gallery', 'gallery', true, false)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policy to allow authenticated users to view images
CREATE POLICY "Public Access Gallery Images"
ON storage.objects FOR SELECT
USING (bucket_id = 'gallery');

-- Set up storage policy to allow only admins to insert images
CREATE POLICY "Admin Insert Gallery Images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'gallery' AND
  (auth.role() = 'authenticated' AND EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid() AND raw_user_meta_data->>'role' = 'admin'
  ))
);

-- Set up storage policy to allow only admins to update images
CREATE POLICY "Admin Update Gallery Images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'gallery' AND
  (auth.role() = 'authenticated' AND EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid() AND raw_user_meta_data->>'role' = 'admin'
  ))
);

-- Set up storage policy to allow only admins to delete images
CREATE POLICY "Admin Delete Gallery Images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'gallery' AND
  (auth.role() = 'authenticated' AND EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid() AND raw_user_meta_data->>'role' = 'admin'
  ))
);

-- Create a gallery table to track uploaded images
CREATE TABLE IF NOT EXISTS gallery (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  url TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  category TEXT,
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Add RLS policies for gallery table
ALTER TABLE gallery ENABLE ROW LEVEL SECURITY;

-- Anyone can view gallery images
CREATE POLICY "Public View Gallery Images"
ON gallery FOR SELECT
USING (true);

-- Only admins can insert gallery images
CREATE POLICY "Admin Insert Gallery Images"
ON gallery FOR INSERT
WITH CHECK (
  (auth.role() = 'authenticated' AND EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid() AND raw_user_meta_data->>'role' = 'admin'
  ))
);

-- Only admins can update gallery images
CREATE POLICY "Admin Update Gallery Images"
ON gallery FOR UPDATE
USING (
  (auth.role() = 'authenticated' AND EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid() AND raw_user_meta_data->>'role' = 'admin'
  ))
);

-- Only admins can delete gallery images
CREATE POLICY "Admin Delete Gallery Images"
ON gallery FOR DELETE
USING (
  (auth.role() = 'authenticated' AND EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid() AND raw_user_meta_data->>'role' = 'admin'
  ))
);

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to update the updated_at timestamp
CREATE TRIGGER update_gallery_updated_at
BEFORE UPDATE ON gallery
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
