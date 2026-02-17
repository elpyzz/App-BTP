# Instructions de configuration Supabase - Isolation des données par utilisateur

## 📋 Vue d'ensemble

Tous les scripts SQL ci-dessous doivent être exécutés dans le **SQL Editor** de votre projet Supabase pour garantir que toutes les données sont isolées par utilisateur.

## ✅ Scripts SQL à exécuter

Exécutez les scripts suivants **dans l'ordre** dans le SQL Editor de Supabase :

### 1. Clients (déjà créé)
- **Fichier** : `supabase_clients_table.sql`
- **Description** : Table pour les clients avec RLS policies

### 2. Chantiers
- **Fichier** : `supabase_chantiers_table.sql`
- **Description** : Table pour les chantiers/projets avec RLS policies
- **Important** : Cette table référence `clients`, donc exécutez d'abord le script clients

### 3. Devis (Quotes)
- **Fichier** : `supabase_quotes_table.sql`
- **Description** : Table pour les devis avec RLS policies

### 4. Prospects
- **Fichier** : `supabase_prospects_table.sql`
- **Description** : Table pour les prospects du CRM avec RLS policies

### 5. Entreprises (Companies)
- **Fichier** : `supabase_companies_table.sql`
- **Description** : Table pour les informations d'entreprise avec RLS policies
- **Note** : Un utilisateur ne peut avoir qu'une seule entreprise (contrainte UNIQUE sur user_id)

### 6. Membres d'équipe (Team Members)
- **Fichier** : `supabase_team_members_table.sql`
- **Description** : Table pour les membres d'équipe avec RLS policies

### 7. Invitations d'équipe (Team Invitations)
- **Fichier** : `supabase_team_invitations_table.sql`
- **Description** : Table pour les invitations d'équipe avec RLS policies
- **Important** : Cette table référence `team_members`, donc exécutez d'abord le script team_members
- **Note** : Les invitations peuvent être consultées publiquement par token (pour la page d'invitation)

## 🔒 Sécurité garantie

Après avoir exécuté tous ces scripts :

✅ **Toutes les tables ont RLS activé**
✅ **Toutes les politiques RLS filtrent par `auth.uid() = user_id`**
✅ **Toutes les requêtes SELECT dans le code filtrent explicitement par `user_id`**
✅ **Toutes les insertions incluent `user_id`**
✅ **Toutes les mises à jour et suppressions filtrent par `user_id`**

## 🧪 Test de vérification

Pour vérifier que tout fonctionne :

1. Créez un compte avec l'email `test1@example.com`
2. Créez quelques clients, chantiers, devis, etc.
3. Déconnectez-vous
4. Créez un nouveau compte avec l'email `test2@example.com`
5. Vérifiez que vous ne voyez **aucune** donnée du premier compte

## ⚠️ Notes importantes

- Les scripts peuvent être exécutés plusieurs fois sans problème (ils utilisent `CREATE TABLE IF NOT EXISTS` et `DROP POLICY IF EXISTS`)
- L'ordre d'exécution est important pour les tables avec références (clients → chantiers, team_members → team_invitations)
- Les RLS policies sont la **double sécurité** : même si le code oublie de filtrer, Supabase bloque automatiquement l'accès

## 📝 Modifications apportées au code

Les modifications suivantes ont été apportées pour garantir l'isolation :

1. **`client/src/context/ChantiersContext.tsx`** :
   - `loadClients()` : Ajout de `.eq('user_id', user.id)`
   - `loadChantiers()` : Ajout de `.eq('user_id', user.id)`

2. **Toutes les autres tables** : Déjà sécurisées dans le code (quotes, prospects, companies, team_members)
