-- Migration: Ajout des colonnes SignWell pour la signature électronique
-- Date: 2026-03-08
-- Description: Ajoute les colonnes nécessaires pour l'intégration SignWell

-- Ajouter les colonnes à la table quotes
ALTER TABLE quotes 
ADD COLUMN IF NOT EXISTS signwell_document_id TEXT,
ADD COLUMN IF NOT EXISTS signwell_signed_pdf_url TEXT,
ADD COLUMN IF NOT EXISTS date_envoi_signature TIMESTAMP,
ADD COLUMN IF NOT EXISTS date_signature TIMESTAMP,
ADD COLUMN IF NOT EXISTS date_refus TIMESTAMP;

-- Ajouter un index sur signwell_document_id pour les recherches rapides
CREATE INDEX IF NOT EXISTS idx_quotes_signwell_document_id ON quotes(signwell_document_id);

-- Commentaires pour la documentation
COMMENT ON COLUMN quotes.signwell_document_id IS 'ID du document SignWell pour ce devis';
COMMENT ON COLUMN quotes.signwell_signed_pdf_url IS 'URL du PDF signé récupéré depuis SignWell';
COMMENT ON COLUMN quotes.date_envoi_signature IS 'Date et heure d''envoi du devis pour signature';
COMMENT ON COLUMN quotes.date_signature IS 'Date et heure de signature du devis par le client';
COMMENT ON COLUMN quotes.date_refus IS 'Date et heure de refus de signature par le client';
