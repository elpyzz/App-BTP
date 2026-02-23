import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // #region agent log
  fetch('http://127.0.0.1:7245/ingest/92008ec0-4865-46b1-a863-69afada2c59a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'estimate.ts:5',message:'Handler MINIMAL appelé',data:{method:req.method,url:req.url},timestamp:Date.now(),runId:'run2',hypothesisId:'D'})}).catch(()=>{});
  // #endregion
  
  try {
    // Seulement POST
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/92008ec0-4865-46b1-a863-69afada2c59a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'estimate.ts:15',message:'Avant chargement dynamique OpenAI',data:{step:'dynamic_import'},timestamp:Date.now(),runId:'run2',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    // Charger OpenAI dynamiquement
    const { default: OpenAI } = await import('openai');
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/92008ec0-4865-46b1-a863-69afada2c59a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'estimate.ts:19',message:'Après chargement dynamique OpenAI',data:{step:'dynamic_import',openaiType:typeof OpenAI},timestamp:Date.now(),runId:'run2',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/92008ec0-4865-46b1-a863-69afada2c59a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'estimate.ts:22',message:'Avant chargement dynamique _utils',data:{step:'dynamic_import'},timestamp:Date.now(),runId:'run2',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    // Charger _utils dynamiquement
    const utils = await import('./_utils');
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/92008ec0-4865-46b1-a863-69afada2c59a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'estimate.ts:26',message:'Après chargement dynamique _utils',data:{step:'dynamic_import',hasOptimizeImages:typeof utils.optimizeImages,hasEnrichir:typeof utils.enrichirAvecMateriauxExistants},timestamp:Date.now(),runId:'run2',hypothesisId:'B'})}).catch(()=>{});
    // #endregion

    const { optimizeImages, buildPromptUtilisateur, parseGPTResponse, enrichirAvecMateriauxExistants, PROMPT_SYSTEME_OPTIMISE } = utils;

    // Parser les données
    const contentType = req.headers['content-type'] || '';
    let body: any;
    if (typeof req.body === 'string') {
      try {
        body = JSON.parse(req.body);
      } catch (e) {
        throw new Error(`Erreur parsing JSON: ${e instanceof Error ? e.message : 'Unknown'}`);
      }
    } else {
      body = req.body || {};
    }
    
    if (!body || Object.keys(body).length === 0) {
      return res.status(400).json({ error: 'Body de la requête vide ou invalide' });
    }
    
    const { surface, metier, materiaux, localisation, delai, existingMaterials, images } = body;
    
    // Convertir les images base64 en buffers
    const files: Array<{ buffer: Buffer; mimetype: string }> = [];
    if (images && Array.isArray(images) && images.length > 0) {
      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        try {
          if (typeof img === 'string') {
            const base64Data = img.includes(',') ? img.split(',')[1] : img;
            if (!base64Data || base64Data.length === 0) {
              continue;
            }
            const buffer = Buffer.from(base64Data, 'base64');
            if (buffer.length === 0) {
              continue;
            }
            const mimeMatch = img.match(/data:([^;]+)/);
            const mimetype = mimeMatch ? mimeMatch[1] : 'image/jpeg';
            files.push({ buffer, mimetype });
          } else if (img && typeof img === 'object' && img.base64 && img.mimetype) {
            const buffer = Buffer.from(img.base64, 'base64');
            if (buffer.length === 0) {
              continue;
            }
            files.push({ buffer, mimetype: img.mimetype });
          }
        } catch (e) {
          // Continuer avec les autres images
        }
      }
    }
    
    // Validation stricte
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'Au moins une image est requise' });
    }
    
    if (!surface || !metier) {
      return res.status(400).json({ error: 'Surface et métier sont requis' });
    }
    
    // Optimisation des images avec Sharp (avec fallback automatique)
    let optimizedImages: string[];
    try {
      optimizedImages = await optimizeImages(files);
    } catch (sharpError) {
      console.error('Erreur lors de l\'optimisation des images, utilisation des images originales:', sharpError);
      optimizedImages = files.map(file => file.buffer.toString('base64'));
    }
    
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
    estimation = await enrichirAvecMateriauxExistants(estimation, materialsList);
    
    res.json(estimation);
    
  } catch (error: any) {
    // Gestion d'erreur globale
    console.error('ERREUR GLOBALE dans handler:', error);
    console.error('Error name:', error?.name);
    console.error('Error message:', error?.message);
    console.error('Error stack:', error?.stack?.substring(0, 1000));
    
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/92008ec0-4865-46b1-a863-69afada2c59a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'estimate.ts:165',message:'Erreur capturée',data:{errorName:error?.name,errorMsg:error?.message,errorCode:error?.code},timestamp:Date.now(),runId:'run2',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    
    let errorMessage = 'Erreur lors de l\'analyse';
    let statusCode = 500;
    let userFriendlyMessage = 'Une erreur est survenue lors de l\'analyse.';
    
    const errorMsg = error?.message || '';
    const errorName = error?.name || '';
    
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.trim() === '') {
      errorMessage = 'OPENAI_API_KEY non configurée';
      userFriendlyMessage = 'La clé API OpenAI n\'est pas configurée sur Vercel. Veuillez l\'ajouter dans les variables d\'environnement.';
      statusCode = 500;
    } else if (errorMsg.includes('401') || errorMsg.includes('Incorrect API key') || errorName === 'AuthenticationError') {
      errorMessage = 'Clé API OpenAI invalide';
      userFriendlyMessage = 'La clé API OpenAI est invalide. Veuillez vérifier votre configuration.';
      statusCode = 401;
    } else if (errorMsg.includes('429') || errorMsg.includes('quota') || errorMsg.includes('exceeded') || errorName === 'RateLimitError') {
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
    } else if (errorMsg.includes('timeout') || errorMsg.includes('TIMEOUT')) {
      errorMessage = 'Timeout';
      userFriendlyMessage = 'La requête a pris trop de temps. Veuillez réessayer.';
      statusCode = 504;
    } else if (errorMsg.includes('network') || errorMsg.includes('ECONNREFUSED') || errorMsg.includes('ENOTFOUND')) {
      errorMessage = 'Erreur réseau';
      userFriendlyMessage = 'Impossible de se connecter au service. Vérifiez votre connexion internet.';
      statusCode = 503;
    }
    
    const isDev = process.env.VERCEL_ENV === 'development' || 
                  process.env.VERCEL_ENV === 'preview' || 
                  process.env.NODE_ENV === 'development' ||
                  process.env.VERCEL === '1';
    
    try {
      res.status(statusCode).json({ 
        error: errorMessage,
        message: userFriendlyMessage,
        details: errorMsg || 'Aucun détail disponible',
        errorName: errorName || 'Unknown',
        stack: isDev ? error?.stack?.substring(0, 1000) : undefined,
        helpUrl: (statusCode === 429 || statusCode === 402) ? 'https://platform.openai.com/account/billing' : undefined
      });
    } catch (jsonError) {
      console.error('Erreur lors de l\'envoi de la réponse JSON:', jsonError);
      res.status(statusCode).setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ 
        error: 'Erreur serveur',
        message: 'Une erreur est survenue lors du traitement de votre requête.',
        details: errorMsg || 'Aucun détail disponible'
      }));
    }
  }
}
