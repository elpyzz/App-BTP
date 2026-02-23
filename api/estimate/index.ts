import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // #region agent log
  try {
    fetch('http://127.0.0.1:7245/ingest/92008ec0-4865-46b1-a863-69afada2c59a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'estimate/index.ts:4',message:'Minimal Handler appelé',data:{method:req.method,url:req.url,hasBody:!!req.body},timestamp:Date.now(),runId:'run5',hypothesisId:'H2'})}).catch(()=>{});
  } catch(e) {}
  // #endregion
  
  // Seulement POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed', source: 'minimal_handler' });
  }

  // Retourner une réponse JSON minimale pour tester l'invocation
  res.status(200).json({ 
    message: 'Minimal handler executed successfully',
    method: req.method,
    hasBody: !!req.body,
    test: true
  });
}
