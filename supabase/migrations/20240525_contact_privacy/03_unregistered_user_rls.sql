-- Update RLS policies for unregistered contacts and likes tables
-- to work with the new phone-based identification system

-- Enable Row Level Security for unregistered tables
ALTER TABLE unregistered_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE unregistered_likes ENABLE ROW LEVEL SECURITY;

-- Drop previous policies if they exist
DROP POLICY IF EXISTS "unregistered_contacts_owner_only" ON unregistered_contacts;
DROP POLICY IF EXISTS "unregistered_likes_owner_only" ON unregistered_likes;

-- Create a policy for unregistered_likes table - users can only see/manage likes involving their phone
CREATE POLICY "unregistered_likes_view_policy" ON unregistered_likes FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND (p.phone = liker_phone OR p.phone = liked_phone)
  )
);

-- Users can insert unregistered likes for themselves
CREATE POLICY "unregistered_likes_insert_policy" ON unregistered_likes FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.phone = liker_phone
  )
);

-- Create a policy for unregistered_contacts - any authenticated user can see unregistered contacts
-- that they've interacted with through unregistered_likes
CREATE POLICY "unregistered_contacts_view_policy" ON unregistered_contacts FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    JOIN unregistered_likes ul ON (ul.liker_phone = p.phone OR ul.liked_phone = p.phone)
    WHERE p.id = auth.uid()
      AND (ul.liked_phone = unregistered_contacts.phone OR ul.liker_phone = unregistered_contacts.phone)
  )
);

-- Allow inserting unregistered contacts when sending likes
CREATE POLICY "unregistered_contacts_insert_policy" ON unregistered_contacts FOR INSERT
WITH CHECK (true);

-- Create index for searching unregistered contacts by phone
CREATE INDEX IF NOT EXISTS idx_unregistered_contacts_phone ON unregistered_contacts (phone);
CREATE INDEX IF NOT EXISTS idx_unregistered_likes_liker_phone ON unregistered_likes (liker_phone);
CREATE INDEX IF NOT EXISTS idx_unregistered_likes_liked_phone ON unregistered_likes (liked_phone); 