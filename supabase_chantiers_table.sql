-- Créer la table chantiers dans Supabase
CREATE TABLE IF NOT EXISTS chantiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nom TEXT NOT NULL,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  client_name TEXT,
  date_debut DATE,
  duree TEXT,
  statut TEXT DEFAULT 'planifié',
  images JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Créer des index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_chantiers_user_id ON chantiers(user_id);
CREATE INDEX IF NOT EXISTS idx_chantiers_client_id ON chantiers(client_id);

-- Activer RLS sur la table chantiers
ALTER TABLE chantiers ENABLE ROW LEVEL SECURITY;

-- Supprimer les politiques existantes si elles existent (pour éviter les erreurs)
DROP POLICY IF EXISTS "Users can view their own chantiers" ON chantiers;
DROP POLICY IF EXISTS "Users can insert their own chantiers" ON chantiers;
DROP POLICY IF EXISTS "Users can update their own chantiers" ON chantiers;
DROP POLICY IF EXISTS "Users can delete their own chantiers" ON chantiers;

-- Politique pour permettre aux utilisateurs de voir leurs propres chantiers
CREATE POLICY "Users can view their own chantiers"
  ON chantiers FOR SELECT
  USING (auth.uid() = user_id);

-- Politique pour permettre aux utilisateurs d'insérer leurs propres chantiers
CREATE POLICY "Users can insert their own chantiers"
  ON chantiers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Politique pour permettre aux utilisateurs de mettre à jour leurs propres chantiers
CREATE POLICY "Users can update their own chantiers"
  ON chantiers FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Politique pour permettre aux utilisateurs de supprimer leurs propres chantiers
CREATE POLICY "Users can delete their own chantiers"
  ON chantiers FOR DELETE
  USING (auth.uid() = user_id);
