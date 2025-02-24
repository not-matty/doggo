-- Drop all existing foreign key constraints safely
DO $$ 
BEGIN
    -- Drop constraints from likes table
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'likes_liked_id_fkey' AND conrelid = 'public.likes'::regclass) THEN
        ALTER TABLE public.likes DROP CONSTRAINT likes_liked_id_fkey;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'likes_liker_id_fkey' AND conrelid = 'public.likes'::regclass) THEN
        ALTER TABLE public.likes DROP CONSTRAINT likes_liker_id_fkey;
    END IF;

    -- Drop constraints from matches table
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'matches_user1_id_fkey' AND conrelid = 'public.matches'::regclass) THEN
        ALTER TABLE public.matches DROP CONSTRAINT matches_user1_id_fkey;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'matches_user2_id_fkey' AND conrelid = 'public.matches'::regclass) THEN
        ALTER TABLE public.matches DROP CONSTRAINT matches_user2_id_fkey;
    END IF;

    -- Drop constraints from messages table
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'messages_match_id_fkey' AND conrelid = 'public.messages'::regclass) THEN
        ALTER TABLE public.messages DROP CONSTRAINT messages_match_id_fkey;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'messages_sender_id_fkey' AND conrelid = 'public.messages'::regclass) THEN
        ALTER TABLE public.messages DROP CONSTRAINT messages_sender_id_fkey;
    END IF;

    -- Drop constraints from notifications table
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'notifications_user_id_fkey' AND conrelid = 'public.notifications'::regclass) THEN
        ALTER TABLE public.notifications DROP CONSTRAINT notifications_user_id_fkey;
    END IF;

    -- Drop constraints from photos table
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'photos_user_id_fkey' AND conrelid = 'public.photos'::regclass) THEN
        ALTER TABLE public.photos DROP CONSTRAINT photos_user_id_fkey;
    END IF;

    -- Drop constraints from contacts table
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contacts_user_id_fkey' AND conrelid = 'public.contacts'::regclass) THEN
        ALTER TABLE public.contacts DROP CONSTRAINT contacts_user_id_fkey;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contacts_contact_user_id_fkey' AND conrelid = 'public.contacts'::regclass) THEN
        ALTER TABLE public.contacts DROP CONSTRAINT contacts_contact_user_id_fkey;
    END IF;

    -- Drop constraints from unregistered_contacts table
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unregistered_contacts_user_id_fkey' AND conrelid = 'public.unregistered_contacts'::regclass) THEN
        ALTER TABLE public.unregistered_contacts DROP CONSTRAINT unregistered_contacts_user_id_fkey;
    END IF;

    -- Drop constraints from unregistered_likes table
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unregistered_likes_user_id_fkey' AND conrelid = 'public.unregistered_likes'::regclass) THEN
        ALTER TABLE public.unregistered_likes DROP CONSTRAINT unregistered_likes_user_id_fkey;
    END IF;
END $$;

-- First, drop the foreign key constraint to auth.users if it exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_id_fkey' AND conrelid = 'public.profiles'::regclass) THEN
        ALTER TABLE public.profiles DROP CONSTRAINT profiles_id_fkey;
    END IF;
END $$;

-- Modify profiles table to use UUID with default gen_random_uuid()
ALTER TABLE public.profiles 
    ALTER COLUMN id SET DEFAULT gen_random_uuid(),
    ALTER COLUMN clerk_id SET NOT NULL;

-- First ensure RLS is enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Enable read access for all users" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Enable update for users based on clerk_id" ON public.profiles;
DROP POLICY IF EXISTS "Enable delete for users based on clerk_id" ON public.profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can create their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete their own profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON public.profiles;

-- Create RLS policies for profiles with Clerk integration
CREATE POLICY "profiles_select_policy" 
    ON public.profiles FOR SELECT 
    USING (true);

