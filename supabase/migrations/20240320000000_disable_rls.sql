-- Disable RLS on photos table
ALTER TABLE photos DISABLE ROW LEVEL SECURITY;

-- Note: In production, you should instead create proper RLS policies like:
-- CREATE POLICY "Users can insert their own photos"
-- ON photos FOR INSERT 
-- WITH CHECK (auth.uid() = user_id); 