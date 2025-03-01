-- Add full-text search capabilities to contacts table

-- Add the tsvector column for fast text search
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Create a function to populate and update the search vector
CREATE OR REPLACE FUNCTION contacts_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector = 
    setweight(to_tsvector('english', coalesce(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.phone, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically update the search vector
DROP TRIGGER IF EXISTS tsvector_update_contacts ON contacts;
CREATE TRIGGER tsvector_update_contacts
BEFORE INSERT OR UPDATE ON contacts
FOR EACH ROW
EXECUTE FUNCTION contacts_search_vector_update();

-- Populate search vectors for existing records
UPDATE contacts SET search_vector = 
  setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(phone, '')), 'B');

-- Create an index to make full-text searches faster
CREATE INDEX IF NOT EXISTS contacts_search_idx ON contacts USING gin(search_vector); 