-- Allow authenticated users to create hackathons
CREATE POLICY "Authenticated users can create hackathons"
ON public.hackathons
FOR INSERT
TO authenticated
WITH CHECK (true);