-- First, disable RLS temporarily for initial profile creation
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Create a function to handle secure profile creation
CREATE OR REPLACE FUNCTION create_new_profile(
    _clerk_id TEXT,
    _name TEXT,
    _username TEXT,
    _phone TEXT
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER -- This means the function runs with the privileges of the creator
AS $$
DECLARE
    _profile_id uuid;
BEGIN
    -- Insert the new profile
    INSERT INTO profiles (clerk_id, name, username, phone)
    VALUES (_clerk_id, _name, _username, _phone)
    RETURNING id INTO _profile_id;

    RETURN _profile_id;
END;
$$;

-- Re-enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing profiles policies
DROP POLICY IF EXISTS "Select profiles policy" ON profiles;
DROP POLICY IF EXISTS "Insert profiles policy" ON profiles;
DROP POLICY IF EXISTS "Update profiles policy" ON profiles;
DROP POLICY IF EXISTS "Delete profiles policy" ON profiles;

-- Create new policies for authenticated operations
CREATE POLICY "Select profiles policy" ON profiles AS PERMISSIVE
    FOR SELECT TO authenticated
    USING (true);

-- No INSERT policy needed as profiles are created through the create_new_profile function

CREATE POLICY "Update profiles policy" ON profiles AS PERMISSIVE
    FOR UPDATE TO authenticated
    USING (clerk_id = requesting_user_id())
    WITH CHECK (clerk_id = requesting_user_id());

CREATE POLICY "Delete profiles policy" ON profiles AS PERMISSIVE
    FOR DELETE TO authenticated
    USING (clerk_id = requesting_user_id());

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION create_new_profile TO authenticated;
GRANT EXECUTE ON FUNCTION create_new_profile TO anon; 