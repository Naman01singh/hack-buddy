-- Add created_by column to hackathons table
-- This column tracks which user created each hackathon entry
ALTER TABLE public.hackathons
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Create index for faster queries on created_by
CREATE INDEX IF NOT EXISTS idx_hackathons_created_by ON public.hackathons(created_by);

-- Add RLS policy to allow users to update hackathons they created
DROP POLICY IF EXISTS "Users can update hackathons they created" ON public.hackathons;
CREATE POLICY "Users can update hackathons they created"
  ON public.hackathons FOR UPDATE
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

-- Add RLS policy to allow users to delete hackathons they created
DROP POLICY IF EXISTS "Users can delete hackathons they created" ON public.hackathons;
CREATE POLICY "Users can delete hackathons they created"
  ON public.hackathons FOR DELETE
  USING (auth.uid() = created_by);

