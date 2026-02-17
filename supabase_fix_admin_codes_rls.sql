-- Script pour corriger les RLS policies de la table admin_codes
-- Exécutez ce script dans le SQL Editor de Supabase

-- 1. Vérifier que la table existe
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'admin_codes'
);

-- 2. Vérifier que RLS est activé
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'admin_codes';

-- 3. Supprimer toutes les politiques existantes pour recommencer proprement
DROP POLICY IF EXISTS "Users can view their own admin codes" ON admin_codes;
DROP POLICY IF EXISTS "Users can insert their own admin codes" ON admin_codes;
DROP POLICY IF EXISTS "Users can update their own admin codes" ON admin_codes;
DROP POLICY IF EXISTS "Users can delete their own admin codes" ON admin_codes;

-- 4. S'assurer que RLS est activé
ALTER TABLE admin_codes ENABLE ROW LEVEL SECURITY;

-- 5. Créer une politique SELECT qui permet aux utilisateurs de voir leurs propres codes
-- Utiliser SECURITY DEFINER pour contourner les problèmes de permissions
CREATE POLICY "Users can view their own admin codes"
  ON admin_codes FOR SELECT
  USING (auth.uid() = user_id);

-- 6. Créer une politique INSERT qui permet aux utilisateurs d'insérer leurs propres codes
CREATE POLICY "Users can insert their own admin codes"
  ON admin_codes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 7. Créer une politique UPDATE qui permet aux utilisateurs de mettre à jour leurs propres codes
CREATE POLICY "Users can update their own admin codes"
  ON admin_codes FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 8. Créer une politique DELETE qui permet aux utilisateurs de supprimer leurs propres codes
CREATE POLICY "Users can delete their own admin codes"
  ON admin_codes FOR DELETE
  USING (auth.uid() = user_id);

-- 9. Vérifier que les politiques ont été créées
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'admin_codes';

-- 10. Tester la requête (remplacer USER_ID par un ID d'utilisateur réel)
-- SELECT * FROM admin_codes WHERE user_id = 'USER_ID';
