-- Function to fetch posts from a user's contact network
CREATE OR REPLACE FUNCTION get_contact_network_posts(limit_count INTEGER DEFAULT 20)
RETURNS TABLE (
  id UUID,
  url TEXT,
  caption TEXT,
  created_at TIMESTAMPTZ,
  user_id UUID,
  user JSONB
) AS $$
DECLARE
  current_user_id UUID := auth.uid();
BEGIN
  RETURN QUERY
  WITH user_network AS (
    -- Get IDs of users in the current user's network (direct contacts and 2nd degree)
    SELECT contact_user_id FROM contacts 
    WHERE user_id = current_user_id AND contact_user_id IS NOT NULL
    
    UNION
    
    SELECT c2.contact_user_id FROM contacts c1
    JOIN contacts c2 ON c1.contact_user_id = c2.user_id
    WHERE c1.user_id = current_user_id 
      AND c1.contact_user_id IS NOT NULL 
      AND c2.contact_user_id IS NOT NULL
      AND c2.contact_user_id != current_user_id
  )
  SELECT 
    p.id,
    p.url,
    p.caption,
    p.created_at,
    p.user_id,
    jsonb_build_object(
      'id', u.id,
      'name', u.name,
      'username', u.username,
      'profile_picture_url', u.profile_picture_url,
      'clerk_id', u.clerk_id
    ) as user
  FROM photos p
  JOIN profiles u ON p.user_id = u.id
  WHERE 
    -- Include posts from the user's network
    (p.user_id IN (SELECT contact_user_id FROM user_network)
    -- Also include the user's own posts
    OR p.user_id = current_user_id)
  ORDER BY p.created_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 