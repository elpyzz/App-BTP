import dotenv from 'dotenv';
import path from 'path';
// Charger dotenv avec le chemin explicite
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import type { Express } from "express";
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
  // #region agent log
  fetch('http://127.0.0.1:7245/ingest/92008ec0-4865-46b1-a863-69afada2c59a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server/routes.ts:78',message:'optimizeImages called',data:{filesCount:files.length},timestamp:Date.now(),runId:'run1',hypothesisId:'B'})}).catch(()=>{});
  // #endregion
  const optimizedImages = await Promise.all(
    files.map(async (file, index) => {
      try {
        // #region agent log
        fetch('http://127.0.0.1:7245/ingest/92008ec0-4865-46b1-a863-69afada2c59a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server/routes.ts:86',message:'Before sharp processing',data:{fileIndex:index,fileSize:file.buffer?.length||0,mimetype:file.mimetype},timestamp:Date.now(),runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        const optimized = await sharp(file.buffer)
          .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 85 })
          .toBuffer();
        // #region agent log
        fetch('http://127.0.0.1:7245/ingest/92008ec0-4865-46b1-a863-69afada2c59a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server/routes.ts:90',message:'After sharp processing',data:{fileIndex:index,optimizedSize:optimized.length},timestamp:Date.now(),runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        return optimized.toString('base64');
      } catch (error) {
        // #region agent log
        fetch('http://127.0.0.1:7245/ingest/92008ec0-4865-46b1-a863-69afada2c59a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server/routes.ts:92',message:'Sharp error, using fallback',data:{fileIndex:index,errorMessage:error instanceof Error ? error.message : String(error)},timestamp:Date.now(),runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        console.error('Erreur optimisation image:', error);
        // Fallback: utiliser l'image originale en base64
        return file.buffer.toString('base64');
      }
    })
  );
  // #region agent log
  fetch('http://127.0.0.1:7245/ingest/92008ec0-4865-46b1-a863-69afada2c59a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server/routes.ts:98',message:'optimizeImages completed',data:{optimizedCount:optimizedImages.length},timestamp:Date.now(),runId:'run1',hypothesisId:'B'})}).catch(()=>{});
  // #endregion
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
  // #region agent log
  fetch('http://127.0.0.1:7245/ingest/92008ec0-4865-46b1-a863-69afada2c59a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server/routes.ts:272',message:'registerRoutes function entry',data:{},timestamp:Date.now(),runId:'run1',hypothesisId:'D'})}).catch(()=>{});
  // #endregion
  
  // Initialiser OpenAI ici, après que dotenv soit chargé
  if (!openai) {
    // #region agent log
    const rawApiKey = process.env.OPENAI_API_KEY || '';
    const apiKey = rawApiKey.trim();
    fetch('http://127.0.0.1:7245/ingest/92008ec0-4865-46b1-a863-69afada2c59a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server/routes.ts:277',message:'Initializing OpenAI in registerRoutes',data:{hasApiKey:!!apiKey,apiKeyLength:apiKey.length,apiKeyPrefix:apiKey.substring(0,7)||'none',apiKeyFirst20:apiKey.substring(0,20),apiKeyLast10:apiKey.substring(apiKey.length-10),rawApiKeyLast10:rawApiKey.substring(rawApiKey.length-10),hasWhitespace:apiKey !== rawApiKey},timestamp:Date.now(),runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    if (!apiKey) {
      console.error('OPENAI_API_KEY is not set in environment variables');
    }
    openai = new OpenAI({
      apiKey: apiKey,
      // Pour les clés de projet (sk-proj-), pas besoin de configuration spéciale
      // mais on peut spécifier explicitement l'organisation si nécessaire
    });
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/92008ec0-4865-46b1-a863-69afada2c59a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server/routes.ts:282',message:'OpenAI initialized successfully',data:{},timestamp:Date.now(),runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
  }
  
  // put application routes here
  // prefix all routes with /api

  // use storage to perform CRUD operations on the storage interface
  // e.g. storage.insertUser(user) or storage.getUserByUsername(username)
  
  // Route POST /api/estimate
  // #region agent log
  fetch('http://127.0.0.1:7245/ingest/92008ec0-4865-46b1-a863-69afada2c59a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server/routes.ts:293',message:'Registering /api/estimate route',data:{},timestamp:Date.now(),runId:'run1',hypothesisId:'ALL'})}).catch(()=>{});
  // #endregion
  
  // Middleware pour capturer les erreurs multer
  app.post('/api/estimate', (req, res, next) => {
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/92008ec0-4865-46b1-a863-69afada2c59a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server/routes.ts:297',message:'Before multer middleware',data:{contentType:req.headers['content-type'],hasBody:!!req.body},timestamp:Date.now(),runId:'run1',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    next();
  }, upload.array('images', 10), async (req, res) => {
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/92008ec0-4865-46b1-a863-69afada2c59a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server/routes.ts:262',message:'POST /api/estimate called',data:{hasFiles:!!req.files,filesCount:req.files?.length||0,hasSurface:!!req.body.surface,hasMetier:!!req.body.metier,hasOpenAIKey:!!process.env.OPENAI_API_KEY},timestamp:Date.now(),runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    try {
      const { surface, metier, materiaux, localisation, delai, existingMaterials } = req.body;
      const files = req.files as Express.Multer.File[];
      
      // Validation stricte
      if (!files || files.length === 0) {
        // #region agent log
        fetch('http://127.0.0.1:7245/ingest/92008ec0-4865-46b1-a863-69afada2c59a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server/routes.ts:268',message:'Validation failed: no files',data:{},timestamp:Date.now(),runId:'run1',hypothesisId:'E'})}).catch(()=>{});
        // #endregion
        return res.status(400).json({ error: 'Au moins une image est requise' });
      }
      
      if (!surface || !metier) {
        // #region agent log
        fetch('http://127.0.0.1:7245/ingest/92008ec0-4865-46b1-a863-69afada2c59a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server/routes.ts:272',message:'Validation failed: missing surface or metier',data:{hasSurface:!!surface,hasMetier:!!metier},timestamp:Date.now(),runId:'run1',hypothesisId:'E'})}).catch(()=>{});
        // #endregion
        return res.status(400).json({ error: 'Surface et métier sont requis' });
      }
      
      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/92008ec0-4865-46b1-a863-69afada2c59a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server/routes.ts:276',message:'Before optimizeImages',data:{filesCount:files.length},timestamp:Date.now(),runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      // Optimisation des images avec Sharp
      const optimizedImages = await optimizeImages(files);
      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/92008ec0-4865-46b1-a863-69afada2c59a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server/routes.ts:278',message:'After optimizeImages',data:{optimizedCount:optimizedImages.length},timestamp:Date.now(),runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      
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
      const envApiKey = (process.env.OPENAI_API_KEY || '').trim();
      fetch('http://127.0.0.1:7245/ingest/92008ec0-4865-46b1-a863-69afada2c59a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server/routes.ts:291',message:'Before OpenAI API call',data:{model:'gpt-4o',hasApiKey:!!envApiKey,apiKeyLength:envApiKey.length,apiKeyFirst20:envApiKey.substring(0,20),apiKeyLast10:envApiKey.substring(envApiKey.length-10)},timestamp:Date.now(),runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      
      // FORCER la recréation de l'instance OpenAI avec la clé de l'environnement à chaque appel
      // Cela garantit qu'on utilise toujours la clé la plus récente de .env
      openai = new OpenAI({
        apiKey: envApiKey,
      });
      
      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/92008ec0-4865-46b1-a863-69afada2c59a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server/routes.ts:356',message:'OpenAI instance recreated with env key',data:{newApiKeyLast10:envApiKey.substring(envApiKey.length-10)},timestamp:Date.now(),runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      
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
      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/92008ec0-4865-46b1-a863-69afada2c59a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server/routes.ts:311',message:'After OpenAI API call',data:{hasResponse:!!response,hasContent:!!response.choices?.[0]?.message?.content,contentLength:response.choices?.[0]?.message?.content?.length||0},timestamp:Date.now(),runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      
      // Parsing JSON ultra-robuste
      const content = response.choices[0].message.content;
      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/92008ec0-4865-46b1-a863-69afada2c59a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server/routes.ts:315',message:'Before parseGPTResponse',data:{contentLength:content?.length||0,contentPreview:content?.substring(0,100)||''},timestamp:Date.now(),runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      let estimation = parseGPTResponse(content);
      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/92008ec0-4865-46b1-a863-69afada2c59a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server/routes.ts:316',message:'After parseGPTResponse',data:{hasEstimation:!!estimation,hasMateriaux:!!estimation?.materiaux},timestamp:Date.now(),runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      
      // Enrichissement avec matériaux existants
      estimation = enrichirAvecMateriauxExistants(estimation, materialsList);
      
      res.json(estimation);
      
    } catch (error: any) {
      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/92008ec0-4865-46b1-a863-69afada2c59a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server/routes.ts:395',message:'Error caught in /api/estimate',data:{errorName:error?.name,errorMessage:error?.message,errorStack:error?.stack?.substring(0,200)},timestamp:Date.now(),runId:'run1',hypothesisId:'ALL'})}).catch(()=>{});
      // #endregion
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
  
  // Route POST /api/send-email pour envoyer des emails avec PDF via Resend
  app.post('/api/send-email', async (req, res) => {
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
  
  // Handler d'erreur pour multer
  app.use((error: any, req: any, res: any, next: any) => {
    if (error instanceof multer.MulterError) {
      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/92008ec0-4865-46b1-a863-69afada2c59a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server/routes.ts:407',message:'Multer error caught',data:{errorCode:error.code,errorMessage:error.message,field:error.field},timestamp:Date.now(),runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      return res.status(400).json({ error: `Erreur upload: ${error.message}` });
    }
    if (error) {
      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/92008ec0-4865-46b1-a863-69afada2c59a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server/routes.ts:412',message:'General error in middleware',data:{errorMessage:error.message},timestamp:Date.now(),runId:'run1',hypothesisId:'ALL'})}).catch(()=>{});
      // #endregion
      return res.status(400).json({ error: error.message });
    }
    next();
  });

  // #region agent log
  fetch('http://127.0.0.1:7245/ingest/92008ec0-4865-46b1-a863-69afada2c59a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server/routes.ts:13',message:'Creating HTTP server',data:{},timestamp:Date.now(),runId:'run1',hypothesisId:'D'})}).catch(()=>{});
  // #endregion
  const httpServer = createServer(app);
  // #region agent log
  fetch('http://127.0.0.1:7245/ingest/92008ec0-4865-46b1-a863-69afada2c59a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server/routes.ts:15',message:'HTTP server created successfully',data:{},timestamp:Date.now(),runId:'run1',hypothesisId:'D'})}).catch(()=>{});
  // #endregion

  return httpServer;
}
