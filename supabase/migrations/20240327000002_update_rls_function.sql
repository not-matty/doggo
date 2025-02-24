-- First drop all dependent policies
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON profiles;

-- Now we can safely drop the function
DROP FUNCTION IF EXISTS requesting_user_id();

-- Create the requesting_user_id function that returns the sub claim
CREATE OR REPLACE FUNCTION requesting_user_id()
RETURNS TEXT AS $$
BEGIN
    -- Get the JWT claim and ensure it exists
    IF current_setting('request.jwt.claims', true)::json IS NULL THEN
        RAISE EXCEPTION 'No JWT claims found';
    END IF;

    -- Extract the sub claim (Clerk user ID)
    RETURN (current_setting('request.jwt.claims', true)::json->>'sub')::text;
END;
$$ LANGUAGE plpgsql STABLE;

-- Add a comment explaining the function
COMMENT ON FUNCTION requesting_user_id IS 'Returns the Clerk user ID from the JWT sub claim';

-- Update likes table columns to UUID and add foreign key constraints
ALTER TABLE likes
    DROP CONSTRAINT IF EXISTS likes_liker_id_fkey,
    DROP CONSTRAINT IF EXISTS likes_liked_id_fkey,
    ALTER COLUMN liker_id TYPE UUID USING liker_id::UUID,
    ALTER COLUMN liked_id TYPE UUID USING liked_id::UUID,
    ADD CONSTRAINT likes_liker_id_fkey
        FOREIGN KEY (liker_id)
        REFERENCES profiles(id)
        ON DELETE CASCADE,
    ADD CONSTRAINT likes_liked_id_fkey
        FOREIGN KEY (liked_id)
        REFERENCES profiles(id)
        ON DELETE CASCADE;

-- Create new RLS policies using requesting_user_id()
CREATE POLICY "profiles_select_policy" 
    ON profiles FOR SELECT 
    USING (true);

CREATE POLICY "profiles_insert_policy" 
    ON profiles FOR INSERT 
    WITH CHECK (clerk_id = requesting_user_id());

CREATE POLICY "profiles_update_policy" 
    ON profiles FOR UPDATE 
    USING (clerk_id = requesting_user_id())
    WITH CHECK (clerk_id = requesting_user_id());

CREATE POLICY "profiles_delete_policy" 
    ON profiles FOR DELETE 
    USING (clerk_id = requesting_user_id());