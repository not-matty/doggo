-- Create the requesting_user_id function
CREATE OR REPLACE FUNCTION requesting_user_id()
RETURNS TEXT AS $$
    SELECT NULLIF(
        current_setting('request.jwt.claims', true)::json->>'sub',
        ''
    )::text;
$$ LANGUAGE SQL STABLE;

-- Create tasks table
CREATE TABLE tasks(
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    user_id TEXT NOT NULL DEFAULT requesting_user_id(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Enable RLS on the table
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Select tasks policy" ON tasks
    FOR SELECT
    TO authenticated
    USING (requesting_user_id() = user_id);

CREATE POLICY "Insert tasks policy" ON tasks
    FOR INSERT
    TO authenticated
    WITH CHECK (requesting_user_id() = user_id);

-- Add foreign key to profiles
ALTER TABLE tasks
    ADD CONSTRAINT tasks_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES profiles(clerk_id)
    ON DELETE CASCADE; 