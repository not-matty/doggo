-- Drop existing function
DROP FUNCTION IF EXISTS requesting_user_id();

-- Create new function using phone claim
CREATE OR REPLACE FUNCTION requesting_user_id()
RETURNS TEXT AS $$
BEGIN
    -- Get the JWT claim and ensure it exists
    IF current_setting('request.jwt.claims', true)::json IS NULL THEN
        RAISE EXCEPTION 'No JWT claims found';
    END IF;

    -- Extract the phone claim
    RETURN (current_setting('request.jwt.claims', true)::json->>'phone_number')::text;
END;
$$ LANGUAGE plpgsql STABLE;

-- Add a comment explaining the function
COMMENT ON FUNCTION requesting_user_id IS 'Returns the user phone number from the JWT phone_number claim';

-- Update profiles RLS policies to match on phone instead of clerk_id
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON profiles;

CREATE POLICY "profiles_select_policy" 
    ON profiles FOR SELECT 
    USING (true);

CREATE POLICY "profiles_insert_policy" 
    ON profiles FOR INSERT 
    WITH CHECK (phone = requesting_user_id());

CREATE POLICY "profiles_update_policy" 
    ON profiles FOR UPDATE 
    USING (phone = requesting_user_id())
    WITH CHECK (phone = requesting_user_id());

CREATE POLICY "profiles_delete_policy" 
    ON profiles FOR DELETE 
    USING (phone = requesting_user_id()); 