-- Créer la table invoices dans Supabase
CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'draft', -- draft, sent, paid, overdue, cancelled
  issue_date DATE NOT NULL,
  sale_date DATE, -- Date de vente/prestation
  execution_period_start DATE, -- Période d'exécution début
  execution_period_end DATE, -- Période d'exécution fin
  due_date DATE, -- Date d'échéance paiement
  payment_delay_days INTEGER DEFAULT 30, -- Délai de paiement en jours
  
  -- Références
  quote_id TEXT, -- Référence au devis d'origine (sans foreign key pour éviter erreurs si table quotes n'existe pas)
  quote_number TEXT, -- Numéro du devis référencé
  purchase_order_number TEXT, -- Numéro bon de commande
  internal_reference TEXT, -- Référence interne
  
  -- Entités (JSONB comme pour quotes)
  client JSONB NOT NULL,
  company JSONB NOT NULL,
  chantier JSONB NOT NULL,
  
  -- Contenu
  lines JSONB DEFAULT '[]'::jsonb,
  lots JSONB DEFAULT '[]'::jsonb,
  
  -- Financier
  discount JSONB,
  travel_costs NUMERIC(10, 2) DEFAULT 0,
  subtotal_ht NUMERIC(10, 2) DEFAULT 0,
  discount_amount NUMERIC(10, 2) DEFAULT 0,
  total_ht NUMERIC(10, 2) DEFAULT 0,
  vat_breakdown JSONB DEFAULT '[]'::jsonb, -- Détail par taux TVA
  total_tva NUMERIC(10, 2) DEFAULT 0,
  total_ttc NUMERIC(10, 2) DEFAULT 0,
  
  -- Acomptes
  deposits_paid NUMERIC(10, 2) DEFAULT 0, -- Acomptes déjà payés
  remaining_amount NUMERIC(10, 2) DEFAULT 0, -- Reste à payer
  
  -- Paiement
  payment_terms TEXT, -- Conditions de paiement
  payment_methods JSONB, -- Moyens de paiement
  
  -- Mentions légales
  late_payment_penalties TEXT, -- Pénalités de retard
  recovery_fee NUMERIC(10, 2) DEFAULT 40, -- Indemnité forfaitaire recouvrement (40€ B2B)
  special_vat_mention TEXT, -- Mention TVA spéciale (franchise, autoliquidation)
  
  -- Métadonnées
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_quote_id ON invoices(quote_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);

-- RLS
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Supprimer les politiques existantes si elles existent (pour éviter les erreurs)
DROP POLICY IF EXISTS "Users can view their own invoices" ON invoices;
DROP POLICY IF EXISTS "Users can insert their own invoices" ON invoices;
DROP POLICY IF EXISTS "Users can update their own invoices" ON invoices;
DROP POLICY IF EXISTS "Users can delete their own invoices" ON invoices;

-- Politique pour permettre aux utilisateurs de voir leurs propres factures
CREATE POLICY "Users can view their own invoices"
  ON invoices FOR SELECT
  USING (auth.uid() = user_id);

-- Politique pour permettre aux utilisateurs d'insérer leurs propres factures
CREATE POLICY "Users can insert their own invoices"
  ON invoices FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Politique pour permettre aux utilisateurs de mettre à jour leurs propres factures
CREATE POLICY "Users can update their own invoices"
  ON invoices FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Politique pour permettre aux utilisateurs de supprimer leurs propres factures
CREATE POLICY "Users can delete their own invoices"
  ON invoices FOR DELETE
  USING (auth.uid() = user_id);
