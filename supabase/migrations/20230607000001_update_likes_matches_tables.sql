-- Drop and recreate likes table to use profiles.id instead of clerk_id
DROP TABLE IF EXISTS likes;

CREATE TABLE IF NOT EXISTS likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  liker_id UUID NOT NULL REFERENCES profiles(id),
  liked_id UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (liker_id, liked_id)
);

-- Create indices for faster lookups
CREATE INDEX IF NOT EXISTS idx_likes_liker_id ON likes(liker_id);
CREATE INDEX IF NOT EXISTS idx_likes_liked_id ON likes(liked_id);

-- Set up RLS (Row Level Security)
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;

-- Policy to allow select for authenticated users
CREATE POLICY likes_select_policy ON likes 
  FOR SELECT 
  TO authenticated
  USING (liker_id = auth.uid() OR liked_id = auth.uid());

-- Policy to allow insert for authenticated users
CREATE POLICY likes_insert_policy ON likes 
  FOR INSERT 
  TO authenticated
  WITH CHECK (liker_id = auth.uid());

-- Policy to allow delete for authenticated users
CREATE POLICY likes_delete_policy ON likes 
  FOR DELETE 
  TO authenticated
  USING (liker_id = auth.uid());

-- Drop and recreate matches table to ensure it uses profiles.id for user IDs
DROP TABLE IF EXISTS matches;

CREATE TABLE IF NOT EXISTS matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user1_id UUID NOT NULL REFERENCES profiles(id),
  user2_id UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (user1_id, user2_id)
);

-- Create indices for faster lookups
CREATE INDEX IF NOT EXISTS idx_matches_user1_id ON matches(user1_id);
CREATE INDEX IF NOT EXISTS idx_matches_user2_id ON matches(user2_id);

-- Set up RLS (Row Level Security)
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

-- Policy to allow select for authenticated users
CREATE POLICY matches_select_policy ON matches 
  FOR SELECT 
  TO authenticated
  USING (user1_id = auth.uid() OR user2_id = auth.uid());

-- Policy to allow insert for authenticated users
CREATE POLICY matches_insert_policy ON matches 
  FOR INSERT 
  TO authenticated
  WITH CHECK (user1_id = auth.uid() OR user2_id = auth.uid()); 