-- Créer la table companies dans Supabase
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  legal_form TEXT NOT NULL,
  siret TEXT,
  address TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  city TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  vat_number TEXT,
  rcs_city TEXT,
  capital NUMERIC(10, 2),
  ape_code TEXT,
  logo TEXT,
  website TEXT,
  fax TEXT,
  iban TEXT,
  insurance_decennale JSONB,
  insurance_rc JSONB,
  qualifications JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Créer un index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_companies_user_id ON companies(user_id);

-- Activer RLS sur la table companies
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- Supprimer les politiques existantes si elles existent (pour éviter les erreurs)
DROP POLICY IF EXISTS "Users can view their own companies" ON companies;
DROP POLICY IF EXISTS "Users can insert their own companies" ON companies;
DROP POLICY IF EXISTS "Users can update their own companies" ON companies;
DROP POLICY IF EXISTS "Users can delete their own companies" ON companies;

-- Politique pour permettre aux utilisateurs de voir leurs propres entreprises
CREATE POLICY "Users can view their own companies"
  ON companies FOR SELECT
  USING (auth.uid() = user_id);

-- Politique pour permettre aux utilisateurs d'insérer leurs propres entreprises
CREATE POLICY "Users can insert their own companies"
  ON companies FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Politique pour permettre aux utilisateurs de mettre à jour leurs propres entreprises
CREATE POLICY "Users can update their own companies"
  ON companies FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Politique pour permettre aux utilisateurs de supprimer leurs propres entreprises
CREATE POLICY "Users can delete their own companies"
  ON companies FOR DELETE
  USING (auth.uid() = user_id);
