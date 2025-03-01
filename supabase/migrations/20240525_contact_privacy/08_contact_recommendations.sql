-- Function to generate contact-based recommendations
-- This provides personalized recommendations for people the user may know
CREATE OR REPLACE FUNCTION get_contact_recommendations(limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
  id UUID,
  name TEXT,
  username TEXT,
  profile_picture_url TEXT,
  clerk_id TEXT,
  connection_type TEXT,
  mutual_contacts INTEGER
) AS $$
DECLARE
  current_user_id UUID := auth.uid();
BEGIN
  RETURN QUERY
  -- Start with contacts of contacts (2nd degree)
  WITH second_degree AS (
    SELECT 
      c2.contact_user_id as user_id,
      c1.contact_user_id as through_contact_id,
      'second_degree' as connection_type
    FROM contacts c1
    JOIN contacts c2 ON c1.contact_user_id = c2.user_id
    WHERE c1.user_id = current_user_id 
      AND c1.contact_user_id IS NOT NULL 
      AND c2.contact_user_id IS NOT NULL
      -- Exclude direct contacts
      AND NOT EXISTS (
        SELECT 1 FROM contacts 
        WHERE user_id = current_user_id 
        AND contact_user_id = c2.contact_user_id
      )
      -- Exclude the user themselves
      AND c2.contact_user_id != current_user_id
  ),
  -- Count how many mutual contacts each recommended user has
  mutual_counts AS (
    SELECT 
      user_id,
      COUNT(DISTINCT through_contact_id) as mutual_count
    FROM second_degree
    GROUP BY user_id
  )
  -- Get the user details with mutual counts
  SELECT 
    p.id,
    p.name,
    p.username,
    p.profile_picture_url,
    p.clerk_id,
    'second_degree' as connection_type,
    mc.mutual_count as mutual_contacts
  FROM mutual_counts mc
  JOIN profiles p ON mc.user_id = p.id
  ORDER BY mc.mutual_count DESC, p.created_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 