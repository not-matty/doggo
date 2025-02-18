-- Add bio column to profiles table
ALTER TABLE public.profiles
ADD COLUMN bio text;

-- Add comment to describe the column
COMMENT ON COLUMN public.profiles.bio IS 'User''s bio or description';

-- Update RLS policies to allow users to update their own bio
CREATE POLICY "Users can update their own bio" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id); 