CREATE POLICY "profiles_insert_policy" 
    ON public.profiles FOR INSERT 
    WITH CHECK (
        auth.jwt()->>'sub' IS NOT NULL AND 
        clerk_id = auth.jwt()->>'sub'
    );

CREATE POLICY "profiles_update_policy" 
    ON public.profiles FOR UPDATE 
    USING (clerk_id = auth.jwt()->>'sub')
    WITH CHECK (clerk_id = auth.jwt()->>'sub');

CREATE POLICY "profiles_delete_policy" 
    ON public.profiles FOR DELETE 
    USING (clerk_id = auth.jwt()->>'sub');

-- Update other policies to use clerk_id instead of auth.uid()
DO $$ 
BEGIN
    -- Update photos policies
    DROP POLICY IF EXISTS "Users can view their own photos and photos of their contacts" ON public.photos;
    DROP POLICY IF EXISTS "Users can manage their own photos" ON public.photos;

    CREATE POLICY "Users can view their own photos and photos of their contacts" ON public.photos
        FOR SELECT USING (
            EXISTS (
                SELECT 1 FROM profiles p
                WHERE p.clerk_id = auth.jwt()->>'sub'
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

    CREATE POLICY "Users can manage their own photos" ON public.photos
        FOR ALL USING (
            EXISTS (
                SELECT 1 FROM profiles p
                WHERE p.clerk_id = auth.jwt()->>'sub'
                AND p.id = photos.user_id
            )
        );

    -- Update likes policies
    DROP POLICY IF EXISTS "Users can view their likes" ON public.likes;
    DROP POLICY IF EXISTS "Users can create their own likes" ON public.likes;
    DROP POLICY IF EXISTS "Users can delete their own likes" ON public.likes;

    CREATE POLICY "Users can view their likes" ON public.likes
        FOR SELECT USING (
            EXISTS (
                SELECT 1 FROM profiles p
                WHERE p.clerk_id = auth.jwt()->>'sub'
                AND (p.id = likes.liker_id OR p.id = likes.liked_id)
            )
        );

    CREATE POLICY "Users can create their own likes" ON public.likes
        FOR INSERT WITH CHECK (
            EXISTS (
                SELECT 1 FROM profiles p
                WHERE p.clerk_id = auth.jwt()->>'sub'
                AND p.id = likes.liker_id
            )
        );

    CREATE POLICY "Users can delete their own likes" ON public.likes
        FOR DELETE USING (
            EXISTS (
                SELECT 1 FROM profiles p
                WHERE p.clerk_id = auth.jwt()->>'sub'
                AND p.id = likes.liker_id
            )
        );

    -- Update matches policies
    DROP POLICY IF EXISTS "Users can view their matches" ON public.matches;
    CREATE POLICY "Users can view their matches" ON public.matches
        FOR SELECT USING (
            EXISTS (
                SELECT 1 FROM profiles p
                WHERE p.clerk_id = auth.jwt()->>'sub'
                AND (p.id = matches.user1_id OR p.id = matches.user2_id)
            )
        );

    -- Update messages policies
    DROP POLICY IF EXISTS "Users can view messages in their matches" ON public.messages;
    DROP POLICY IF EXISTS "Users can send messages in their matches" ON public.messages;

    CREATE POLICY "Users can view messages in their matches" ON public.messages
        FOR SELECT USING (
            EXISTS (
                SELECT 1 FROM profiles p
                JOIN matches m ON (m.user1_id = p.id OR m.user2_id = p.id)
                WHERE p.clerk_id = auth.jwt()->>'sub'
                AND m.id = messages.match_id
            )
        );

    CREATE POLICY "Users can send messages in their matches" ON public.messages
        FOR INSERT WITH CHECK (
            EXISTS (
                SELECT 1 FROM profiles p
                JOIN matches m ON (m.user1_id = p.id OR m.user2_id = p.id)
                WHERE p.clerk_id = auth.jwt()->>'sub'
                AND m.id = messages.match_id
                AND p.id = messages.sender_id
            )
        );

    -- Update notifications policies
    DROP POLICY IF EXISTS "Users can view their notifications" ON public.notifications;
    DROP POLICY IF EXISTS "Users can update their notifications" ON public.notifications;

    CREATE POLICY "Users can view their notifications" ON public.notifications
        FOR SELECT USING (
            EXISTS (
                SELECT 1 FROM profiles p
                WHERE p.clerk_id = auth.jwt()->>'sub'
                AND p.id = notifications.user_id
            )
        );

    CREATE POLICY "Users can update their notifications" ON public.notifications
        FOR UPDATE USING (
            EXISTS (
                SELECT 1 FROM profiles p
                WHERE p.clerk_id = auth.jwt()->>'sub'
                AND p.id = notifications.user_id
            )
        );

    -- Update contacts policies
    DROP POLICY IF EXISTS "Users can manage their contacts" ON public.contacts;
    CREATE POLICY "Users can manage their contacts" ON public.contacts
        FOR ALL USING (
            EXISTS (
                SELECT 1 FROM profiles p
                WHERE p.clerk_id = auth.jwt()->>'sub'
                AND p.id = contacts.user_id
            )
        );

    -- Update unregistered contacts policies
    DROP POLICY IF EXISTS "Users can manage their unregistered contacts" ON public.unregistered_contacts;
    CREATE POLICY "Users can manage their unregistered contacts" ON public.unregistered_contacts
        FOR ALL USING (
            EXISTS (
                SELECT 1 FROM profiles p
                WHERE p.clerk_id = auth.jwt()->>'sub'
                AND p.id = unregistered_contacts.user_id
            )
        );

    -- Update unregistered likes policies
    DROP POLICY IF EXISTS "Users can manage their unregistered likes" ON public.unregistered_likes;
    CREATE POLICY "Users can manage their unregistered likes" ON public.unregistered_likes
        FOR ALL USING (
            EXISTS (
                SELECT 1 FROM profiles p
                WHERE p.clerk_id = auth.jwt()->>'sub'
                AND p.id = unregistered_likes.user_id
            )
        );
END $$;

-- Drop users table after migrating any necessary data
DROP TABLE IF EXISTS public.users;

-- Update nullability constraints
DO $$
BEGIN
    -- Likes table
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'likes' AND column_name = 'liker_id') THEN
        ALTER TABLE public.likes ALTER COLUMN liker_id SET NOT NULL;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'likes' AND column_name = 'liked_id') THEN
        ALTER TABLE public.likes ALTER COLUMN liked_id SET NOT NULL;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'likes' AND column_name = 'created_at') THEN
        ALTER TABLE public.likes ALTER COLUMN created_at SET NOT NULL;
    END IF;

    -- Matches table
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'matches' AND column_name = 'user1_id') THEN
        ALTER TABLE public.matches ALTER COLUMN user1_id SET NOT NULL;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'matches' AND column_name = 'user2_id') THEN
        ALTER TABLE public.matches ALTER COLUMN user2_id SET NOT NULL;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'matches' AND column_name = 'matched_at') THEN
        ALTER TABLE public.matches ALTER COLUMN matched_at SET NOT NULL;
    END IF;

    -- Messages table
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'match_id') THEN
        ALTER TABLE public.messages ALTER COLUMN match_id SET NOT NULL;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'sender_id') THEN
        ALTER TABLE public.messages ALTER COLUMN sender_id SET NOT NULL;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'created_at') THEN
        ALTER TABLE public.messages ALTER COLUMN created_at SET NOT NULL;
    END IF;

    -- Other tables' NOT NULL constraints...
