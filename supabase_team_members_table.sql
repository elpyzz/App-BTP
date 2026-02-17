-- Créer la table team_members dans Supabase
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL,
  login_code TEXT NOT NULL,
  status TEXT DEFAULT 'actif',
  permissions JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, login_code)
);

-- Créer des index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_login_code ON team_members(login_code);
CREATE INDEX IF NOT EXISTS idx_team_members_status ON team_members(status);

-- Activer RLS sur la table team_members
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- Supprimer les politiques existantes si elles existent (pour éviter les erreurs)
DROP POLICY IF EXISTS "Users can view their own team members" ON team_members;
DROP POLICY IF EXISTS "Users can insert their own team members" ON team_members;
DROP POLICY IF EXISTS "Users can update their own team members" ON team_members;
DROP POLICY IF EXISTS "Users can delete their own team members" ON team_members;

-- Politique pour permettre aux utilisateurs de voir leurs propres membres d'équipe
CREATE POLICY "Users can view their own team members"
  ON team_members FOR SELECT
  USING (auth.uid() = user_id);

-- Politique pour permettre aux utilisateurs d'insérer leurs propres membres d'équipe
CREATE POLICY "Users can insert their own team members"
  ON team_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Politique pour permettre aux utilisateurs de mettre à jour leurs propres membres d'équipe
CREATE POLICY "Users can update their own team members"
  ON team_members FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Politique pour permettre aux utilisateurs de supprimer leurs propres membres d'équipe
CREATE POLICY "Users can delete their own team members"
  ON team_members FOR DELETE
  USING (auth.uid() = user_id);
