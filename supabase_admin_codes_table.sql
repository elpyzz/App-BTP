-- Créer la table admin_codes dans Supabase
CREATE TABLE IF NOT EXISTS admin_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, code)
);

-- Créer un index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_admin_codes_user_id ON admin_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_codes_code ON admin_codes(code);

-- Activer RLS sur la table admin_codes
ALTER TABLE admin_codes ENABLE ROW LEVEL SECURITY;

-- Supprimer les politiques existantes si elles existent (pour éviter les erreurs)
DROP POLICY IF EXISTS "Users can view their own admin codes" ON admin_codes;
DROP POLICY IF EXISTS "Users can insert their own admin codes" ON admin_codes;
DROP POLICY IF EXISTS "Users can update their own admin codes" ON admin_codes;
DROP POLICY IF EXISTS "Users can delete their own admin codes" ON admin_codes;

-- Politique pour permettre aux utilisateurs de voir leurs propres codes admin
CREATE POLICY "Users can view their own admin codes"
  ON admin_codes FOR SELECT
  USING (auth.uid() = user_id);

-- Politique pour permettre aux utilisateurs d'insérer leurs propres codes admin
CREATE POLICY "Users can insert their own admin codes"
  ON admin_codes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Politique pour permettre aux utilisateurs de mettre à jour leurs propres codes admin
CREATE POLICY "Users can update their own admin codes"
  ON admin_codes FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Politique pour permettre aux utilisateurs de supprimer leurs propres codes admin
CREATE POLICY "Users can delete their own admin codes"
  ON admin_codes FOR DELETE
  USING (auth.uid() = user_id);
