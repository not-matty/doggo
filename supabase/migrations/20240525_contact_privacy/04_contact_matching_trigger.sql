-- Create a trigger function to automatically match contacts with registered users
CREATE OR REPLACE FUNCTION match_contact_with_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if this contact's phone matches a registered user
  UPDATE contacts
  SET contact_user_id = p.id,
      updated_at = NOW()
  FROM profiles p
  WHERE contacts.phone = p.phone
    AND contacts.phone = NEW.phone
    AND contacts.contact_user_id IS NULL
    AND p.id != contacts.user_id; -- Don't match with self
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on contacts table
DROP TRIGGER IF EXISTS contact_matching_trigger ON contacts;
CREATE TRIGGER contact_matching_trigger
AFTER INSERT ON contacts
FOR EACH ROW
EXECUTE FUNCTION match_contact_with_user();

-- Create trigger function to update contacts when a user registers
CREATE OR REPLACE FUNCTION update_contacts_on_user_registration()
RETURNS TRIGGER AS $$
BEGIN
  -- When a user registers or updates their phone number,
  -- update all contacts with this phone number to link to the user
  IF NEW.phone IS NOT NULL THEN
    UPDATE contacts
    SET contact_user_id = NEW.id,
        updated_at = NOW()
    WHERE phone = NEW.phone
      AND contact_user_id IS NULL
      AND contacts.phone != NEW.phone; -- Don't match with self
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on profiles table
DROP TRIGGER IF EXISTS profile_registration_trigger ON profiles;
CREATE TRIGGER profile_registration_trigger
AFTER INSERT OR UPDATE OF phone ON profiles
FOR EACH ROW
EXECUTE FUNCTION update_contacts_on_user_registration(); 