-- Update the requesting_user_id function to be more explicit about JWT claims
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
COMMENT ON FUNCTION requesting_user_id IS 'Returns the Clerk user ID from the JWT sub claim. This ID matches the clerk_id in the profiles table.'; 