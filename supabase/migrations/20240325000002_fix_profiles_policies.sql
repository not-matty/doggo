-- Drop existing profiles policies
DROP POLICY IF EXISTS "Select profiles policy" ON profiles;
DROP POLICY IF EXISTS "Insert profiles policy" ON profiles;
DROP POLICY IF EXISTS "Update profiles policy" ON profiles;
DROP POLICY IF EXISTS "Delete profiles policy" ON profiles;

-- Recreate profiles policies with simpler conditions
CREATE POLICY "Select profiles policy" ON profiles AS PERMISSIVE
    FOR SELECT TO authenticated
    USING (true);

-- Allow insert when clerk_id matches requesting_user_id, even if profile doesn't exist yet
CREATE POLICY "Insert profiles policy" ON profiles AS PERMISSIVE
    FOR INSERT TO authenticated
    WITH CHECK (
        clerk_id = requesting_user_id()
    );

-- For updates and deletes, still require the profile to exist
CREATE POLICY "Update profiles policy" ON profiles AS PERMISSIVE
    FOR UPDATE TO authenticated
    USING (clerk_id = requesting_user_id())
    WITH CHECK (clerk_id = requesting_user_id());

CREATE POLICY "Delete profiles policy" ON profiles AS PERMISSIVE
    FOR DELETE TO authenticated
    USING (clerk_id = requesting_user_id()); 