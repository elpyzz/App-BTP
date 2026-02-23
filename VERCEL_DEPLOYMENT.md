# Guide de déploiement sur Vercel

Ce guide vous explique comment déployer votre application sur Vercel avec les fonctions serverless.

## 📋 Prérequis

1. Un compte Vercel (gratuit) : https://vercel.com
2. Votre projet connecté à un dépôt Git (GitHub, GitLab, ou Bitbucket)

## 🚀 Étapes de déploiement

### 1. Connecter votre projet à Vercel

1. Allez sur https://vercel.com
2. Cliquez sur "Add New Project"
3. Importez votre dépôt Git
4. Vercel détectera automatiquement la configuration

### 2. Configurer les variables d'environnement

**IMPORTANT** : Vous devez configurer toutes ces variables dans Vercel :

1. Dans votre projet Vercel, allez dans **Settings** → **Environment Variables**
2. Ajoutez les variables suivantes :

#### Variables obligatoires :

```
OPENAI_API_KEY=votre_cle_openai_ici
RESEND_API_KEY=votre_cle_resend_ici
RESEND_FROM_EMAIL=votre_email_verifie@votredomaine.com
```

#### Variables Supabase (si vous utilisez Supabase) :

```
SUPABASE_URL=votre_url_supabase
SUPABASE_ANON_KEY=votre_cle_anon_supabase
```

#### Autres variables (selon votre configuration) :

```
DATABASE_URL=votre_url_database
NODE_ENV=production
```

**⚠️ Important** :
- Pour chaque variable, sélectionnez les environnements : **Production**, **Preview**, et **Development**
- Cliquez sur "Save" après chaque ajout

### 3. Configurer le domaine d'email Resend

1. Allez sur https://resend.com
2. Vérifiez votre domaine ou utilisez le domaine de test `onboarding@resend.dev`
3. Mettez à jour `RESEND_FROM_EMAIL` dans Vercel avec votre email vérifié

### 4. Déployer

1. Vercel déploiera automatiquement à chaque push sur votre branche principale
2. Ou cliquez sur "Deploy" dans le dashboard Vercel
3. Attendez la fin du déploiement (2-3 minutes)

### 5. Vérifier le déploiement

Une fois déployé, testez :

1. **Vérifier Resend** : Visitez `https://votre-domaine.vercel.app/api/resend/status`
   - Devrait retourner `{"configured": true}`

2. **Tester l'estimation** : Utilisez la fonctionnalité d'estimation dans l'application
   - Les images sont maintenant envoyées en base64 (compatible Vercel)

3. **Tester l'envoi d'email** : Essayez d'envoyer un devis/facture par email

## 🔧 Configuration technique

### Fonctions serverless créées

Les routes API suivantes sont maintenant des fonctions serverless Vercel :

- `api/resend/status.ts` → `/api/resend/status` (GET)
- `api/send-email.ts` → `/api/send-email` (POST)
- `api/estimate.ts` → `/api/estimate` (POST)

### Limitations Vercel

- **Taille maximale des fonctions** : 50 MB (compilé)
- **Durée maximale d'exécution** : 60 secondes (configuré dans `vercel.json`)
- **Taille maximale du body** : 4.5 MB pour les requêtes
- **Fichiers temporaires** : Utilisez `/tmp` (seul répertoire accessible en écriture)

### Modifications apportées

1. **Client** : Les images sont maintenant envoyées en base64 dans le body JSON (au lieu de FormData)
2. **API** : Les fonctions serverless acceptent les images en base64
3. **Configuration** : `vercel.json` configuré pour les fonctions serverless

## 🐛 Dépannage

### Erreur "Function not found"

- Vérifiez que les fichiers sont dans le dossier `api/`
- Vérifiez que `vercel.json` est correctement configuré

### Erreur "Environment variable not found"

- Vérifiez que toutes les variables sont configurées dans Vercel
- Redéployez après avoir ajouté des variables

### Erreur "Request timeout"

- Les fonctions ont une limite de 60 secondes
- Pour les analyses longues, envisagez d'utiliser des webhooks ou une queue

### Images ne s'envoient pas

- Vérifiez que les images sont bien converties en base64 côté client
- Vérifiez la taille des images (limite 4.5 MB pour le body total)

## 📝 Notes importantes

1. **En local** : L'application continue d'utiliser Express (pas de changement)
2. **Sur Vercel** : Les fonctions serverless prennent automatiquement le relais
3. **Variables d'environnement** : Ne jamais commiter le fichier `.env` dans Git
4. **Domaine personnalisé** : Vous pouvez configurer un domaine personnalisé dans Vercel

## ✅ Checklist de déploiement

- [ ] Projet connecté à Vercel
- [ ] Toutes les variables d'environnement configurées
- [ ] Email Resend vérifié
- [ ] Déploiement réussi
- [ ] Test de `/api/resend/status` OK
- [ ] Test d'estimation OK
- [ ] Test d'envoi d'email OK

## 🆘 Support

Si vous rencontrez des problèmes :

1. Vérifiez les logs dans Vercel : **Deployments** → **Functions** → **View Function Logs**
2. Vérifiez la console du navigateur pour les erreurs côté client
3. Vérifiez que toutes les dépendances sont installées (`npm install`)

---

**Félicitations !** Votre application est maintenant prête pour la production sur Vercel ! 🎉
