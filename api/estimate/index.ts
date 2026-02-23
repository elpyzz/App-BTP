import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';
import {
  PROMPT_SYSTEME_OPTIMISE,
  buildPromptUtilisateur,
  parseGPTResponse,
  enrichirAvecMateriauxExistants
} from '../_utils';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // #region agent log
  try {
    fetch('http://127.0.0.1:7245/ingest/92008ec0-4865-46b1-a863-69afada2c59a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'estimate/index.ts:10',message:'Handler appelé',data:{method:req.method,url:req.url,hasBody:!!req.body},timestamp:Date.now(),runId:'run4',hypothesisId:'E'})}).catch(()=>{});
  } catch(e) {}
  // #endregion
  
  // Seulement POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Parser les données de la requête
    const { surface, metier, materiaux, localisation, delai, existingMaterials, images } = req.body;

    // #region agent log
    try {
      fetch('http://127.0.0.1:7245/ingest/92008ec0-4865-46b1-a863-69afada2c59a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'estimate/index.ts:25',message:'Données parsées',data:{hasImages:!!images,imagesCount:images?.length||0,surface,metier},timestamp:Date.now(),runId:'run4',hypothesisId:'E'})}).catch(()=>{});
    } catch(e) {}
    // #endregion

    // Validation des données
    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ error: 'Aucune image fournie' });
    }

    if (!surface || !metier) {
      return res.status(400).json({ error: 'Surface et métier requis' });
    }

    // Vérifier la clé API OpenAI
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error('OPENAI_API_KEY non configurée');
      return res.status(500).json({ error: 'Configuration serveur manquante' });
    }

    // Initialiser OpenAI
    const openai = new OpenAI({ apiKey });

    // Parser les matériaux existants
    let parsedMaterials = [];
    try {
      parsedMaterials = existingMaterials ? JSON.parse(existingMaterials) : [];
    } catch (e) {
      console.warn('Erreur parsing existingMaterials:', e);
      parsedMaterials = [];
    }

    // Convertir les images base64 en format OpenAI
    const imageContents = images.map((img: string) => {
      // Retirer le préfixe data:image/...;base64, si présent
      const base64Data = img.includes(',') ? img.split(',')[1] : img;
      return {
        type: 'image_url',
        image_url: {
          url: `data:image/jpeg;base64,${base64Data}`
        }
      };
    });

    // Construire le prompt
    const promptUtilisateur = buildPromptUtilisateur(
      surface,
      metier,
      materiaux || '',
      localisation || '',
      delai || '',
      parsedMaterials
    );

    // #region agent log
    try {
      fetch('http://127.0.0.1:7245/ingest/92008ec0-4865-46b1-a863-69afada2c59a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'estimate/index.ts:60',message:'Avant appel OpenAI',data:{imagesCount:imageContents.length},timestamp:Date.now(),runId:'run4',hypothesisId:'E'})}).catch(()=>{});
    } catch(e) {}
    // #endregion

    // Appel OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: PROMPT_SYSTEME_OPTIMISE },
        {
          role: 'user',
          content: [
            { type: 'text', text: promptUtilisateur },
            ...imageContents
          ]
        }
      ],
      max_tokens: 4000,
      temperature: 0.3
    });

    // #region agent log
    try {
      fetch('http://127.0.0.1:7245/ingest/92008ec0-4865-46b1-a863-69afada2c59a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'estimate/index.ts:80',message:'Après appel OpenAI',data:{hasContent:!!completion.choices[0]?.message?.content},timestamp:Date.now(),runId:'run4',hypothesisId:'E'})}).catch(()=>{});
    } catch(e) {}
    // #endregion

    // Parser la réponse GPT
    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return res.status(500).json({ error: 'Réponse OpenAI vide' });
    }

    let estimation = parseGPTResponse(content);

    // Enrichir avec les matériaux existants
    estimation = await enrichirAvecMateriauxExistants(estimation, parsedMaterials);

    // #region agent log
    try {
      fetch('http://127.0.0.1:7245/ingest/92008ec0-4865-46b1-a863-69afada2c59a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'estimate/index.ts:95',message:'Avant réponse finale',data:{hasMateriaux:!!estimation.materiaux,materiauxCount:estimation.materiaux?.length||0},timestamp:Date.now(),runId:'run4',hypothesisId:'E'})}).catch(()=>{});
    } catch(e) {}
    // #endregion

    res.setHeader('Content-Type', 'application/json');
    res.json(estimation);

  } catch (error: any) {
    console.error('Erreur estimation:', error);
    
    // #region agent log
    try {
      fetch('http://127.0.0.1:7245/ingest/92008ec0-4865-46b1-a863-69afada2c59a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'estimate/index.ts:105',message:'Erreur handler',data:{errorName:error?.name,errorMessage:error?.message,errorStack:error?.stack?.substring(0,200)},timestamp:Date.now(),runId:'run4',hypothesisId:'E'})}).catch(()=>{});
    } catch(e) {}
    // #endregion

    // Gestion d'erreurs spécifiques OpenAI
    if (error instanceof OpenAI.APIError) {
      if (error.status === 401) {
        return res.status(500).json({ error: 'Clé API OpenAI invalide' });
      }
      if (error.status === 429) {
        return res.status(500).json({ error: 'Quota OpenAI dépassé' });
      }
      if (error.code === 'insufficient_quota') {
        return res.status(500).json({ error: 'Quota OpenAI insuffisant' });
      }
      if (error.code === 'model_not_found') {
        return res.status(500).json({ error: 'Modèle OpenAI non trouvé' });
      }
    }

    // Erreur générique
    const errorMessage = error?.message || 'Erreur inconnue';
    res.status(500).json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
    });
  }
}
