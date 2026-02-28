-- =====================================================
-- MIGRATION: Add photo_url column + Supabase Storage bucket
-- Run in Supabase SQL Editor
-- =====================================================

-- 1. Add photo_url column to people table
ALTER TABLE people ADD COLUMN IF NOT EXISTS photo_url TEXT DEFAULT NULL;

-- 2. Create the 'photos' storage bucket (public, so images can be served directly)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'photos',
  'photos',
  true,
  5242880,  -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- 3. Storage RLS policies — allow public read, authenticated upload/delete
-- Public read (anyone can view photos)
CREATE POLICY "photos_public_read" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'photos');

-- Anyone can upload (for now — tighten later if needed)
CREATE POLICY "photos_public_insert" ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'photos');

-- Anyone can update (upsert)
CREATE POLICY "photos_public_update" ON storage.objects
  FOR UPDATE
  USING (bucket_id = 'photos')
  WITH CHECK (bucket_id = 'photos');

-- Anyone can delete
CREATE POLICY "photos_public_delete" ON storage.objects
  FOR DELETE
  USING (bucket_id = 'photos');

-- 4. Re-run the updated SQL functions:
--    - sql/functions/add_person_to_tree.sql
--    - sql/functions/update_person_in_tree.sql
--    - sql/functions/get_complete_tree_by_id.sql
