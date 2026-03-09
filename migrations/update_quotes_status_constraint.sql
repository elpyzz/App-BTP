-- Migration: Mise à jour de la contrainte CHECK pour les statuts de devis
-- Date: 2026-03-08
-- Description: Ajoute les nouveaux statuts SignWell à la contrainte quotes_status_check

-- Supprimer l'ancienne contrainte CHECK
ALTER TABLE quotes DROP CONSTRAINT IF EXISTS quotes_status_check;

-- Recréer la contrainte CHECK avec tous les statuts (anciens + nouveaux)
ALTER TABLE quotes 
ADD CONSTRAINT quotes_status_check 
CHECK (status IN (
  'draft',                    -- Brouillon
  'sent',                     -- Envoyé
  'accepted',                 -- Accepté
  'rejected',                 -- Refusé
  'expired',                  -- Expiré
  'en_attente_signature',     -- En attente de signature électronique
  'signe',                    -- Signé électroniquement
  'refuse'                    -- Refusé de signer
));

-- Commentaire pour la documentation
COMMENT ON CONSTRAINT quotes_status_check ON quotes IS 'Contrainte vérifiant que le statut du devis est valide (inclut les statuts SignWell)';
