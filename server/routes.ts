import dotenv from 'dotenv';
import path from 'path';
// Charger dotenv avec le chemin explicite
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import express, { type Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import OpenAI from 'openai';
import multer from 'multer';
import sharp from 'sharp';
import Levenshtein from 'fast-levenshtein';
import { Resend } from 'resend';

// Variable pour OpenAI - sera initialisée dans registerRoutes
let openai: OpenAI;

// Configuration Multer pour l'upload d'images
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { 
    fileSize: 15 * 1024 * 1024, // 15MB max
    files: 10 // Max 10 images
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Format d\'image non supporté'), false);
    }
  }
});

// Prompt système ultra-précis
const PROMPT_SYSTEME_OPTIMISE = `Tu es un expert en estimation BTP français avec 20 ans d'expérience. 
Tu connais parfaitement:
- Les prix matériaux 2024-2025 par région
- Les temps de pose réels selon le métier
- Les coûts de main d'œuvre par région
- Les marges standards par type de chantier
- Les normes françaises (DTU, NF, Qualibat)

RÈGLES ABSOLUES:
1. Analyse TRÈS précisément chaque photo
2. Utilise les prix des matériaux fournis quand ils correspondent EXACTEMENT
3. Pour les matériaux non fournis, utilise les prix de marché français actuels
4. Calcule les quantités au m² près
5. Applique les coefficients de perte réels (5-15% selon matériau)
6. Inclus TOUS les coûts cachés (préparation, nettoyage, finitions)
7. Réponds EXCLUSIVEMENT en JSON valide, sans markdown

FORMAT RÉPONSE OBLIGATOIRE:
{
  "tempsRealisation": "X jours ouvrés",
  "materiaux": [
    {
      "nom": "Nom exact du matériau",
      "quantite": nombre,
      "unite": "m²|kg|L|unité",
      "prixUnitaire": nombre,
      "prixTotal": nombre,
      "coefficientPerte": nombre,
      "quantiteAvecPerte": nombre
    }
  ],
  "nombreOuvriers": nombre,
  "coutTotal": nombre,
  "detailsCouts": {
    "materiaux": nombre,
    "mainOeuvre": nombre,
    "transport": nombre,
    "outillage": nombre,
    "gestionDechets": nombre
  },
  "marge": nombre,
  "benefice": nombre,
  "recommandations": ["rec1", "rec2"],
  "difficulteChantier": "faible|moyenne|élevée",
  "facteursPrix": ["facteur1", "facteur2"]
}`;

// Fonction d'optimisation d'images avec Sharp
async function optimizeImages(files: Express.Multer.File[]): Promise<string[]> {
  const optimizedImages = await Promise.all(
    files.map(async (file, index) => {
      try {
        const optimized = await sharp(file.buffer)
          .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 85 })
          .toBuffer();
        return optimized.toString('base64');
      } catch (error) {
        console.error('Erreur optimisation image:', error);
        // Fallback: utiliser l'image originale en base64
        return file.buffer.toString('base64');
      }
    })
  );
  return optimizedImages;
}

// Fonction de construction du prompt utilisateur
function buildPromptUtilisateur(
  surface: string,
  metier: string,
  materiaux: string,
  localisation: string,
  delai: string,
  existingMaterials: any[]
): string {
  const materiauxDisponibles = existingMaterials.map((mat: any) => 
    `- ${mat.name} (${mat.category}): ${mat.unitPrice}€/${mat.unit}`
  ).join('\n');
  
  return `
CHANTIER À ANALYSER:
Surface: ${surface} m²
Métier: ${metier}
Matériaux mentionnés: ${materiaux}
Localisation: ${localisation}
Délai souhaité: ${delai}

MATÉRIAUX DISPONIBLES AVEC PRIX RÉELS:
${materiauxDisponibles || 'Aucun matériau enregistré'}

INSTRUCTIONS SPÉCIFIQUES:
- Analyse les photos pour identifier le type exact de travaux
- Pour ${metier}, applique les temps de pose standards français
- Région ${localisation}: ajuste les prix selon l'indice BT01
- Délai ${delai}: applique un coefficient d'urgence si nécessaire
- Utilise IMPÉRATIVEMENT les prix des matériaux disponibles quand ils correspondent
- Calcule précisément les quantités selon la surface ${surface} m²
- Ajoute les matériaux complémentaires nécessaires (primaire, joint, etc.)
`;
}

