-- Update the requesting_user_id function to be more resilient
CREATE OR REPLACE FUNCTION requesting_user_id()
RETURNS TEXT AS $$
DECLARE
    claims json;
    user_id text;
BEGIN
    -- Get the claims safely
    BEGIN
        claims := current_setting('request.jwt.claims', true)::json;
    EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION 'Invalid JWT claims';
    END;

    -- First try to get user_id claim
    user_id := claims ->> 'user_id';
    
    -- If no user_id found, try sub as fallback
    IF user_id IS NULL THEN
        user_id := claims ->> 'sub';
    END IF;

    -- If still no user id found, raise exception
    IF user_id IS NULL THEN
        RAISE EXCEPTION 'No valid user ID found in JWT claims';
    END IF;

    RETURN user_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- Add helpful comment
COMMENT ON FUNCTION requesting_user_id IS 'Returns the user ID from JWT claims, preferring user_id claim over sub claim'; 