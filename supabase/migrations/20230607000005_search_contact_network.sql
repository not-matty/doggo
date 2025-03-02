-- Create or replace the RPC function to search through a user's contact network
CREATE OR REPLACE FUNCTION search_contact_network(
  search_user_id UUID,
  search_query TEXT
) 
RETURNS TABLE (
  id UUID,
  name TEXT,
  username TEXT,
  profile_picture_url TEXT,
  bio TEXT,
  phone TEXT,
  clerk_id TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  is_direct_contact BOOLEAN,
  is_second_degree BOOLEAN
) 
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY 
  -- First get direct contacts who match the search query
  SELECT 
    p.id,
    p.name,
    p.username,
    p.profile_picture_url,
    p.bio,
    p.phone,
    p.clerk_id,
    p.created_at,
    p.updated_at,
    TRUE as is_direct_contact,  -- Direct contact flag
    FALSE as is_second_degree   -- Not a second-degree contact
  FROM profiles p
  JOIN contacts c ON c.contact_user_id = p.id
  WHERE 
    c.user_id = search_user_id
    AND (
      p.name ILIKE '%' || search_query || '%' 
      OR p.username ILIKE '%' || search_query || '%'
    )
  
  UNION
  
  -- Then get contacts of contacts (second-degree connections)
  SELECT 
    p.id,
    p.name,
    p.username,
    p.profile_picture_url,
    p.bio,
    p.phone,
    p.clerk_id,
    p.created_at,
    p.updated_at,
    FALSE as is_direct_contact,  -- Not a direct contact
    TRUE as is_second_degree     -- Second-degree contact flag
  FROM profiles p
  JOIN contacts c2 ON c2.contact_user_id = p.id
  JOIN contacts c1 ON c1.contact_user_id = c2.user_id
  WHERE 
    c1.user_id = search_user_id
    AND c2.user_id != search_user_id
    AND p.id != search_user_id
    AND (
      p.name ILIKE '%' || search_query || '%' 
      OR p.username ILIKE '%' || search_query || '%'
    )
    -- Exclude direct contacts (already included in first query)
    AND NOT EXISTS (
      SELECT 1 FROM contacts c_direct 
      WHERE c_direct.user_id = search_user_id 
      AND c_direct.contact_user_id = p.id
    )
  
  ORDER BY 
    is_direct_contact DESC,  -- Direct contacts first
    name ASC,
    username ASC;
END;
$$; 