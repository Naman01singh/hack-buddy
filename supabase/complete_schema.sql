-- ============================================================================
-- COMPLETE DATABASE SCHEMA FOR HACK-BUDDY APPLICATION
-- ============================================================================
-- This file contains the complete database schema including:
-- - All tables with their columns and constraints
-- - Row Level Security (RLS) policies
-- - Triggers and functions
-- - Indexes for performance
-- - Real-time subscriptions
-- ============================================================================

-- ============================================================================
-- SECTION 1: CREATE TABLES
-- ============================================================================

-- Create profiles table for user information
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT,
  bio TEXT,
  skills TEXT[] DEFAULT '{}',
  tech_stack TEXT[] DEFAULT '{}',
  college TEXT,
  year TEXT,
  github_url TEXT,
  linkedin_url TEXT,
  avatar_url TEXT,
  looking_for_team BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create hackathons table
CREATE TABLE IF NOT EXISTS public.hackathons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  location TEXT,
  is_virtual BOOLEAN DEFAULT false,
  max_team_size INTEGER DEFAULT 4,
  registration_deadline TIMESTAMP WITH TIME ZONE,
  prize_pool TEXT,
  website_url TEXT,
  image_url TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create teams table
CREATE TABLE IF NOT EXISTS public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  hackathon_id UUID REFERENCES public.hackathons(id) ON DELETE SET NULL,
  leader_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  looking_for_members BOOLEAN DEFAULT true,
  required_skills TEXT[] DEFAULT '{}',
  max_members INTEGER DEFAULT 4,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create team_members junction table
CREATE TABLE IF NOT EXISTS public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(team_id, user_id)
);

-- Create hackathon_registrations table
CREATE TABLE IF NOT EXISTS public.hackathon_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hackathon_id UUID REFERENCES public.hackathons(id) ON DELETE CASCADE NOT NULL,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  registered_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(hackathon_id, user_id)
);

-- Create messages table for team/general chat functionality
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  -- If team_id is NULL, it's a general/public chat message
  -- If team_id is set, it's a team-specific message
  CONSTRAINT messages_content_not_empty CHECK (length(trim(content)) > 0)
);

-- Create team_join_requests table for managing join requests
CREATE TABLE IF NOT EXISTS public.team_join_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(team_id, user_id)
);

-- Create personal_messages table for 1-on-1 chat
CREATE TABLE IF NOT EXISTS public.personal_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  receiver_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  read_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT personal_messages_content_not_empty CHECK (length(trim(content)) > 0),
  CONSTRAINT personal_messages_no_self_message CHECK (sender_id != receiver_id)
);

-- ============================================================================
-- SECTION 2: CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Hackathons indexes
CREATE INDEX IF NOT EXISTS idx_hackathons_created_by ON public.hackathons(created_by);

-- Messages indexes
CREATE INDEX IF NOT EXISTS idx_messages_team_id ON public.messages(team_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);

-- Team join requests indexes
CREATE INDEX IF NOT EXISTS idx_team_join_requests_team_id ON public.team_join_requests(team_id);
CREATE INDEX IF NOT EXISTS idx_team_join_requests_user_id ON public.team_join_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_team_join_requests_status ON public.team_join_requests(status);

-- Personal messages indexes
CREATE INDEX IF NOT EXISTS idx_personal_messages_sender_id ON public.personal_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_personal_messages_receiver_id ON public.personal_messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_personal_messages_created_at ON public.personal_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_personal_messages_conversation ON public.personal_messages(sender_id, receiver_id, created_at DESC);

-- ============================================================================
-- SECTION 3: CREATE FUNCTIONS
-- ============================================================================

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to handle new user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Anonymous User'),
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- ============================================================================
-- SECTION 4: CREATE TRIGGERS
-- ============================================================================

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS update_teams_updated_at ON public.teams;
DROP TRIGGER IF EXISTS update_team_join_requests_updated_at ON public.team_join_requests;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Add triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_teams_updated_at
  BEFORE UPDATE ON public.teams
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_team_join_requests_updated_at
  BEFORE UPDATE ON public.team_join_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Trigger for new user
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- SECTION 5: ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hackathons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hackathon_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_join_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personal_messages ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SECTION 6: CREATE RLS POLICIES
-- ============================================================================

-- Drop existing policies if they exist (to allow re-running)
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

DROP POLICY IF EXISTS "Hackathons are viewable by everyone" ON public.hackathons;
DROP POLICY IF EXISTS "Authenticated users can create hackathons" ON public.hackathons;
DROP POLICY IF EXISTS "Users can update hackathons they created" ON public.hackathons;
DROP POLICY IF EXISTS "Users can delete hackathons they created" ON public.hackathons;

DROP POLICY IF EXISTS "Teams are viewable by everyone" ON public.teams;
DROP POLICY IF EXISTS "Authenticated users can create teams" ON public.teams;
DROP POLICY IF EXISTS "Team leaders can update their teams" ON public.teams;
DROP POLICY IF EXISTS "Team leaders can delete their teams" ON public.teams;

