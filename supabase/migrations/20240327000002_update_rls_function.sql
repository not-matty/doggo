-- Drop existing function first
DROP FUNCTION IF EXISTS requesting_user_id();

-- Create a function to generate a deterministic UUID from phone number
CREATE OR REPLACE FUNCTION generate_stable_uuid(input_text TEXT)
RETURNS UUID AS $$
DECLARE
    namespace UUID := '6ba7b810-9dad-11d1-80b4-00c04fd430c8';  -- UUID namespace for URLs
    combined_text TEXT;
    result UUID;
BEGIN
    -- Combine the input with a fixed salt for consistency
    combined_text := input_text || '_doggo_app';
    -- Generate a v5 UUID using the namespace and combined text
    result := extensions.uuid_generate_v5(namespace, combined_text);
    RETURN result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update the requesting_user_id function to use phone claim
CREATE OR REPLACE FUNCTION requesting_user_id()
RETURNS TEXT AS $$
BEGIN
    -- Get the phone from JWT claims
    RETURN current_setting('request.jwt.claims', true)::json->>'phone';
END;
$$ LANGUAGE plpgsql STABLE;

-- Add helpful comment
COMMENT ON FUNCTION requesting_user_id IS 'Returns the user phone number from JWT phone claim';

-- Update tables to use phone instead of clerk_id
ALTER TABLE likes
    DROP CONSTRAINT IF EXISTS likes_liker_id_fkey,
    DROP CONSTRAINT IF EXISTS likes_liked_id_fkey,
    ALTER COLUMN liker_id TYPE TEXT,
    ALTER COLUMN liked_id TYPE TEXT,
    ADD CONSTRAINT likes_liker_id_fkey
        FOREIGN KEY (liker_id)
        REFERENCES profiles(phone)
        ON DELETE CASCADE,
    ADD CONSTRAINT likes_liked_id_fkey
        FOREIGN KEY (liked_id)
        REFERENCES profiles(phone)
        ON DELETE CASCADE;