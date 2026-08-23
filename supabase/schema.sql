-- Supabase Schema for Flowlist (Document/JSONB Approach)

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tasks Table
CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Projects Table
CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Priorities Table
CREATE TABLE IF NOT EXISTS priorities (
    id TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (id, user_id)
);

-- 4. Rules Table
CREATE TABLE IF NOT EXISTS rules (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Tags Table (Tags are strings in local storage array, we'll store each as a row for easier RLS and querying later if needed, or just store the whole array in a single row)
-- Since tags is just an array of strings `["tag1", "tag2"]`, storing them in a dedicated table means we have to parse and UPSERT strings.
-- Alternatively, we can store user preferences (like tags, animatedBg, theme, savedViews) in a `user_settings` table.
CREATE TABLE IF NOT EXISTS user_settings (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    tags JSONB DEFAULT '[]'::jsonb,
    saved_views JSONB DEFAULT '[]'::jsonb,
    animated_bg BOOLEAN DEFAULT true,
    theme TEXT DEFAULT 'light',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Activities Table
CREATE TABLE IF NOT EXISTS activities (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─── Row Level Security (RLS) ───
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE priorities ENABLE ROW LEVEL SECURITY;
ALTER TABLE rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own tasks" ON tasks;
CREATE POLICY "Users can manage their own tasks" ON tasks FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own projects" ON projects;
CREATE POLICY "Users can manage their own projects" ON projects FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own priorities" ON priorities;
CREATE POLICY "Users can manage their own priorities" ON priorities FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own rules" ON rules;
CREATE POLICY "Users can manage their own rules" ON rules FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own settings" ON user_settings;
CREATE POLICY "Users can manage their own settings" ON user_settings FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own activities" ON activities;
CREATE POLICY "Users can manage their own activities" ON activities FOR ALL USING (auth.uid() = user_id);

-- ─── Triggers for updated_at ───
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_priorities_updated_at ON priorities;
CREATE TRIGGER update_priorities_updated_at BEFORE UPDATE ON priorities FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_rules_updated_at ON rules;
CREATE TRIGGER update_rules_updated_at BEFORE UPDATE ON rules FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_settings_updated_at ON user_settings;
CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON user_settings FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ─── MIGRATION: Project Sharing & Realtime ───

-- 1. Create Profiles table (to map emails to user_ids)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    name TEXT
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Profiles are readable by everyone" ON public.profiles;
CREATE POLICY "Profiles are readable by everyone" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- 2. Trigger to populate profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 3. Project Members Table
CREATE TABLE IF NOT EXISTS project_members (
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    PRIMARY KEY (project_id, user_id)
);
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;

-- 4. Add project_id to tasks
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS project_id TEXT;
-- Extract existing project_id from jsonb
UPDATE tasks SET project_id = data->>'projectId' WHERE data->>'projectId' IS NOT NULL;

-- 5. Update RLS Policies for Sharing
-- Drop old policies
DROP POLICY IF EXISTS "Users can manage their own projects" ON projects;
DROP POLICY IF EXISTS "Users can manage their own tasks" ON tasks;

-- New Projects Policy: Owner OR Member
DROP POLICY IF EXISTS "Users can view and edit shared projects" ON projects;
CREATE POLICY "Users can view and edit shared projects" ON projects
FOR ALL USING (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM project_members WHERE project_members.project_id = projects.id AND project_members.user_id = auth.uid())
);

-- New Tasks Policy: Owner OR Project Member
DROP POLICY IF EXISTS "Users can view and edit shared tasks" ON tasks;
CREATE POLICY "Users can view and edit shared tasks" ON tasks
FOR ALL USING (
    auth.uid() = user_id OR 
    (project_id IS NOT NULL AND EXISTS (SELECT 1 FROM project_members WHERE project_members.project_id = tasks.project_id AND project_members.user_id = auth.uid()))
);

-- Members can see other members of projects they have access to
DROP POLICY IF EXISTS "Users can see project members" ON project_members;
CREATE POLICY "Users can see project members" ON project_members
FOR SELECT USING (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = project_members.project_id AND projects.user_id = auth.uid()) OR
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM project_members pm2 WHERE pm2.project_id = project_members.project_id AND pm2.user_id = auth.uid())
);
-- Only project owners can add members
DROP POLICY IF EXISTS "Owners can add members" ON project_members;
CREATE POLICY "Owners can add members" ON project_members
FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = project_members.project_id AND projects.user_id = auth.uid())
);
-- Only project owners or the user themselves can remove members
DROP POLICY IF EXISTS "Owners or self can remove members" ON project_members;
CREATE POLICY "Owners or self can remove members" ON project_members
FOR DELETE USING (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM projects WHERE projects.id = project_members.project_id AND projects.user_id = auth.uid())
);

-- 6. RPC function to share a project by email
CREATE OR REPLACE FUNCTION share_project_by_email(p_email TEXT, p_project_id TEXT)
RETURNS void AS $$
DECLARE
    target_user_id UUID;
BEGIN
    -- Only allow if caller is the owner of the project
    IF NOT EXISTS (SELECT 1 FROM projects WHERE id = p_project_id AND user_id = auth.uid()) THEN
        RAISE EXCEPTION 'Not authorized to share this project';
    END IF;
    
    -- Find the user by email
    SELECT id INTO target_user_id FROM public.profiles WHERE email = p_email LIMIT 1;
    
    IF target_user_id IS NULL THEN
        RAISE EXCEPTION 'User not found';
    END IF;
    
    -- Insert member, ignore if already exists
    INSERT INTO project_members (project_id, user_id) VALUES (p_project_id, target_user_id) ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Enable Realtime
begin;
  drop publication if exists supabase_realtime;
  create publication supabase_realtime;
commit;
alter publication supabase_realtime add table tasks;
alter publication supabase_realtime add table projects;
alter publication supabase_realtime add table project_members;
