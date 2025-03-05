-- Create storage policies for posts bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('posts', 'posts', true)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;

-- Enable public access to posts bucket
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'posts' );

-- Allow authenticated uploads to posts bucket
CREATE POLICY "Authenticated users can upload posts"
ON storage.objects FOR INSERT
WITH CHECK ( 
  bucket_id = 'posts' 
  AND auth.role() = 'authenticated'
);

-- Allow users to delete their own posts
CREATE POLICY "Users can delete own posts"
ON storage.objects FOR DELETE
USING ( 
  bucket_id = 'posts' 
  AND (storage.foldername(name))[1] = auth.uid()::text
); 