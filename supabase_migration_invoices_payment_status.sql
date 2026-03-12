-- Migration: statut de paiement et date d'encaissement pour le module comptabilité
-- Exécuter dans le SQL Editor du dashboard Supabase

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'unpaid'
    CHECK (payment_status IN ('paid', 'unpaid', 'partial')),
  ADD COLUMN IF NOT EXISTS paid_at DATE NULL;

COMMENT ON COLUMN invoices.payment_status IS 'Statut comptable: paid, unpaid, partial';
COMMENT ON COLUMN invoices.paid_at IS 'Date d''encaissement (pour livre de recettes et stats)';

CREATE INDEX IF NOT EXISTS idx_invoices_payment_status ON invoices(payment_status);
CREATE INDEX IF NOT EXISTS idx_invoices_paid_at ON invoices(paid_at);
