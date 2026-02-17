-- Créer la table quotes dans Supabase
CREATE TABLE IF NOT EXISTS quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quote_number TEXT NOT NULL,
  status TEXT NOT NULL,
  issue_date DATE,
  validity_days INTEGER DEFAULT 30,
  expiration_date DATE,
  dossier_id TEXT,
  sales_person TEXT,
  client_reference TEXT,
  client JSONB,
  company JSONB,
  chantier JSONB,
  lots JSONB DEFAULT '[]'::jsonb,
  lines JSONB DEFAULT '[]'::jsonb,
  discount JSONB,
  deposit JSONB,
  payment_schedule JSONB,
  travel_costs NUMERIC(10, 2),
  subtotal_ht NUMERIC(10, 2) DEFAULT 0,
  discount_amount NUMERIC(10, 2) DEFAULT 0,
  total_ht NUMERIC(10, 2) DEFAULT 0,
  vat_breakdown JSONB DEFAULT '[]'::jsonb,
  total_tva NUMERIC(10, 2) DEFAULT 0,
  total_ttc NUMERIC(10, 2) DEFAULT 0,
  deposit_amount NUMERIC(10, 2) DEFAULT 0,
  remaining_amount NUMERIC(10, 2) DEFAULT 0,
  conditions JSONB,
  signature JSONB,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Créer des index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_quotes_user_id ON quotes(user_id);
CREATE INDEX IF NOT EXISTS idx_quotes_quote_number ON quotes(quote_number);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);

-- Activer RLS sur la table quotes
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;

-- Supprimer les politiques existantes si elles existent (pour éviter les erreurs)
DROP POLICY IF EXISTS "Users can view their own quotes" ON quotes;
DROP POLICY IF EXISTS "Users can insert their own quotes" ON quotes;
DROP POLICY IF EXISTS "Users can update their own quotes" ON quotes;
DROP POLICY IF EXISTS "Users can delete their own quotes" ON quotes;

-- Politique pour permettre aux utilisateurs de voir leurs propres devis
CREATE POLICY "Users can view their own quotes"
  ON quotes FOR SELECT
  USING (auth.uid() = user_id);

-- Politique pour permettre aux utilisateurs d'insérer leurs propres devis
CREATE POLICY "Users can insert their own quotes"
  ON quotes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Politique pour permettre aux utilisateurs de mettre à jour leurs propres devis
CREATE POLICY "Users can update their own quotes"
  ON quotes FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Politique pour permettre aux utilisateurs de supprimer leurs propres devis
CREATE POLICY "Users can delete their own quotes"
  ON quotes FOR DELETE
  USING (auth.uid() = user_id);
