-- First, drop any existing foreign key constraints that reference profiles.id
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'user_likes_liker_id_fkey') THEN
        ALTER TABLE public.user_likes DROP CONSTRAINT user_likes_liker_id_fkey;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'user_likes_liked_id_fkey') THEN
        ALTER TABLE public.user_likes DROP CONSTRAINT user_likes_liked_id_fkey;
    END IF;
END $$;

-- Update the profiles table
ALTER TABLE public.profiles 
    DROP CONSTRAINT IF EXISTS profiles_pkey,
    ADD COLUMN IF NOT EXISTS clerk_id TEXT,
    ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid() PRIMARY KEY;

-- Add unique constraint on clerk_id
ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_clerk_id_key UNIQUE (clerk_id);

-- Add unique constraint on username
ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_username_key UNIQUE (username);

-- Add unique constraint on phone
ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_phone_key UNIQUE (phone);

-- Update RLS policies to use clerk_id instead of auth.uid
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete their own profile" ON public.profiles;

CREATE POLICY "Users can view all profiles"
    ON public.profiles FOR SELECT
    USING (true);

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    USING (clerk_id = auth.uid());

CREATE POLICY "Users can delete their own profile"
    ON public.profiles FOR DELETE
    USING (clerk_id = auth.uid());

-- Recreate foreign key constraints with the new UUID id
ALTER TABLE public.user_likes
    ADD CONSTRAINT user_likes_liker_id_fkey FOREIGN KEY (liker_id) REFERENCES profiles(id),
    ADD CONSTRAINT user_likes_liked_id_fkey FOREIGN KEY (liked_id) REFERENCES profiles(id); 