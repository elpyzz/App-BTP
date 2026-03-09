-- Ajouter la colonne signature à la table companies (signature artisan en base64)
ALTER TABLE companies ADD COLUMN IF NOT EXISTS signature TEXT;

COMMENT ON COLUMN companies.signature IS 'Image de la signature de l''artisan (data URL base64 PNG)';
