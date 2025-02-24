-- Drop all existing policies
DO $$ 
BEGIN
    -- Profiles policies
    DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
    DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
    DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
    DROP POLICY IF EXISTS "profiles_delete_policy" ON profiles;

    -- Photos policies
    DROP POLICY IF EXISTS "Users can view their own photos and photos of their contacts" ON photos;
    DROP POLICY IF EXISTS "Users can manage their own photos" ON photos;

    -- Likes policies
    DROP POLICY IF EXISTS "Users can view their likes" ON likes;
    DROP POLICY IF EXISTS "Users can create their own likes" ON likes;
    DROP POLICY IF EXISTS "Users can delete their own likes" ON likes;

    -- Matches policies
    DROP POLICY IF EXISTS "Users can view their matches" ON matches;

    -- Messages policies
    DROP POLICY IF EXISTS "Users can view messages in their matches" ON messages;
    DROP POLICY IF EXISTS "Users can send messages in their matches" ON messages;

    -- Notifications policies
    DROP POLICY IF EXISTS "Users can view their notifications" ON notifications;
    DROP POLICY IF EXISTS "Users can update their notifications" ON notifications;

    -- Contacts policies
    DROP POLICY IF EXISTS "Users can manage their contacts" ON contacts;

    -- Unregistered contacts policies
    DROP POLICY IF EXISTS "Users can manage their unregistered contacts" ON unregistered_contacts;

    -- Unregistered likes policies
    DROP POLICY IF EXISTS "Users can manage their unregistered likes" ON unregistered_likes;
END $$;

-- Create new policies using consistent pattern
-- Profiles policies
CREATE POLICY "Select profiles policy" ON profiles AS PERMISSIVE
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Insert profiles policy" ON profiles AS PERMISSIVE
    FOR INSERT TO authenticated
    WITH CHECK (requesting_user_id() = clerk_id);

CREATE POLICY "Update profiles policy" ON profiles AS PERMISSIVE
    FOR UPDATE TO authenticated
    USING (requesting_user_id() = clerk_id)
    WITH CHECK (requesting_user_id() = clerk_id);

CREATE POLICY "Delete profiles policy" ON profiles AS PERMISSIVE
    FOR DELETE TO authenticated
    USING (requesting_user_id() = clerk_id);

-- Photos policies
CREATE POLICY "Select photos policy" ON photos AS PERMISSIVE
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE clerk_id = requesting_user_id()
            AND id = photos.user_id
        )
        OR
        EXISTS (
            SELECT 1 FROM profiles p
            JOIN contacts c ON c.user_id = p.id
            WHERE p.clerk_id = requesting_user_id()
            AND c.contact_user_id = photos.user_id
        )
    );

CREATE POLICY "Insert photos policy" ON photos AS PERMISSIVE
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE clerk_id = requesting_user_id()
            AND id = user_id
        )
    );

CREATE POLICY "Update photos policy" ON photos AS PERMISSIVE
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE clerk_id = requesting_user_id()
            AND id = user_id
        )
    );

CREATE POLICY "Delete photos policy" ON photos AS PERMISSIVE
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE clerk_id = requesting_user_id()
            AND id = user_id
        )
    );

-- Likes policies
CREATE POLICY "Select likes policy" ON likes AS PERMISSIVE
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE clerk_id = requesting_user_id()
            AND id IN (liker_id, liked_id)
        )
    );

CREATE POLICY "Insert likes policy" ON likes AS PERMISSIVE
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE clerk_id = requesting_user_id()
            AND id = liker_id
        )
    );

CREATE POLICY "Delete likes policy" ON likes AS PERMISSIVE
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE clerk_id = requesting_user_id()
            AND id = liker_id
        )
    );

-- Matches policies
CREATE POLICY "Select matches policy" ON matches AS PERMISSIVE
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE clerk_id = requesting_user_id()
            AND id IN (user1_id, user2_id)
        )
    );

-- Messages policies
CREATE POLICY "Select messages policy" ON messages AS PERMISSIVE
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            JOIN matches m ON m.id = messages.match_id
            WHERE p.clerk_id = requesting_user_id()
            AND (m.user1_id = p.id OR m.user2_id = p.id)
        )
    );

CREATE POLICY "Insert messages policy" ON messages AS PERMISSIVE
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles p
            JOIN matches m ON m.id = match_id
            WHERE p.clerk_id = requesting_user_id()
            AND p.id = sender_id
            AND (m.user1_id = p.id OR m.user2_id = p.id)
        )
    );

-- Notifications policies
CREATE POLICY "Select notifications policy" ON notifications AS PERMISSIVE
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE clerk_id = requesting_user_id()
            AND id = user_id
        )
    );

CREATE POLICY "Update notifications policy" ON notifications AS PERMISSIVE
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE clerk_id = requesting_user_id()
            AND id = user_id
        )
    );

-- Contacts policies
CREATE POLICY "Select contacts policy" ON contacts AS PERMISSIVE
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE clerk_id = requesting_user_id()
            AND id = user_id
        )
    );

CREATE POLICY "Insert contacts policy" ON contacts AS PERMISSIVE
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE clerk_id = requesting_user_id()
            AND id = user_id
        )
    );

CREATE POLICY "Delete contacts policy" ON contacts AS PERMISSIVE
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE clerk_id = requesting_user_id()
            AND id = user_id
        )
    );

-- Unregistered contacts policies
CREATE POLICY "Select unregistered contacts policy" ON unregistered_contacts AS PERMISSIVE
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE clerk_id = requesting_user_id()
            AND id = user_id
        )
    );

CREATE POLICY "Insert unregistered contacts policy" ON unregistered_contacts AS PERMISSIVE
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE clerk_id = requesting_user_id()
            AND id = user_id
        )
    );

CREATE POLICY "Delete unregistered contacts policy" ON unregistered_contacts AS PERMISSIVE
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE clerk_id = requesting_user_id()
            AND id = user_id
        )
    );

-- Unregistered likes policies
CREATE POLICY "Select unregistered likes policy" ON unregistered_likes AS PERMISSIVE
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE clerk_id = requesting_user_id()
            AND id = user_id
        )
    );

CREATE POLICY "Insert unregistered likes policy" ON unregistered_likes AS PERMISSIVE
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE clerk_id = requesting_user_id()
            AND id = user_id
        )
    );

CREATE POLICY "Delete unregistered likes policy" ON unregistered_likes AS PERMISSIVE
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE clerk_id = requesting_user_id()
            AND id = user_id
        )
    ); 