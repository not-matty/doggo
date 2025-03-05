-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS public.search_contacts_and_profiles(TEXT, UUID);

-- Create or replace the search function to handle both registered and unregistered contacts
CREATE OR REPLACE FUNCTION public.search_contacts_and_profiles(
  search_term TEXT,
  requesting_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  username TEXT,
  phone TEXT,
  avatar_url TEXT,
  is_contact BOOLEAN,
  is_registered BOOLEAN,
  connection_type TEXT
) AS $$
DECLARE
  user_id UUID;
BEGIN
  -- Get the actual UUID if requesting_user_id is provided, otherwise use the authenticated user
  IF requesting_user_id IS NULL THEN
    user_id := auth.uid();
  ELSE
    user_id := requesting_user_id;
  END IF;

  -- Return empty if no user_id available
  IF user_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  -- First query: Direct contacts (both registered and unregistered)
  SELECT 
    COALESCE(p.id, c.id) AS id,
    COALESCE(p.name, c.name) AS name,
    p.username,
    COALESCE(p.phone, c.phone_number) AS phone,
    p.avatar_url,
    TRUE AS is_contact,
    (p.id IS NOT NULL) AS is_registered,
    'direct' AS connection_type
  FROM contacts c
  LEFT JOIN profiles p ON c.contact_user_id = p.id
  WHERE c.owner_id = user_id
    AND (
      c.name ILIKE '%' || search_term || '%'
      OR c.phone_number ILIKE '%' || search_term || '%'
      OR p.username ILIKE '%' || search_term || '%'
      OR p.name ILIKE '%' || search_term || '%'
    )

  UNION ALL

  -- Second query: Profiles that aren't direct contacts but match the search
  SELECT 
    p.id,
    p.name,
    p.username,
    p.phone,
    p.avatar_url,
    FALSE AS is_contact,
    TRUE AS is_registered,
    'none' AS connection_type
  FROM profiles p
  LEFT JOIN contacts c ON c.contact_user_id = p.id AND c.owner_id = user_id
  WHERE c.id IS NULL  -- Only include profiles that aren't already direct contacts
    AND p.id != user_id  -- Don't include the requesting user
    AND (
      p.username ILIKE '%' || search_term || '%'
      OR p.name ILIKE '%' || search_term || '%'
      OR p.phone ILIKE '%' || search_term || '%'
    )
    AND p.is_public = true  -- Only show public profiles to non-contacts

  ORDER BY 
    is_contact DESC,  -- Show contacts first
    is_registered DESC,  -- Then registered users
    name ASC  -- Then alphabetically by name
  LIMIT 50;  -- Limit results to prevent large result sets
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create security policy for the search function
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polname = 'search_function_policy'
  ) THEN
    CREATE POLICY search_function_policy ON public.profiles
      FOR SELECT
      USING (true);  -- Allow anyone to search profiles
  END IF;
END $$;

-- Update profile table to include is_public flag if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'is_public'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN is_public BOOLEAN DEFAULT true;
  END IF;
END $$;

-- Grant usage permissions
GRANT EXECUTE ON FUNCTION public.search_contacts_and_profiles TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_contacts_and_profiles TO service_role;
