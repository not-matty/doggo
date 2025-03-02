-- Create a function to search through a user's contacts and profiles
CREATE OR REPLACE FUNCTION search_contacts_and_profiles(
  search_term TEXT,
  current_user_id UUID
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  username TEXT,
  profile_picture_url TEXT,
  phone_number TEXT,
  is_registered BOOLEAN,
  is_contact BOOLEAN,
  connection_type TEXT
) AS $$
BEGIN
  -- First, search through the user's contacts
  RETURN QUERY
  -- Direct contacts who are registered (joined the app)
  SELECT
    p.id,
    p.name,
    p.username,
    p.profile_picture_url,
    c.phone_number,
    TRUE AS is_registered,
    TRUE AS is_contact,
    'direct'::TEXT AS connection_type
  FROM contacts c
  JOIN profiles p ON c.contact_user_id = p.id
  WHERE c.owner_id = current_user_id
    AND (
      p.name ILIKE '%' || search_term || '%'
      OR p.username ILIKE '%' || search_term || '%'
      OR c.phone_number ILIKE '%' || search_term || '%'
    )
  
  UNION ALL
  
  -- Unregistered contacts (not on the app)
  SELECT
    c.id,
    'Contact: ' || c.phone_number AS name,
    NULL AS username,
    NULL AS profile_picture_url,
    c.phone_number,
    FALSE AS is_registered,
    TRUE AS is_contact,
    'unregistered'::TEXT AS connection_type
  FROM contacts c
  WHERE c.owner_id = current_user_id
    AND c.contact_user_id IS NULL
    AND c.phone_number ILIKE '%' || search_term || '%'
  
  UNION ALL
  
  -- Second-degree connections (contacts of contacts)
  SELECT 
    p.id,
    p.name,
    p.username,
    p.profile_picture_url,
    NULL AS phone_number,
    TRUE AS is_registered,
    FALSE AS is_contact,
    'second_degree'::TEXT AS connection_type
  FROM profiles p
  JOIN contacts c2 ON c2.contact_user_id = p.id
  JOIN contacts c1 ON c1.contact_user_id = c2.owner_id
  WHERE 
    c1.owner_id = current_user_id
    AND p.id != current_user_id
    AND p.id NOT IN (
      SELECT contact_user_id 
      FROM contacts 
      WHERE owner_id = current_user_id 
        AND contact_user_id IS NOT NULL
    )
    AND (
      p.name ILIKE '%' || search_term || '%'
      OR p.username ILIKE '%' || search_term || '%'
    )
  
  UNION ALL
  
  -- Other network users (for discovery)
  SELECT
    p.id,
    p.name,
    p.username,
    p.profile_picture_url,
    NULL AS phone_number,
    TRUE AS is_registered,
    FALSE AS is_contact,
    'network'::TEXT AS connection_type
  FROM profiles p
  WHERE p.id != current_user_id
    AND p.id NOT IN (
      SELECT contact_user_id 
      FROM contacts 
      WHERE owner_id = current_user_id 
        AND contact_user_id IS NOT NULL
    )
    -- Not in second-degree connections
    AND p.id NOT IN (
      SELECT p2.id
      FROM profiles p2
      JOIN contacts c2 ON c2.contact_user_id = p2.id
      JOIN contacts c1 ON c1.contact_user_id = c2.owner_id
      WHERE c1.owner_id = current_user_id
    )
    AND (
      p.name ILIKE '%' || search_term || '%'
      OR p.username ILIKE '%' || search_term || '%'
    )
  LIMIT 20;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 