END $$;

-- Add foreign key constraints safely
DO $$
BEGIN
    -- Contacts foreign keys
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contacts_user_id_fkey' AND conrelid = 'public.contacts'::regclass) THEN
        ALTER TABLE public.contacts ADD CONSTRAINT contacts_user_id_fkey 
            FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contacts_contact_user_id_fkey' AND conrelid = 'public.contacts'::regclass) THEN
        ALTER TABLE public.contacts ADD CONSTRAINT contacts_contact_user_id_fkey 
            FOREIGN KEY (contact_user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;

    -- Add other foreign key constraints similarly...
END $$;

-- Add unique constraints safely
DO $$ 
BEGIN
    -- For profiles table
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_clerk_id_key') THEN
        -- Ensure the clerk_id column exists before adding the unique constraint
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'clerk_id') THEN
            ALTER TABLE public.profiles ADD CONSTRAINT profiles_clerk_id_key UNIQUE (clerk_id);
        END IF;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_username_key') THEN
        ALTER TABLE public.profiles ADD CONSTRAINT profiles_username_key UNIQUE (username);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_phone_key') THEN
        ALTER TABLE public.profiles ADD CONSTRAINT profiles_phone_key UNIQUE (phone);
    END IF;

    -- Add other unique constraints similarly...
END $$;

