import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';
import { optimizeImages, buildPromptUtilisateur, parseGPTResponse, enrichirAvecMateriauxExistants, PROMPT_SYSTEME_OPTIMISE } from './_utils';

// Parser les données pour Vercel
// Supporte deux formats :
// 1. JSON avec images en base64 (recommandé pour Vercel)
// 2. FormData (si disponible)
async function parseRequestData(req: VercelRequest): Promise<{ fields: any; files: Array<{ buffer: Buffer; mimetype: string }> }> {
  const contentType = req.headers['content-type'] || '';
  
  // Si c'est du JSON avec images en base64
  if (contentType.includes('application/json')) {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { surface, metier, materiaux, localisation, delai, existingMaterials, images } = body;
    
    // Convertir les images base64 en buffers
    const files: Array<{ buffer: Buffer; mimetype: string }> = [];
    if (images && Array.isArray(images)) {
      for (const img of images) {
        if (typeof img === 'string') {
          // Format: "data:image/jpeg;base64,..." ou juste base64
          const base64Data = img.includes(',') ? img.split(',')[1] : img;
          const buffer = Buffer.from(base64Data, 'base64');
          const mimeMatch = img.match(/data:([^;]+)/);
          const mimetype = mimeMatch ? mimeMatch[1] : 'image/jpeg';
          files.push({ buffer, mimetype });
        } else if (img.base64 && img.mimetype) {
          // Format: { base64: "...", mimetype: "image/jpeg" }
          const buffer = Buffer.from(img.base64, 'base64');
          files.push({ buffer, mimetype: img.mimetype });
        }
      }
    }
    
    return {
      fields: { surface, metier, materiaux, localisation, delai, existingMaterials },
      files
    };
  }
  
  // Sinon, essayer de parser FormData avec busboy
  // Note: Sur Vercel, FormData peut nécessiter une configuration spéciale
  throw new Error('Format de requête non supporté. Utilisez JSON avec images en base64.');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Seulement POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Parser les données (JSON avec base64 ou FormData)
    const { fields, files } = await parseRequestData(req);
    const { surface, metier, materiaux, localisation, delai, existingMaterials } = fields;
    
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
      materialsList = existingMaterials ? JSON.parse(existingMaterials as string) : [];
    } catch (e) {
      console.warn('Erreur parsing existingMaterials:', e);
    }
    
    // Construction du prompt
    const userPrompt = buildPromptUtilisateur(
      surface as string, 
      metier as string, 
      (materiaux as string) || '', 
      (localisation as string) || '', 
      (delai as string) || '', 
      materialsList
    );
    
    // Initialiser OpenAI
    const envApiKey = (process.env.OPENAI_API_KEY || '').trim();
    if (!envApiKey) {
      return res.status(500).json({ error: 'OPENAI_API_KEY non configurée' });
    }
    
    const openai = new OpenAI({
      apiKey: envApiKey,
    });
    
    // Appel OpenAI avec prompt ultra-précis
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
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
      temperature: 0.1
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
      userFriendlyMessage = 'La clé API OpenAI est invalide. Veuillez vérifier votre configuration.';
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
}
