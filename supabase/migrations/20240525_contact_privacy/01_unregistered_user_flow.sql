-- Update unregistered_contacts and unregistered_likes tables to create a seamless user registration flow
-- This enables a smooth transition when unregistered contacts become registered users

-- Drop existing constraints if they exist
ALTER TABLE IF EXISTS unregistered_contacts 
  DROP CONSTRAINT IF EXISTS unregistered_contacts_pkey CASCADE;

ALTER TABLE IF EXISTS unregistered_likes
  DROP CONSTRAINT IF EXISTS unregistered_likes_pkey CASCADE;

-- Remove user_id column from unregistered_contacts
ALTER TABLE IF EXISTS unregistered_contacts
  DROP COLUMN IF EXISTS user_id;

-- Remove user_id column from unregistered_likes
ALTER TABLE IF EXISTS unregistered_likes
  DROP COLUMN IF EXISTS user_id;

-- Drop tables if they exist
DROP TABLE IF EXISTS unregistered_contacts;
DROP TABLE IF EXISTS unregistered_likes;

-- Create tables with the correct structure
CREATE TABLE unregistered_contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone TEXT NOT NULL,
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  source TEXT,
  UNIQUE(phone)
);

CREATE TABLE unregistered_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  liker_phone TEXT NOT NULL, -- Phone of the registered user who liked
  liked_phone TEXT NOT NULL, -- Phone of the unregistered contact who was liked
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  UNIQUE(liker_phone, liked_phone)
);

-- Create function to transfer unregistered likes to regular likes when a user registers
CREATE OR REPLACE FUNCTION transfer_unregistered_likes()
RETURNS TRIGGER AS $$
BEGIN
  -- When a user registers, find any likes they sent to others as unregistered
  IF NEW.phone IS NOT NULL THEN
    -- First, transfer likes they received from registered users
    INSERT INTO likes (liker_id, liked_id, created_at)
    SELECT 
      p.clerk_id, 
      NEW.clerk_id, 
      ul.created_at
    FROM unregistered_likes ul
    JOIN profiles p ON ul.liker_phone = p.phone
    WHERE ul.liked_phone = NEW.phone
    ON CONFLICT DO NOTHING;

    -- Then, transfer likes they sent to registered users
    INSERT INTO likes (liker_id, liked_id, created_at)
    SELECT 
      NEW.clerk_id, 
      p.clerk_id, 
      ul.created_at
    FROM unregistered_likes ul
    JOIN profiles p ON ul.liked_phone = p.phone
    WHERE ul.liker_phone = NEW.phone
    ON CONFLICT DO NOTHING;
    
    -- Check for mutual likes that would create matches
    WITH new_mutual_likes AS (
      SELECT 
        NEW.id as user1_id,
        p.id as user2_id
      FROM likes l1
      JOIN likes l2 ON l1.liker_id = l2.liked_id AND l1.liked_id = l2.liker_id
      JOIN profiles p ON l2.liker_id = p.clerk_id
      WHERE l1.liker_id = NEW.clerk_id
        AND NOT EXISTS (
          SELECT 1 FROM matches
          WHERE (user1_id = NEW.id AND user2_id = p.id)
          OR (user1_id = p.id AND user2_id = NEW.id)
        )
    )
    INSERT INTO matches (user1_id, user2_id, created_at)
    SELECT user1_id, user2_id, NOW()
    FROM new_mutual_likes;

    -- Delete processed unregistered likes
    DELETE FROM unregistered_likes
    WHERE liked_phone = NEW.phone OR liker_phone = NEW.phone;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on profiles table for transferring likes
DROP TRIGGER IF EXISTS transfer_unregistered_likes_trigger ON profiles;
CREATE TRIGGER transfer_unregistered_likes_trigger
AFTER INSERT OR UPDATE OF phone ON profiles
FOR EACH ROW
EXECUTE FUNCTION transfer_unregistered_likes();

-- Update the search view and contact matching to work with the new schema