-- Create enum for app roles
CREATE TYPE public.app_role AS ENUM ('admin', 'member', 'viewer');

-- Create enum for board visibility
CREATE TYPE public.board_visibility AS ENUM ('private', 'workspace');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create workspaces table
CREATE TABLE public.workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create boards table
CREATE TABLE public.boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  visibility public.board_visibility DEFAULT 'workspace',
  owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create board_members table with roles
CREATE TABLE public.board_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID REFERENCES public.boards(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role public.app_role DEFAULT 'member',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(board_id, user_id)
);

-- Create lists table with position
CREATE TABLE public.lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID REFERENCES public.boards(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  position FLOAT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create cards table with position
CREATE TABLE public.cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID REFERENCES public.lists(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  position FLOAT NOT NULL,
  due_date TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create card_labels table
CREATE TABLE public.card_labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID REFERENCES public.cards(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create card_assignees table
CREATE TABLE public.card_assignees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID REFERENCES public.cards(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(card_id, user_id)
);

-- Create comments table
CREATE TABLE public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID REFERENCES public.cards(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create activity_logs table (append-only)
CREATE TABLE public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID REFERENCES public.boards(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.board_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.card_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.card_assignees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check board membership
CREATE OR REPLACE FUNCTION public.is_board_member(board_id_param UUID, user_id_param UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.board_members
    WHERE board_id = board_id_param
      AND user_id = user_id_param
  ) OR EXISTS (
    SELECT 1
    FROM public.boards
    WHERE id = board_id_param
      AND owner_id = user_id_param
  );
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- RLS Policies for workspaces
CREATE POLICY "Users can view workspaces they own or are members of"
  ON public.workspaces FOR SELECT
  USING (
    owner_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.boards b
      JOIN public.board_members bm ON b.id = bm.board_id
      WHERE b.workspace_id = workspaces.id AND bm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create workspaces"
  ON public.workspaces FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Workspace owners can update their workspaces"
  ON public.workspaces FOR UPDATE
  USING (owner_id = auth.uid());

CREATE POLICY "Workspace owners can delete their workspaces"
  ON public.workspaces FOR DELETE
  USING (owner_id = auth.uid());

-- RLS Policies for boards
CREATE POLICY "Users can view boards they own or are members of"
  ON public.boards FOR SELECT
  USING (
    owner_id = auth.uid() OR
    public.is_board_member(id, auth.uid())
  );

CREATE POLICY "Users can create boards in their workspaces"
  ON public.boards FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.workspaces WHERE id = workspace_id AND owner_id = auth.uid())
  );

CREATE POLICY "Board owners can update their boards"
  ON public.boards FOR UPDATE
  USING (owner_id = auth.uid());

CREATE POLICY "Board owners can delete their boards"
  ON public.boards FOR DELETE
  USING (owner_id = auth.uid());

-- RLS Policies for board_members
CREATE POLICY "Users can view board members if they are members"
  ON public.board_members FOR SELECT
  USING (public.is_board_member(board_id, auth.uid()));

CREATE POLICY "Board owners can add members"
  ON public.board_members FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.boards WHERE id = board_id AND owner_id = auth.uid())
  );

CREATE POLICY "Board owners can remove members"
  ON public.board_members FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.boards WHERE id = board_id AND owner_id = auth.uid())
  );

-- RLS Policies for lists
CREATE POLICY "Board members can view lists"
  ON public.lists FOR SELECT
  USING (public.is_board_member(board_id, auth.uid()));

CREATE POLICY "Board members can create lists"
  ON public.lists FOR INSERT
  WITH CHECK (public.is_board_member(board_id, auth.uid()));

CREATE POLICY "Board members can update lists"
  ON public.lists FOR UPDATE
  USING (public.is_board_member(board_id, auth.uid()));

CREATE POLICY "Board owners can delete lists"
  ON public.lists FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.boards WHERE id = board_id AND owner_id = auth.uid())
  );

-- RLS Policies for cards
CREATE POLICY "Board members can view cards"
  ON public.cards FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.lists WHERE id = list_id AND public.is_board_member(board_id, auth.uid()))
  );

