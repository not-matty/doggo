-- First, create a function to convert Clerk ID to UUID
CREATE OR REPLACE FUNCTION convert_clerk_id_to_uuid(clerk_id text)
RETURNS uuid
LANGUAGE plpgsql
IMMUTABLE -- This function will always return the same output for the same input
AS $$
DECLARE
    -- Use a fixed namespace UUID (version 5)
    namespace uuid := 'a270e662-b26c-4544-a523-2d1b59b2d380';
BEGIN
    -- Generate a deterministic UUID (version 5) from the clerk_id using the namespace
    RETURN uuid_generate_v5(namespace, clerk_id);
END;
$$;

-- Drop existing function
DROP FUNCTION IF EXISTS requesting_user_id();

-- Create new function that returns UUID instead of text
CREATE OR REPLACE FUNCTION requesting_user_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    clerk_id text;
BEGIN
    -- Get the JWT claim and ensure it exists
    IF current_setting('request.jwt.claims', true)::json IS NULL THEN
        RAISE EXCEPTION 'No JWT claims found';
    END IF;

    -- Extract the sub claim (Clerk user ID)
    clerk_id := (current_setting('request.jwt.claims', true)::json->>'sub')::text;
    
    IF clerk_id IS NULL THEN
        RAISE EXCEPTION 'No sub claim found in JWT';
    END IF;

    -- Convert the Clerk ID to UUID and return
    RETURN convert_clerk_id_to_uuid(clerk_id);
END;
$$;

-- Add comment explaining the function
COMMENT ON FUNCTION requesting_user_id IS 'Returns the UUID generated from Clerk user ID in the JWT sub claim';

-- Update profiles table to use UUID for clerk_id
ALTER TABLE profiles 
    ALTER COLUMN clerk_id TYPE uuid USING convert_clerk_id_to_uuid(clerk_id);

-- Update profiles RLS policies
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON profiles;

-- Create new RLS policies using UUID comparison
CREATE POLICY "profiles_select_policy" 
    ON profiles FOR SELECT 
    USING (true);

CREATE POLICY "profiles_insert_policy" 
    ON profiles FOR INSERT 
    WITH CHECK (clerk_id = requesting_user_id());

CREATE POLICY "profiles_update_policy" 
    ON profiles FOR UPDATE 
    USING (clerk_id = requesting_user_id());

CREATE POLICY "profiles_delete_policy" 
    ON profiles FOR DELETE 
    USING (clerk_id = requesting_user_id());

-- Add a unique constraint on clerk_id if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'profiles_clerk_id_key'
    ) THEN
        ALTER TABLE profiles ADD CONSTRAINT profiles_clerk_id_key UNIQUE (clerk_id);
    END IF;
END $$; 