-- Create a function to fetch posts from user's network (contacts and their contacts)
CREATE OR REPLACE FUNCTION get_contact_network_posts(
  current_user_id UUID,
  limit_count INTEGER DEFAULT 20
)
RETURNS SETOF photos AS $$
BEGIN
  RETURN QUERY
  -- Get posts from contacts
  SELECT DISTINCT p.*
  FROM photos p
  JOIN profiles profile ON p.user_id = profile.id
  WHERE 
    -- Posts from user's direct contacts
    p.user_id IN (
      SELECT contact_user_id 
      FROM contacts 
      WHERE owner_id = current_user_id AND contact_user_id IS NOT NULL
    )
    -- Or public posts from the network
    OR p.is_public = TRUE
  ORDER BY p.created_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update photos table to add is_public flag if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'photos' AND column_name = 'is_public'
  ) THEN
    ALTER TABLE photos ADD COLUMN is_public BOOLEAN DEFAULT TRUE;
  END IF;
END $$; 