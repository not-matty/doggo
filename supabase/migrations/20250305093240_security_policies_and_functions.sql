-- Functions for retrieving the requesting user's ID and mapping clerk_id to UUID
CREATE OR REPLACE FUNCTION get_auth_user_id() RETURNS UUID AS $$
BEGIN
  RETURN auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to safely create profiles (without duplicates)
CREATE OR REPLACE FUNCTION safe_create_profile(
  user_phone TEXT,
  user_name TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  new_profile_id UUID;
BEGIN
  -- Check if profile exists with this phone
  SELECT id INTO new_profile_id
  FROM profiles
  WHERE phone = user_phone
  LIMIT 1;
  
  -- If profile exists, return its ID
  IF new_profile_id IS NOT NULL THEN
    RETURN new_profile_id;
  END IF;
  
  -- If not, create new profile
  INSERT INTO profiles (
    phone,
    name,
    username,
    created_at,
    updated_at
  ) VALUES (
    user_phone,
    COALESCE(user_name, 'New User'),
    'user' || floor(random() * 1000000)::text,
    now(),
    now()
  )
  RETURNING id INTO new_profile_id;
  
  RETURN new_profile_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get posts from user's contact network
CREATE OR REPLACE FUNCTION get_contact_network_posts(
  current_user_id UUID,
  limit_count INTEGER DEFAULT 20
) RETURNS SETOF photos AS $$
BEGIN
  -- Return posts from direct contacts and the user's own posts
  RETURN QUERY
  SELECT p.*
  FROM photos p
  JOIN contacts c ON p.user_id = c.contact_user_id
  WHERE c.owner_id = current_user_id
    AND c.contact_user_id IS NOT NULL
  
  UNION
  
  -- User's own posts
  SELECT p.*
  FROM photos p
  WHERE p.user_id = current_user_id
  
  ORDER BY created_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to match contacts with profiles
CREATE OR REPLACE FUNCTION match_contacts_with_profiles(
  user_id UUID
) RETURNS INTEGER AS $$
DECLARE
  matched_count INTEGER := 0;
BEGIN
  -- Match contacts with existing profiles based on phone number
  WITH updates AS (
    UPDATE contacts c
    SET 
      contact_user_id = p.id,
      updated_at = now()
    FROM profiles p
    WHERE 
      c.owner_id = user_id AND
      c.phone_number = p.phone AND
      c.contact_user_id IS NULL
    RETURNING c.id
  )
  SELECT COUNT(*) INTO matched_count FROM updates;
  
  RETURN matched_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Security policies for various tables
-- Profiles table policies
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polname = 'allow_read_all_profiles'
  ) THEN
    CREATE POLICY allow_read_all_profiles ON profiles
      FOR SELECT
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polname = 'allow_create_own_profile'
  ) THEN
    CREATE POLICY allow_create_own_profile ON profiles
      FOR INSERT
      WITH CHECK (id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polname = 'allow_update_own_profile'
  ) THEN
    CREATE POLICY allow_update_own_profile ON profiles
      FOR UPDATE
      USING (id = auth.uid());
  END IF;
END $$;

-- Contacts table policies
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polname = 'allow_read_own_contacts'
  ) THEN
    CREATE POLICY allow_read_own_contacts ON contacts
      FOR SELECT
      USING (owner_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polname = 'allow_insert_own_contacts'
  ) THEN
    CREATE POLICY allow_insert_own_contacts ON contacts
      FOR INSERT
      WITH CHECK (owner_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polname = 'allow_update_own_contacts'
  ) THEN
    CREATE POLICY allow_update_own_contacts ON contacts
      FOR UPDATE
      USING (owner_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polname = 'allow_delete_own_contacts'
  ) THEN
    CREATE POLICY allow_delete_own_contacts ON contacts
      FOR DELETE
      USING (owner_id = auth.uid());
  END IF;
END $$;

-- Photos table policies
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polname = 'allow_select_photos'
  ) THEN
    CREATE POLICY allow_select_photos ON photos
      FOR SELECT
      USING (true); -- Everyone can view photos
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polname = 'allow_insert_own_photos'
  ) THEN
    CREATE POLICY allow_insert_own_photos ON photos
      FOR INSERT
      WITH CHECK (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polname = 'allow_update_own_photos'
  ) THEN
    CREATE POLICY allow_update_own_photos ON photos
      FOR UPDATE
      USING (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polname = 'allow_delete_own_photos'
  ) THEN
    CREATE POLICY allow_delete_own_photos ON photos
      FOR DELETE
      USING (user_id = auth.uid());
  END IF;
END $$;

-- Likes table policies
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polname = 'allow_read_all_likes'
  ) THEN
    CREATE POLICY allow_read_all_likes ON likes
      FOR SELECT
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polname = 'allow_insert_own_likes'
  ) THEN
    CREATE POLICY allow_insert_own_likes ON likes
      FOR INSERT
      WITH CHECK (liker_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polname = 'allow_delete_own_likes'
  ) THEN
    CREATE POLICY allow_delete_own_likes ON likes
      FOR DELETE
      USING (liker_id = auth.uid());
  END IF;
END $$;

-- Trigger to update contacts when profiles are created or updated
CREATE OR REPLACE FUNCTION update_contacts_on_profile_change()
RETURNS TRIGGER AS $$
BEGIN
  -- When a profile is created or phone number is updated, update any matching contacts
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.phone != NEW.phone) THEN
    -- Update contacts that match this phone number to link to this profile
    UPDATE contacts
    SET 
      contact_user_id = NEW.id,
      updated_at = now()
    WHERE 
      phone_number = NEW.phone AND
      contact_user_id IS NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_update_contacts_on_profile_change'
  ) THEN
    CREATE TRIGGER trigger_update_contacts_on_profile_change
    AFTER INSERT OR UPDATE OF phone ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_contacts_on_profile_change();
  END IF;
END $$;

-- Grant permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_auth_user_id() TO authenticated;
GRANT EXECUTE ON FUNCTION safe_create_profile(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_contact_network_posts(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION match_contacts_with_profiles(UUID) TO authenticated;