DROP POLICY IF EXISTS "Team members are viewable by everyone" ON public.team_members;
DROP POLICY IF EXISTS "Users can join teams" ON public.team_members;
DROP POLICY IF EXISTS "Team leaders can add members to their teams" ON public.team_members;
DROP POLICY IF EXISTS "Users can leave teams" ON public.team_members;

DROP POLICY IF EXISTS "Registrations are viewable by everyone" ON public.hackathon_registrations;
DROP POLICY IF EXISTS "Users can register for hackathons" ON public.hackathon_registrations;
DROP POLICY IF EXISTS "Users can unregister from hackathons" ON public.hackathon_registrations;

DROP POLICY IF EXISTS "Messages are viewable by everyone" ON public.messages;
DROP POLICY IF EXISTS "Authenticated users can send messages" ON public.messages;
DROP POLICY IF EXISTS "Users can delete own messages" ON public.messages;

DROP POLICY IF EXISTS "Team members can view join requests for their team" ON public.team_join_requests;
DROP POLICY IF EXISTS "Users can create join requests" ON public.team_join_requests;
DROP POLICY IF EXISTS "Team leaders can update join request status" ON public.team_join_requests;
DROP POLICY IF EXISTS "Users can delete own pending requests" ON public.team_join_requests;

DROP POLICY IF EXISTS "Users can view their personal messages" ON public.personal_messages;
DROP POLICY IF EXISTS "Users can send personal messages" ON public.personal_messages;
DROP POLICY IF EXISTS "Users can update read status of their received messages" ON public.personal_messages;
DROP POLICY IF EXISTS "Users can delete their own sent messages" ON public.personal_messages;

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Hackathons policies
CREATE POLICY "Hackathons are viewable by everyone"
  ON public.hackathons FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create hackathons"
  ON public.hackathons FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update hackathons they created"
  ON public.hackathons FOR UPDATE
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can delete hackathons they created"
  ON public.hackathons FOR DELETE
  USING (auth.uid() = created_by);

-- Teams policies
CREATE POLICY "Teams are viewable by everyone"
  ON public.teams FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create teams"
  ON public.teams FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = leader_id);

CREATE POLICY "Team leaders can update their teams"
  ON public.teams FOR UPDATE
  USING (auth.uid() = leader_id);

CREATE POLICY "Team leaders can delete their teams"
  ON public.teams FOR DELETE
  USING (auth.uid() = leader_id);

-- Team members policies
CREATE POLICY "Team members are viewable by everyone"
  ON public.team_members FOR SELECT
  USING (true);

CREATE POLICY "Users can join teams"
  ON public.team_members FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Team leaders can add members to their teams"
  ON public.team_members FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.teams
      WHERE teams.id = team_members.team_id
      AND teams.leader_id = auth.uid()
    )
  );

CREATE POLICY "Users can leave teams"
  ON public.team_members FOR DELETE
  USING (auth.uid() = user_id);

-- Hackathon registrations policies
CREATE POLICY "Registrations are viewable by everyone"
  ON public.hackathon_registrations FOR SELECT
  USING (true);

CREATE POLICY "Users can register for hackathons"
  ON public.hackathon_registrations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unregister from hackathons"
  ON public.hackathon_registrations FOR DELETE
  USING (auth.uid() = user_id);

-- Messages policies
CREATE POLICY "Messages are viewable by everyone"
  ON public.messages FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can send messages"
  ON public.messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can delete own messages"
  ON public.messages FOR DELETE
  USING (auth.uid() = sender_id);

-- Team join requests policies
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

CREATE POLICY "Users can create join requests"
  ON public.team_join_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Team leaders can update join request status"
  ON public.team_join_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.teams
      WHERE teams.id = team_join_requests.team_id
      AND teams.leader_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own pending requests"
  ON public.team_join_requests FOR DELETE
  USING (
    auth.uid() = user_id
    AND status = 'pending'
  );

-- Personal messages policies
CREATE POLICY "Users can view their personal messages"
  ON public.personal_messages FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send personal messages"
  ON public.personal_messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update read status of their received messages"
  ON public.personal_messages FOR UPDATE
  USING (auth.uid() = receiver_id)
  WITH CHECK (auth.uid() = receiver_id);

CREATE POLICY "Users can delete their own sent messages"
  ON public.personal_messages FOR DELETE
  USING (auth.uid() = sender_id);

-- ============================================================================
-- SECTION 7: ENABLE REAL-TIME SUBSCRIPTIONS
-- ============================================================================

-- Enable real-time for messages table
-- Note: If table is already in publication, this will error but can be ignored
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'messages' 
    AND schemaname = 'public'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
END $$;

-- Enable real-time for team_join_requests table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'team_join_requests' 
    AND schemaname = 'public'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.team_join_requests;
  END IF;
END $$;

-- Enable real-time for personal_messages table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'personal_messages' 
    AND schemaname = 'public'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.personal_messages;
  END IF;
END $$;

-- ============================================================================
-- SCHEMA COMPLETE
-- ============================================================================
-- All tables, policies, triggers, functions, and real-time subscriptions
-- have been created and configured.
-- ============================================================================

