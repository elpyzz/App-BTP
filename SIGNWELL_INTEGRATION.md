# Intégration SignWell - Signature Électronique

## 📋 Vue d'ensemble

Cette intégration permet d'envoyer des devis pour signature électronique via SignWell. Le client reçoit un lien par email, signe le devis sur son téléphone ou ordinateur, et le devis passe automatiquement en statut "Signé" dans l'application.

## 🔧 Configuration

### 1. Variables d'environnement

Ajoutez la clé API SignWell dans votre fichier `.env` :

```env
SIGNWELL_API_KEY=ta_clé_ici
```

Pour les tests, vous pouvez aussi ajouter :
```env
SIGNWELL_TEST_MODE=true
```

### 2. Migration de la base de données

Exécutez le script SQL de migration pour ajouter les colonnes nécessaires à la table `quotes` :

```sql
-- Fichier: migrations/add_signwell_columns.sql
```

**Pour Supabase :**
1. Allez dans votre projet Supabase
2. Ouvrez l'éditeur SQL
3. Copiez-collez le contenu du fichier `migrations/add_signwell_columns.sql`
4. Exécutez la requête

Les colonnes ajoutées :
- `signwell_document_id` : ID du document SignWell
- `signwell_signed_pdf_url` : URL du PDF signé
- `date_envoi_signature` : Date d'envoi pour signature
- `date_signature` : Date de signature
- `date_refus` : Date de refus

### 3. Configuration du webhook SignWell

1. Connectez-vous à votre compte SignWell
2. Allez dans **Settings → Webhooks**
3. Ajoutez un nouveau webhook avec :
   - **URL** : `https://ton-domaine.fr/api/webhooks/signwell`
   - **Events** : 
     - `document_completed` (quand le client signe)
     - `document_declined` (quand le client refuse)

## 🚀 Utilisation

### Envoyer un devis pour signature

1. Allez dans **Dossiers → Devis**
2. Cliquez sur le bouton **✍️ Envoyer pour signature** sur un devis
3. Vérifiez les informations pré-remplies :
   - Document : Numéro du devis
   - Destinataire : Nom du client
   - Email : Email du client
4. Personnalisez le message si nécessaire
5. Cliquez sur **Envoyer pour signature →**

### Suivi de la signature

Une fois le devis envoyé :

- **Badge** : Le devis affiche le badge **⏳ En attente de signature** en ambre
- **Page détail** : Un encart de suivi affiche :
  - Email du destinataire
  - Date d'envoi
  - Statut actuel
  - Actions disponibles (copier le lien, renvoyer)

### Après signature

Quand le client signe :

- **Statut** : Le devis passe automatiquement en **✅ Signé**
- **Notification** : L'artisan reçoit un email de confirmation (si configuré)
- **PDF signé** : Disponible en téléchargement depuis la page détail

## 📊 Nouveaux statuts

Les devis peuvent maintenant avoir ces statuts :

- `en_attente_signature` : Envoyé pour signature, en attente
- `signe` : Signé électroniquement par le client
- `refuse` : Refusé par le client

## 🔄 Flux complet

1. **Artisan** clique sur "Envoyer pour signature"
2. **Backend** génère le PDF et l'envoie à SignWell
3. **SignWell** envoie un email au client avec le lien de signature
4. **Client** signe le devis sur son téléphone/ordinateur
5. **SignWell** envoie une notification webhook à l'application
6. **Backend** reçoit le webhook et met à jour le statut du devis
7. **Artisan** voit le devis passer en statut "Signé"

## ⚠️ Mode test

En développement, le mode test est activé automatiquement (`test_mode: true`). Les signatures en mode test ne consomment pas de crédits SignWell.

Pour désactiver le mode test en production, assurez-vous que :
- `NODE_ENV=production`
- `SIGNWELL_TEST_MODE=false` (ou non défini)

## 🐛 Dépannage

### Le client n'a pas d'email
**Erreur** : "Ce client n'a pas d'email renseigné"

**Solution** : Ajoutez l'email du client dans sa fiche client avant d'envoyer pour signature.

### Erreur lors de l'envoi à SignWell
**Erreur** : "Impossible d'envoyer le devis pour signature"

**Vérifications** :
1. La clé API SignWell est correctement configurée dans `.env`
2. La clé API est valide et active
3. Votre compte SignWell a des crédits disponibles
4. La connexion internet est stable

### Le webhook ne fonctionne pas
**Problème** : Le statut ne se met pas à jour après signature

**Vérifications** :
1. L'URL du webhook est correctement configurée dans SignWell
2. L'URL est accessible publiquement (pas de localhost)
3. Le webhook est activé dans SignWell
4. Les événements `document_completed` et `document_declined` sont sélectionnés

## 📝 Notes techniques

- Le PDF est généré côté frontend avec jsPDF
- Le PDF est envoyé à SignWell en base64
- Les données SignWell sont stockées dans Supabase
- Le webhook met à jour le statut via le frontend (pour l'instant)

## 🔐 Sécurité

- La clé API SignWell doit rester secrète (jamais dans le code)
- Utilisez des variables d'environnement
- En production, utilisez HTTPS pour les webhooks
- Validez toujours les données reçues des webhooks
