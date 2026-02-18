# Corrections Requises

## Problème 1 : Impossible d'ajouter des clients

**Symptôme** : La requête Supabase pour insérer un client ne retourne jamais (timeout après 5 secondes).

**Cause probable** : La table `clients` n'existe pas dans Supabase ou les RLS policies ne sont pas correctement configurées.

**Solution** :
1. Ouvrez le SQL Editor dans votre tableau de bord Supabase
2. Exécutez le script `supabase_clients_table.sql` qui se trouve à la racine du projet
3. Vérifiez que la table `clients` existe dans l'onglet "Table Editor" de Supabase

## Problème 2 : Redirection après 2 refreshs

**Symptôme** : Après 2 refreshs rapides, l'utilisateur est redirigé vers la page de connexion.

**Cause probable** : La session Supabase n'est pas persistée correctement dans localStorage.

**Solution** : La configuration du stockage de session a été améliorée dans `supabaseClient.ts`. Si le problème persiste, vérifiez :
1. Que le localStorage n'est pas désactivé dans votre navigateur
2. Que la clé de stockage `sb-vyedinahtdayjhsfafzx-auth-token` existe dans localStorage après connexion
