-- Create or modify contacts table
-- Drop the old contacts table if it exists with incorrect schema
DROP TABLE IF EXISTS contacts;

-- Create the contacts table with the correct schema
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone_number TEXT NOT NULL,
  owner_id UUID NOT NULL REFERENCES profiles(id),
  contact_user_id UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (owner_id, phone_number)
);

-- Create indices for faster lookups
CREATE INDEX IF NOT EXISTS idx_contacts_owner_id ON contacts(owner_id);
CREATE INDEX IF NOT EXISTS idx_contacts_phone_number ON contacts(phone_number);
CREATE INDEX IF NOT EXISTS idx_contacts_contact_user_id ON contacts(contact_user_id);

-- Set up RLS (Row Level Security)
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- Policy to allow select for authenticated users
CREATE POLICY contacts_select_policy ON contacts 
  FOR SELECT 
  TO authenticated
  USING (owner_id = auth.uid() OR contact_user_id = auth.uid());

-- Policy to allow insert for authenticated users
CREATE POLICY contacts_insert_policy ON contacts 
  FOR INSERT 
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

-- Policy to allow update for authenticated users
CREATE POLICY contacts_update_policy ON contacts 
  FOR UPDATE 
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Policy to allow delete for authenticated users
CREATE POLICY contacts_delete_policy ON contacts 
  FOR DELETE 
  TO authenticated
  USING (owner_id = auth.uid()); 