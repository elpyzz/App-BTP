-- Ajouter la colonne logo à la table companies si elle n'existe pas (logo entreprise pour devis/factures)
ALTER TABLE companies ADD COLUMN IF NOT EXISTS logo TEXT;

COMMENT ON COLUMN companies.logo IS 'Logo de l''entreprise (data URL base64) affiché sur devis et factures';