// Fonction de parsing JSON ultra-robuste
function parseGPTResponse(content: string | null | undefined): any {
  if (!content) {
    throw new Error('Réponse GPT vide');
  }
  
  let jsonStr = content.trim();
  
  // Suppression du markdown si présent
  jsonStr = jsonStr.replace(/^```json\s*/i, '').replace(/```$/i, '');
  jsonStr = jsonStr.replace(/^```\s*/, '').replace(/```$/, '');
  
  // Extraction du JSON si mélangé avec du texte
  const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    jsonStr = jsonMatch[0];
  }
  
  try {
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error('Erreur parsing JSON:', error);
    console.log('Contenu brut:', content);
    
    // Tentative de réparation automatique
    let repaired = jsonStr
      .replace(/,(\s*[}\]])/g, '$1') // Virgules traînantes
      .replace(/([{,]\s*)(\w+):/g, '$1"$2":'); // Clés sans guillemets (basique)
    
    try {
      return JSON.parse(repaired);
    } catch (repairError) {
      throw new Error(`Impossible de parser la réponse GPT: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  }
}

// Fonction d'enrichissement avec matériaux existants
function enrichirAvecMateriauxExistants(estimation: any, existingMaterials: any[]): any {
  if (!estimation.materiaux || !Array.isArray(estimation.materiaux)) {
    return estimation;
  }
  
  const enrichedMateriaux = estimation.materiaux.map((mat: any) => {
    // Normaliser le nom pour le matching
    const normalizeString = (str: string) => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w\s]/g, '').trim();
    
    let bestMatch: any = null;
    let bestScore = 0;
    
    for (const existing of existingMaterials) {
      const name1 = normalizeString(mat.nom);
      const name2 = normalizeString(existing.name);
      
      // Score par nom
      let nameScore = 0;
      if (name1 === name2) {
        nameScore = 1.0;
      } else if (name1.includes(name2) || name2.includes(name1)) {
        nameScore = 0.9;
      } else {
        const distance = Levenshtein.get(name1, name2);
        const maxLength = Math.max(name1.length, name2.length);
        if (maxLength > 0) {
          nameScore = Math.max(0, (maxLength - distance) / maxLength);
        }
      }
      
      // Score par unité
      const unitScore = mat.unite?.toLowerCase() === existing.unit?.toLowerCase() ? 1 : 0;
      
      const totalScore = (nameScore * 0.8) + (unitScore * 0.2);
      
      if (totalScore > bestScore && totalScore >= 0.7) {
        bestScore = totalScore;
        const quantite = typeof mat.quantite === 'number' ? mat.quantite : parseFloat(mat.quantite.toString().replace(',', '.')) || 0;
        bestMatch = {
          material: existing,
          confidence: totalScore,
          prixCalcule: quantite * existing.unitPrice
        };
      }
    }
    
    if (bestMatch) {
      return {
        ...mat,
        prixReel: true,
        materialId: bestMatch.material.id,
        confidence: bestMatch.confidence,
        prixUnitaire: bestMatch.material.unitPrice,
        prixTotal: bestMatch.prixCalcule
      };
    } else {
      return {
        ...mat,
        prixReel: false,
        needsAdding: true
      };
    }
  });
  
  // Recalculer le coût total des matériaux
  const totalMateriaux = enrichedMateriaux.reduce((sum: number, mat: any) => sum + (mat.prixTotal || 0), 0);
  
  return {
    ...estimation,
    materiaux: enrichedMateriaux,
    detailsCouts: {
      ...estimation.detailsCouts,
      materiaux: totalMateriaux
    }
  };
}

export async function registerRoutes(app: Express): Promise<Server> {
  console.log('[Routes] registerRoutes called - about to register routes');
  
  // #region agent log
  fetch('http://127.0.0.1:7245/ingest/92008ec0-4865-46b1-a863-69afada2c59a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server/routes.ts:252',message:'registerRoutes entry',data:{hasOpenAI:!!openai,envApiKeyExists:!!process.env.OPENAI_API_KEY},timestamp:Date.now(),runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  
  // Créer un router Express pour les routes API
  const apiRouter = express.Router();
  
  // OpenAI sera initialisé de manière lazy dans la route /api/estimate
  // Cela permet au serveur de démarrer même si OPENAI_API_KEY n'est pas définie
  
  // put application routes here
  // prefix all routes with /api

  // use storage to perform CRUD operations on the storage interface
  // e.g. storage.insertUser(user) or storage.getUserByUsername(username)
  
  // Route POST /estimate
  // Middleware pour capturer les erreurs multer
  apiRouter.post('/estimate', (req, res, next) => {
    next();
  }, upload.array('images', 10), async (req, res) => {
    try {
      const { surface, metier, materiaux, localisation, delai, existingMaterials } = req.body;
      const files = req.files as Express.Multer.File[];
      
      // Validation stricte
      if (!files || files.length === 0) {
        return res.status(400).json({ error: 'Au moins une image est requise' });
      }
      
      if (!surface || !metier) {
        return res.status(400).json({ error: 'Surface et métier sont requis' });
      }
      
      // Optimisation des images avec Sharp
      const optimizedImages = await optimizeImages(files);
      // Parse existingMaterials
      let materialsList: any[] = [];
      try {
        materialsList = existingMaterials ? JSON.parse(existingMaterials) : [];
      } catch (e) {
        console.warn('Erreur parsing existingMaterials:', e);
      }
      
      // Construction du prompt
      const userPrompt = buildPromptUtilisateur(surface, metier, materiaux || '', localisation || '', delai || '', materialsList);
      
      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/92008ec0-4865-46b1-a863-69afada2c59a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server/routes.ts:305',message:'Before OpenAI initialization',data:{envApiKey:!!process.env.OPENAI_API_KEY,hasOpenAI:!!openai},timestamp:Date.now(),runId:'run2',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      
      // Initialisation lazy d'OpenAI - seulement quand nécessaire
      const envApiKey = process.env.OPENAI_API_KEY;
      if (!envApiKey) {
        return res.status(500).json({ 
          error: 'OPENAI_API_KEY n\'est pas définie dans les variables d\'environnement. Veuillez créer un fichier .env avec OPENAI_API_KEY=votre_clé' 
        });
      }
      
      // FORCER la recréation de l'instance OpenAI avec la clé de l'environnement à chaque appel
      // Cela garantit qu'on utilise toujours la clé la plus récente de .env
      openai = new OpenAI({
        apiKey: envApiKey,
      });
      
      // Appel OpenAI avec prompt ultra-précis
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // Version la plus récente
        messages: [
          {
            role: "system",
            content: PROMPT_SYSTEME_OPTIMISE
          },
          {
            role: "user",
            content: [
              { type: "text", text: userPrompt },
              ...optimizedImages.map(img => ({
                type: "image_url" as const,
                image_url: { url: `data:image/jpeg;base64,${img}` }
              }))
            ]
          }
        ],
        max_tokens: 2000,
        temperature: 0.1 // Très faible pour la précision
      });
      // Parsing JSON ultra-robuste
      const content = response.choices[0].message.content;
      let estimation = parseGPTResponse(content);
      // Enrichissement avec matériaux existants
      estimation = enrichirAvecMateriauxExistants(estimation, materialsList);
      
      res.json(estimation);
      
    } catch (error: any) {
      console.error('Erreur lors de l\'analyse:', error);
      
      // Gestion d'erreurs spécifiques avec messages clairs
      let errorMessage = 'Erreur lors de l\'analyse';
      let statusCode = 500;
      let userFriendlyMessage = 'Une erreur est survenue lors de l\'analyse.';
      
      const errorMsg = error?.message || '';
      
      if (errorMsg.includes('401') || errorMsg.includes('Incorrect API key')) {
        errorMessage = 'Clé API OpenAI invalide';
        userFriendlyMessage = 'La clé API OpenAI est invalide. Veuillez vérifier votre configuration dans le fichier .env.';
        statusCode = 401;
      } else if (errorMsg.includes('429') || errorMsg.includes('quota') || errorMsg.includes('exceeded')) {
        errorMessage = 'Quota OpenAI dépassé';
        userFriendlyMessage = 'Votre compte OpenAI a atteint sa limite de crédits. Veuillez ajouter des crédits sur https://platform.openai.com/account/billing et réessayer.';
        statusCode = 429;
      } else if (errorMsg.includes('rate limit') || errorMsg.includes('rate_limit')) {
        errorMessage = 'Limite de requêtes atteinte';
        userFriendlyMessage = 'Vous avez atteint la limite de requêtes. Veuillez patienter quelques minutes avant de réessayer.';
        statusCode = 429;
      } else if (errorMsg.includes('insufficient_quota')) {
        errorMessage = 'Crédits insuffisants';
        userFriendlyMessage = 'Votre compte OpenAI n\'a plus de crédits disponibles. Veuillez recharger votre compte sur https://platform.openai.com/account/billing.';
        statusCode = 402;
      } else if (errorMsg.includes('model') && errorMsg.includes('not found')) {
        errorMessage = 'Modèle non disponible';
        userFriendlyMessage = 'Le modèle GPT-4o n\'est pas disponible. Veuillez vérifier votre abonnement OpenAI.';
        statusCode = 400;
      }
      
      res.status(statusCode).json({ 
        error: errorMessage,
        message: userFriendlyMessage,
        details: process.env.NODE_ENV === 'development' ? errorMsg : undefined,
        helpUrl: (statusCode === 429 || statusCode === 402) ? 'https://platform.openai.com/account/billing' : undefined
      });
    }
  });
  
  // Route GET /resend/status pour vérifier si Resend est configuré
  // IMPORTANT: Cette route doit être enregistrée AVANT que Vite ne soit configuré
  console.log('[Routes] Registering GET /resend/status on API router');
  
  // Enregistrer la route sur le router API (sans le préfixe /api car le router sera monté sur /api)
  apiRouter.get('/resend/status', (req, res) => {
    console.log('[Resend Status API] Route MATCHED - URL:', req.originalUrl, 'Path:', req.path);
    console.log('[Resend Status API] Route appelée - URL:', req.originalUrl, 'Path:', req.path);
    
    const hasKey = !!process.env.RESEND_API_KEY;
    const keyLength = process.env.RESEND_API_KEY?.length || 0;
    const configured = hasKey && keyLength > 0;
    const keyPrefix = process.env.RESEND_API_KEY?.substring(0, 5) || 'none';
    
    console.log('[Resend Status API]', {
      hasKey,
      keyLength,
      configured,
      keyPrefix,
      allEnvKeys: Object.keys(process.env).filter(k => k.includes('RESEND'))
    });
    
    // S'assurer que la réponse est bien du JSON
    res.setHeader('Content-Type', 'application/json');
    res.json({ 
      configured: configured,
      debug: process.env.NODE_ENV === 'development' ? {
        hasKey,
        keyLength,
        keyPrefix
      } : undefined
    });
  });
  
  // Route POST /send-email pour envoyer des emails avec PDF via Resend
  apiRouter.post('/send-email', async (req, res) => {
    try {
      const { to, subject, body, pdfBase64, pdfFileName } = req.body;
      
      // Vérifier que Resend est configuré
      if (!process.env.RESEND_API_KEY) {
        return res.status(500).json({
          success: false,
          message: 'Resend n\'est pas configuré. Veuillez ajouter RESEND_API_KEY dans les variables d\'environnement.',
        });
      }
      
      // Vérifier les paramètres requis
      if (!to || !subject || !pdfBase64 || !pdfFileName) {
        return res.status(400).json({
          success: false,
          message: 'Paramètres manquants: to, subject, pdfBase64, pdfFileName sont requis',
        });
      }
      
      // Initialiser Resend
      const resend = new Resend(process.env.RESEND_API_KEY);
      
      // Convertir base64 en Buffer
      const pdfBuffer = Buffer.from(pdfBase64, 'base64');
      
      // Envoyer l'email via Resend
      const { data, error } = await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev', // À configurer
        to: [to],
        subject,
        html: `<p>${body.replace(/\n/g, '<br>')}</p>`,
        attachments: [
          {
            filename: pdfFileName,
            content: pdfBuffer,
          },
        ],
      });
      
      if (error) {
        console.error('Erreur Resend:', error);
        return res.status(500).json({
          success: false,
          message: error.message || 'Erreur lors de l\'envoi de l\'email',
        });
      }
      
      res.json({
        success: true,
        messageId: data?.id,
      });
    } catch (error) {
      console.error('Erreur serveur lors de l\'envoi:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Erreur serveur inconnue',
      });
    }
  });
  
  // Monter le router API sur /api
  console.log('[Routes] Mounting API router on /api');
  app.use('/api', apiRouter);
  console.log('[Routes] API router mounted successfully');
  
  // Handler d'erreur pour multer
  app.use((error: any, req: any, res: any, next: any) => {
    if (error instanceof multer.MulterError) {
      return res.status(400).json({ error: `Erreur upload: ${error.message}` });
    }
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    next();
  });

  const httpServer = createServer(app);
  return httpServer;
}
