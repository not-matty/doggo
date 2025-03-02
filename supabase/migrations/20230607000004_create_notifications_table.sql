-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  type TEXT NOT NULL, -- 'like', 'match', 'comment', etc.
  data JSONB NOT NULL DEFAULT '{}',
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indices for faster lookups
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

-- Set up RLS (Row Level Security)
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Policy to allow select for authenticated users
CREATE POLICY notifications_select_policy ON notifications 
  FOR SELECT 
  TO authenticated
  USING (user_id = auth.uid());

-- Policy to allow insert for authenticated users
CREATE POLICY notifications_insert_policy ON notifications 
  FOR INSERT 
  TO authenticated
  WITH CHECK (TRUE); -- Allow any authenticated user to create notifications

-- Policy to allow update for authenticated users
CREATE POLICY notifications_update_policy ON notifications 
  FOR UPDATE 
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Policy to allow delete for authenticated users
CREATE POLICY notifications_delete_policy ON notifications 
  FOR DELETE 
  TO authenticated
  USING (user_id = auth.uid()); 