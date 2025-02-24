-- Create the requesting_user_id function
CREATE OR REPLACE FUNCTION requesting_user_id()
RETURNS TEXT AS $$
BEGIN
    -- Get the JWT claims and ensure they exist
    IF current_setting('request.jwt.claims', true)::json IS NULL THEN
        RETURN NULL;
    END IF;

    -- First try user_id claim
    DECLARE
        user_id text := current_setting('request.jwt.claims', true)::json->>'user_id';
    BEGIN
        IF user_id IS NOT NULL THEN
            RETURN user_id;
        END IF;
        
        -- Fallback to sub claim if user_id is not present
        RETURN current_setting('request.jwt.claims', true)::json->>'sub';
    END;
END;
$$ LANGUAGE plpgsql STABLE;

-- Update profiles table to use requesting_user_id function
ALTER TABLE profiles
    ALTER COLUMN clerk_id DROP DEFAULT;

-- Drop existing RLS policies
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON profiles;

-- Create new RLS policies using requesting_user_id function
CREATE POLICY "profiles_select_policy" 
    ON profiles FOR SELECT 
    USING (true);

-- Allow any authenticated user to create a profile
CREATE POLICY "profiles_insert_policy" 
    ON profiles FOR INSERT 
    WITH CHECK (true);

-- Only allow users to update their own profile
CREATE POLICY "profiles_update_policy" 
    ON profiles FOR UPDATE 
    USING (clerk_id = requesting_user_id())
    WITH CHECK (clerk_id = requesting_user_id());

-- Only allow users to delete their own profile
CREATE POLICY "profiles_delete_policy" 
    ON profiles FOR DELETE 
    USING (clerk_id = requesting_user_id());

-- Create a function to safely create or update a profile
CREATE OR REPLACE FUNCTION safely_create_profile(
    _clerk_id TEXT,
    _name TEXT,
    _username TEXT,
    _phone TEXT
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    _profile_id uuid;
BEGIN
    -- Check if profile already exists
    SELECT id INTO _profile_id
    FROM profiles
    WHERE clerk_id = _clerk_id;
    
    IF _profile_id IS NULL THEN
        -- Create new profile
        INSERT INTO profiles (clerk_id, name, username, phone)
        VALUES (_clerk_id, _name, _username, _phone)
        RETURNING id INTO _profile_id;
    ELSE
        -- Update existing profile
        UPDATE profiles
        SET name = _name,
            username = _username,
            phone = _phone,
            updated_at = now()
        WHERE id = _profile_id;
    END IF;
    
    RETURN _profile_id;
END;
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION safely_create_profile TO authenticated;
GRANT EXECUTE ON FUNCTION safely_create_profile TO anon;

-- Update other table policies to use requesting_user_id function
DO $$ 
BEGIN
    -- Update photos policies
    DROP POLICY IF EXISTS "Users can view their own photos and photos of their contacts" ON photos;
    DROP POLICY IF EXISTS "Users can manage their own photos" ON photos;

    CREATE POLICY "Users can view their own photos and photos of their contacts" ON photos
        FOR SELECT USING (
            EXISTS (
                SELECT 1 FROM profiles p
                WHERE p.clerk_id = requesting_user_id()
                AND (
                    p.id = photos.user_id OR
                    EXISTS (
                        SELECT 1 FROM contacts c
                        WHERE c.user_id = p.id
                        AND c.contact_user_id = photos.user_id
                    )
                )
            )
        );

    CREATE POLICY "Users can manage their own photos" ON photos
        FOR ALL USING (
            EXISTS (
                SELECT 1 FROM profiles p
                WHERE p.clerk_id = requesting_user_id()
                AND p.id = photos.user_id
            )
        );
END $$; 