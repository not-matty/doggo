-- Enable Row Level Security for relevant tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- Create policy for profiles table to allow users to see:
-- 1. Their own profile
-- 2. Profiles of their direct contacts
-- 3. Profiles of contacts of their contacts (2nd degree)
CREATE POLICY "profiles_contact_network_visibility" ON profiles FOR SELECT
USING (
  -- Own profile
  auth.uid() = id
  -- Direct contacts
  OR id IN (
    SELECT contact_user_id FROM contacts 
    WHERE id = auth.uid() AND contact_user_id IS NOT NULL
  )
  -- Contacts of contacts (2nd degree)
  OR id IN (
    SELECT c2.contact_user_id FROM contacts c1
    JOIN contacts c2 ON c1.contact_user_id = c2.id
    WHERE c1.id = auth.uid() 
      AND c1.contact_user_id IS NOT NULL 
      AND c2.contact_user_id IS NOT NULL
  )
);

-- Create policy for contacts table - users can only see their own contacts
CREATE POLICY "contacts_owner_only" ON contacts
USING (id = auth.uid());

-- Create policy for inserting in contacts
CREATE POLICY "can_insert_own_contacts" ON contacts FOR INSERT
WITH CHECK (id = auth.uid());

-- Create policy for updating own contacts
CREATE POLICY "can_update_own_contacts" ON contacts FOR UPDATE
USING (id = auth.uid());

-- Add index to improve search performance
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles USING gin (username gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_contacts_phone ON contacts (phone);
CREATE INDEX IF NOT EXISTS idx_contacts_contact_user_id ON contacts (contact_user_id) WHERE contact_user_id IS NOT NULL;