-- Créer la table team_invitations dans Supabase
CREATE TABLE IF NOT EXISTS team_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_member_id UUID REFERENCES team_members(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Créer des index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_team_invitations_user_id ON team_invitations(user_id);
CREATE INDEX IF NOT EXISTS idx_team_invitations_token ON team_invitations(token);
CREATE INDEX IF NOT EXISTS idx_team_invitations_team_member_id ON team_invitations(team_member_id);

-- Activer RLS sur la table team_invitations
ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;

-- Supprimer les politiques existantes si elles existent (pour éviter les erreurs)
DROP POLICY IF EXISTS "Users can view their own team invitations" ON team_invitations;
DROP POLICY IF EXISTS "Users can insert their own team invitations" ON team_invitations;
DROP POLICY IF EXISTS "Users can update their own team invitations" ON team_invitations;
DROP POLICY IF EXISTS "Users can delete their own team invitations" ON team_invitations;
DROP POLICY IF EXISTS "Anyone can view invitations by token" ON team_invitations;
DROP POLICY IF EXISTS "Anyone can update invitations by token" ON team_invitations;

-- Politique pour permettre aux utilisateurs de voir leurs propres invitations
CREATE POLICY "Users can view their own team invitations"
  ON team_invitations FOR SELECT
  USING (auth.uid() = user_id);

-- Politique pour permettre à n'importe qui de voir une invitation par token (pour la page d'invitation publique)
CREATE POLICY "Anyone can view invitations by token"
  ON team_invitations FOR SELECT
  USING (true);

-- Politique pour permettre aux utilisateurs d'insérer leurs propres invitations
CREATE POLICY "Users can insert their own team invitations"
  ON team_invitations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Politique pour permettre à n'importe qui de mettre à jour une invitation par token (pour marquer comme utilisée)
CREATE POLICY "Anyone can update invitations by token"
  ON team_invitations FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Politique pour permettre aux utilisateurs de supprimer leurs propres invitations
CREATE POLICY "Users can delete their own team invitations"
  ON team_invitations FOR DELETE
  USING (auth.uid() = user_id);
