-- Create a view that combines registered and unregistered contacts
-- for efficient searching within a user's network
CREATE OR REPLACE VIEW contact_network AS 
WITH direct_contacts AS (
  -- User's direct contacts who are on the app
  SELECT 
    auth.uid() as user_id,
    c.contact_user_id as profile_id,
    p.username,
    p.name,
    p.profile_picture_url,
    p.clerk_id,
    'direct' as connection_type,
    c.id as contact_id,
    c.phone
  FROM contacts c
  JOIN profiles p ON c.contact_user_id = p.id
  WHERE c.user_id = auth.uid() AND c.contact_user_id IS NOT NULL
),
second_degree AS (
  -- Contacts of contacts (2nd degree)
  SELECT 
    auth.uid() as user_id,
    c2.contact_user_id as profile_id,
    p.username,
    p.name,
    p.profile_picture_url,
    p.clerk_id,
    'second_degree' as connection_type,
    c2.id as contact_id,
    c2.phone
  FROM contacts c1
  JOIN contacts c2 ON c1.contact_user_id = c2.user_id
  JOIN profiles p ON c2.contact_user_id = p.id
  WHERE c1.user_id = auth.uid() 
    AND c1.contact_user_id IS NOT NULL 
    AND c2.contact_user_id IS NOT NULL
    -- Exclude direct contacts to avoid duplicates
    AND c2.contact_user_id NOT IN (
      SELECT contact_user_id FROM contacts 
      WHERE user_id = auth.uid() AND contact_user_id IS NOT NULL
    )
    -- Exclude the user themselves
    AND c2.contact_user_id != auth.uid()
),
unregistered AS (
  -- User's contacts who are not on the app yet
  SELECT 
    auth.uid() as user_id,
    NULL as profile_id,
    'Not on doggo yet' as username,
    c.name,
    NULL as profile_picture_url,
    NULL as clerk_id,
    'unregistered' as connection_type,
    c.id as contact_id,
    c.phone
  FROM contacts c
  WHERE c.user_id = auth.uid() AND c.contact_user_id IS NULL
),
external_unregistered AS (
  -- Unregistered contacts that have received likes or interactions
  SELECT 
    auth.uid() as user_id,
    NULL as profile_id,
    'Not on doggo yet' as username,
    uc.name,
    NULL as profile_picture_url,
    NULL as clerk_id,
    'external_unregistered' as connection_type,
    uc.id as contact_id,
    uc.phone
  FROM unregistered_contacts uc
  JOIN profiles p ON p.id = auth.uid()
  -- Only show unregistered contacts the current user has interacted with
  WHERE EXISTS (
    SELECT 1 FROM unregistered_likes ul
    WHERE (ul.liker_phone = p.phone AND ul.liked_phone = uc.phone)
    OR (ul.liked_phone = p.phone AND ul.liker_phone = uc.phone)
  )
  -- Avoid duplicates with existing contacts
  AND NOT EXISTS (
    SELECT 1 FROM contacts c
    WHERE c.user_id = auth.uid() AND c.phone = uc.phone
  )
)
SELECT * FROM direct_contacts
UNION ALL
SELECT * FROM second_degree
UNION ALL
SELECT * FROM unregistered
UNION ALL
SELECT * FROM external_unregistered;

-- Create an efficient function to search a user's contact network
CREATE OR REPLACE FUNCTION search_contact_network(search_term TEXT)
RETURNS TABLE (
  user_id UUID,
  profile_id UUID,
  username TEXT,
  name TEXT,
  profile_picture_url TEXT,
  clerk_id TEXT,
  connection_type TEXT,
  contact_id UUID,
  phone TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM contact_network
  WHERE 
    username ILIKE '%' || search_term || '%'
    OR name ILIKE '%' || search_term || '%'
    OR phone ILIKE '%' || search_term || '%';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 