-- Create indexes safely
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_profiles_clerk_id') THEN
        CREATE INDEX idx_profiles_clerk_id ON public.profiles(clerk_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_profiles_username') THEN
        CREATE INDEX idx_profiles_username ON public.profiles(username);
    END IF;
    -- Add other indexes similarly...
END $$;

-- Enable Row Level Security on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unregistered_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unregistered_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own photos and photos of their contacts" ON public.photos
    FOR SELECT USING (
        user_id = auth.jwt()->>'sub' OR
        EXISTS (
            SELECT 1 FROM public.contacts
            WHERE (contacts.user_id = auth.jwt()->>'sub' AND contacts.contact_user_id = photos.user_id)
        )
    );

CREATE POLICY "Users can manage their own photos" ON public.photos
    FOR ALL USING (user_id = auth.jwt()->>'sub');

CREATE POLICY "Users can view their likes" ON public.likes
    FOR SELECT USING (liker_id = auth.jwt()->>'sub' OR liked_id = auth.jwt()->>'sub');

CREATE POLICY "Users can create their own likes" ON public.likes
    FOR INSERT WITH CHECK (liker_id = auth.jwt()->>'sub');

CREATE POLICY "Users can delete their own likes" ON public.likes
    FOR DELETE USING (liker_id = auth.jwt()->>'sub');

CREATE POLICY "Users can view their matches" ON public.matches
    FOR SELECT USING (user1_id = auth.jwt()->>'sub' OR user2_id = auth.jwt()->>'sub');

CREATE POLICY "Users can view messages in their matches" ON public.messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.matches m
            WHERE m.id = messages.match_id
            AND (m.user1_id = auth.jwt()->>'sub' OR m.user2_id = auth.jwt()->>'sub')
        )
    );

CREATE POLICY "Users can send messages in their matches" ON public.messages
    FOR INSERT WITH CHECK (
        sender_id = auth.jwt()->>'sub'
        AND EXISTS (
            SELECT 1 FROM public.matches m
            WHERE m.id = match_id
            AND (m.user1_id = auth.jwt()->>'sub' OR m.user2_id = auth.jwt()->>'sub')
        )
    );

CREATE POLICY "Users can view their notifications" ON public.notifications
    FOR SELECT USING (user_id = auth.jwt()->>'sub');

CREATE POLICY "Users can update their notifications" ON public.notifications
    FOR UPDATE USING (user_id = auth.jwt()->>'sub');

CREATE POLICY "Users can manage their contacts" ON public.contacts
    FOR ALL USING (user_id = auth.jwt()->>'sub');

CREATE POLICY "Users can manage their unregistered contacts" ON public.unregistered_contacts
    FOR ALL USING (user_id = auth.jwt()->>'sub');

CREATE POLICY "Users can manage their unregistered likes" ON public.unregistered_likes
    FOR ALL USING (user_id = auth.jwt()->>'sub'); 