-- Script pour supprimer complètement tous les utilisateurs de Supabase
-- ATTENTION: Ce script supprime TOUS les utilisateurs et toutes leurs données associées
-- Exécutez ce script dans le SQL Editor de Supabase

-- 1. Supprimer tous les codes admin
DELETE FROM admin_codes;

-- 2. Supprimer tous les clients
DELETE FROM clients;

-- 3. Supprimer tous les membres d'équipe
DELETE FROM team_members;

-- 4. Supprimer tous les utilisateurs de l'authentification
-- Note: Cette commande nécessite d'être exécutée avec les privilèges appropriés
-- Si vous avez des erreurs de permissions, utilisez le dashboard Supabase pour supprimer les utilisateurs manuellement
DELETE FROM auth.users;

-- Alternative si DELETE FROM auth.users ne fonctionne pas:
-- Utilisez le dashboard Supabase: Authentication > Users > Sélectionnez tous > Delete

-- 5. Vérifier qu'il ne reste plus d'utilisateurs
SELECT COUNT(*) as remaining_users FROM auth.users;
