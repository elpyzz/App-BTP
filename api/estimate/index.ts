import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // #region agent log
  try {
    fetch('http://127.0.0.1:7245/ingest/92008ec0-4865-46b1-a863-69afada2c59a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'estimate/index.ts:4',message:'Handler appelé',data:{method:req.method,url:req.url,hasBody:!!req.body},timestamp:Date.now(),runId:'run7',hypothesisId:'H4'})}).catch(()=>{});
  } catch(e) {}
  // #endregion
  
  // Seulement POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Imports dynamiques ESM (compatible Vercel)
    // #region agent log
    try {
      fetch('http://127.0.0.1:7245/ingest/92008ec0-4865-46b1-a863-69afada2c59a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'estimate/index.ts:15',message:'Avant import OpenAI',data:{},timestamp:Date.now(),runId:'run7',hypothesisId:'H4'})}).catch(()=>{});
    } catch(e) {}
    // #endregion

    const openaiModule = await import('openai');
    const OpenAI = openaiModule.default;

    // #region agent log
    try {
      fetch('http://127.0.0.1:7245/ingest/92008ec0-4865-46b1-a863-69afada2c59a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'estimate/index.ts:20',message:'Après import OpenAI',data:{hasOpenAI:!!OpenAI},timestamp:Date.now(),runId:'run7',hypothesisId:'H4'})}).catch(()=>{});
    } catch(e) {}
    // #endregion

    const utilsModule = await import('../_utils');
    const utils = utilsModule;

    // #region agent log
    try {
      fetch('http://127.0.0.1:7245/ingest/92008ec0-4865-46b1-a863-69afada2c59a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'estimate/index.ts:27',message:'Après import _utils',data:{hasUtils:!!utils,hasBuildPrompt:!!utils.buildPromptUtilisateur},timestamp:Date.now(),runId:'run7',hypothesisId:'H4'})}).catch(()=>{});
    } catch(e) {}
    // #endregion

    // Parser les données de la requête
    const { surface, metier, materiaux, localisation, delai, existingMaterials, images } = req.body;

    // #region agent log
    try {
      fetch('http://127.0.0.1:7245/ingest/92008ec0-4865-46b1-a863-69afada2c59a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'estimate/index.ts:35',message:'Données parsées',data:{hasImages:!!images,imagesCount:images?.length||0,surface,metier},timestamp:Date.now(),runId:'run7',hypothesisId:'H4'})}).catch(()=>{});
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
      const base64Data = img.includes(',') ? img.split(',')[1] : img;
      return {
        type: 'image_url',
        image_url: {
          url: `data:image/jpeg;base64,${base64Data}`
        }
      };
    });

    // Construire le prompt
    const promptUtilisateur = utils.buildPromptUtilisateur(
      surface,
      metier,
      materiaux || '',
      localisation || '',
      delai || '',
      parsedMaterials
    );

    // #region agent log
    try {
      fetch('http://127.0.0.1:7245/ingest/92008ec0-4865-46b1-a863-69afada2c59a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'estimate/index.ts:85',message:'Avant appel OpenAI',data:{imagesCount:imageContents.length},timestamp:Date.now(),runId:'run7',hypothesisId:'H4'})}).catch(()=>{});
    } catch(e) {}
    // #endregion

    // Appel OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: utils.PROMPT_SYSTEME_OPTIMISE },
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
      fetch('http://127.0.0.1:7245/ingest/92008ec0-4865-46b1-a863-69afada2c59a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'estimate/index.ts:110',message:'Après appel OpenAI',data:{hasContent:!!completion.choices[0]?.message?.content},timestamp:Date.now(),runId:'run7',hypothesisId:'H4'})}).catch(()=>{});
    } catch(e) {}
    // #endregion

    // Parser la réponse GPT
    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return res.status(500).json({ error: 'Réponse OpenAI vide' });
    }

    let estimation = utils.parseGPTResponse(content);

    // Enrichir avec les matériaux existants
    estimation = await utils.enrichirAvecMateriauxExistants(estimation, parsedMaterials);

    // #region agent log
    try {
      fetch('http://127.0.0.1:7245/ingest/92008ec0-4865-46b1-a863-69afada2c59a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'estimate/index.ts:125',message:'Avant réponse finale',data:{hasMateriaux:!!estimation.materiaux,materiauxCount:estimation.materiaux?.length||0},timestamp:Date.now(),runId:'run7',hypothesisId:'H4'})}).catch(()=>{});
    } catch(e) {}
    // #endregion

    res.setHeader('Content-Type', 'application/json');
    res.json(estimation);

  } catch (error: any) {
    console.error('Erreur estimation:', error);
    
    // #region agent log
    try {
      fetch('http://127.0.0.1:7245/ingest/92008ec0-4865-46b1-a863-69afada2c59a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'estimate/index.ts:135',message:'Erreur handler',data:{errorName:error?.name,errorMessage:error?.message,errorStack:error?.stack?.substring(0,200)},timestamp:Date.now(),runId:'run7',hypothesisId:'H4'})}).catch(()=>{});
    } catch(e) {}
    // #endregion

    // Gestion d'erreurs spécifiques OpenAI
    if (error instanceof Error && error.message.includes('APIError')) {
      if (error.message.includes('401')) {
        return res.status(500).json({ error: 'Clé API OpenAI invalide' });
      }
      if (error.message.includes('429')) {
        return res.status(500).json({ error: 'Quota OpenAI dépassé' });
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
