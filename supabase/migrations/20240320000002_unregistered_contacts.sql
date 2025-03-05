-- Create unregistered_contacts table if it doesn't exist
CREATE TABLE IF NOT EXISTS unregistered_contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone TEXT NOT NULL,
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  source TEXT,
  UNIQUE (phone)
);

-- Create unregistered_likes table if it doesn't exist
CREATE TABLE IF NOT EXISTS unregistered_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  liker_phone TEXT NOT NULL,
  liked_phone TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (liker_phone, liked_phone)
);

-- Create indices for faster lookups
CREATE INDEX IF NOT EXISTS idx_unregistered_contacts_phone ON unregistered_contacts(phone);
CREATE INDEX IF NOT EXISTS idx_unregistered_likes_phones ON unregistered_likes(liker_phone, liked_phone);

-- Enable RLS
ALTER TABLE unregistered_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE unregistered_likes ENABLE ROW LEVEL SECURITY;

-- Policies for unregistered_contacts
CREATE POLICY "Anyone can view unregistered contacts"
  ON unregistered_contacts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Anyone can insert unregistered contacts"
  ON unregistered_contacts FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policies for unregistered_likes
CREATE POLICY "Anyone can view unregistered likes"
  ON unregistered_likes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Anyone can insert unregistered likes"
  ON unregistered_likes FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Function to handle likes for unregistered contacts
CREATE OR REPLACE FUNCTION handle_unregistered_like(
  liker_phone TEXT,
  liked_phone TEXT
) RETURNS void AS $$
BEGIN
  -- Insert into unregistered_likes
  INSERT INTO unregistered_likes (liker_phone, liked_phone)
  VALUES (liker_phone, liked_phone)
  ON CONFLICT (liker_phone, liked_phone) DO NOTHING;

  -- Ensure both phones exist in unregistered_contacts
  INSERT INTO unregistered_contacts (phone)
  VALUES (liker_phone), (liked_phone)
  ON CONFLICT (phone) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 