CREATE POLICY "Board members can create cards"
  ON public.cards FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.lists WHERE id = list_id AND public.is_board_member(board_id, auth.uid()))
  );

CREATE POLICY "Board members can update cards"
  ON public.cards FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.lists WHERE id = list_id AND public.is_board_member(board_id, auth.uid()))
  );

CREATE POLICY "Board members can delete cards"
  ON public.cards FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.lists WHERE id = list_id AND public.is_board_member(board_id, auth.uid()))
  );

-- RLS Policies for card_labels
CREATE POLICY "Board members can manage labels"
  ON public.card_labels FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.cards c
      JOIN public.lists l ON c.list_id = l.id
      WHERE c.id = card_id AND public.is_board_member(l.board_id, auth.uid())
    )
  );

-- RLS Policies for card_assignees
CREATE POLICY "Board members can manage assignees"
  ON public.card_assignees FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.cards c
      JOIN public.lists l ON c.list_id = l.id
      WHERE c.id = card_id AND public.is_board_member(l.board_id, auth.uid())
    )
  );

-- RLS Policies for comments
CREATE POLICY "Board members can view comments"
  ON public.comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.cards c
      JOIN public.lists l ON c.list_id = l.id
      WHERE c.id = card_id AND public.is_board_member(l.board_id, auth.uid())
    )
  );

CREATE POLICY "Board members can create comments"
  ON public.comments FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.cards c
      JOIN public.lists l ON c.list_id = l.id
      WHERE c.id = card_id AND public.is_board_member(l.board_id, auth.uid())
    )
  );

CREATE POLICY "Users can update own comments"
  ON public.comments FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own comments"
  ON public.comments FOR DELETE
  USING (user_id = auth.uid());

-- RLS Policies for activity_logs
CREATE POLICY "Board members can view activity logs"
  ON public.activity_logs FOR SELECT
  USING (public.is_board_member(board_id, auth.uid()));

CREATE POLICY "Board members can create activity logs"
  ON public.activity_logs FOR INSERT
  WITH CHECK (public.is_board_member(board_id, auth.uid()));

-- Create trigger function for profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_workspaces_updated_at BEFORE UPDATE ON public.workspaces
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_boards_updated_at BEFORE UPDATE ON public.boards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_lists_updated_at BEFORE UPDATE ON public.lists
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cards_updated_at BEFORE UPDATE ON public.cards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.boards;
ALTER PUBLICATION supabase_realtime ADD TABLE public.lists;
ALTER PUBLICATION supabase_realtime ADD TABLE public.cards;
ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.board_members;

-- Set replica identity for realtime
ALTER TABLE public.boards REPLICA IDENTITY FULL;
ALTER TABLE public.lists REPLICA IDENTITY FULL;
ALTER TABLE public.cards REPLICA IDENTITY FULL;
ALTER TABLE public.comments REPLICA IDENTITY FULL;
ALTER TABLE public.activity_logs REPLICA IDENTITY FULL;
ALTER TABLE public.board_members REPLICA IDENTITY FULL;

-- Create indexes for better performance
CREATE INDEX idx_boards_workspace_id ON public.boards(workspace_id);
CREATE INDEX idx_boards_owner_id ON public.boards(owner_id);
CREATE INDEX idx_board_members_board_id ON public.board_members(board_id);
CREATE INDEX idx_board_members_user_id ON public.board_members(user_id);
CREATE INDEX idx_lists_board_id ON public.lists(board_id);
CREATE INDEX idx_lists_position ON public.lists(board_id, position);
CREATE INDEX idx_cards_list_id ON public.cards(list_id);
CREATE INDEX idx_cards_position ON public.cards(list_id, position);
CREATE INDEX idx_card_assignees_card_id ON public.card_assignees(card_id);
CREATE INDEX idx_card_assignees_user_id ON public.card_assignees(user_id);
CREATE INDEX idx_comments_card_id ON public.comments(card_id);
CREATE INDEX idx_activity_logs_board_id ON public.activity_logs(board_id);
CREATE INDEX idx_activity_logs_created_at ON public.activity_logs(board_id, created_at DESC);