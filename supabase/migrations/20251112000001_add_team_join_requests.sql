-- Create team_join_requests table for managing join requests
CREATE TABLE public.team_join_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(team_id, user_id)
);

-- Create indexes for faster queries
CREATE INDEX idx_team_join_requests_team_id ON public.team_join_requests(team_id);
CREATE INDEX idx_team_join_requests_user_id ON public.team_join_requests(user_id);
CREATE INDEX idx_team_join_requests_status ON public.team_join_requests(status);

-- Enable RLS
ALTER TABLE public.team_join_requests ENABLE ROW LEVEL SECURITY;

-- Team join requests policies
-- Team members and team leader can view requests for their team
CREATE POLICY "Team members can view join requests for their team"
  ON public.team_join_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.teams
      WHERE teams.id = team_join_requests.team_id
      AND (
        teams.leader_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.team_members
          WHERE team_members.team_id = teams.id
          AND team_members.user_id = auth.uid()
        )
      )
    )
    OR user_id = auth.uid()
  );

-- Users can create join requests for themselves
CREATE POLICY "Users can create join requests"
  ON public.team_join_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Team leaders can update join request status
CREATE POLICY "Team leaders can update join request status"
  ON public.team_join_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.teams
      WHERE teams.id = team_join_requests.team_id
      AND teams.leader_id = auth.uid()
    )
  );

-- Users can delete their own pending requests
CREATE POLICY "Users can delete own pending requests"
  ON public.team_join_requests FOR DELETE
  USING (
    auth.uid() = user_id
    AND status = 'pending'
  );

-- Create trigger function for updated_at
CREATE TRIGGER update_team_join_requests_updated_at
  BEFORE UPDATE ON public.team_join_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Enable real-time for team_join_requests table
ALTER PUBLICATION supabase_realtime ADD TABLE public.team_join_requests;

