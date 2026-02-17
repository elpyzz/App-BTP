-- Créer la table prospects dans Supabase
CREATE TABLE IF NOT EXISTS prospects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  company TEXT,
  notes TEXT,
  status TEXT NOT NULL,
  column_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Créer des index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_prospects_user_id ON prospects(user_id);
CREATE INDEX IF NOT EXISTS idx_prospects_status ON prospects(status);
CREATE INDEX IF NOT EXISTS idx_prospects_column_id ON prospects(column_id);

-- Activer RLS sur la table prospects
ALTER TABLE prospects ENABLE ROW LEVEL SECURITY;

-- Supprimer les politiques existantes si elles existent (pour éviter les erreurs)
DROP POLICY IF EXISTS "Users can view their own prospects" ON prospects;
DROP POLICY IF EXISTS "Users can insert their own prospects" ON prospects;
DROP POLICY IF EXISTS "Users can update their own prospects" ON prospects;
DROP POLICY IF EXISTS "Users can delete their own prospects" ON prospects;

-- Politique pour permettre aux utilisateurs de voir leurs propres prospects
CREATE POLICY "Users can view their own prospects"
  ON prospects FOR SELECT
  USING (auth.uid() = user_id);

-- Politique pour permettre aux utilisateurs d'insérer leurs propres prospects
CREATE POLICY "Users can insert their own prospects"
  ON prospects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Politique pour permettre aux utilisateurs de mettre à jour leurs propres prospects
CREATE POLICY "Users can update their own prospects"
  ON prospects FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Politique pour permettre aux utilisateurs de supprimer leurs propres prospects
CREATE POLICY "Users can delete their own prospects"
  ON prospects FOR DELETE
  USING (auth.uid() = user_id);
