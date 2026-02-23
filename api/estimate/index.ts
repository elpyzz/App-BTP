import type { VercelRequest, VercelResponse } from '@vercel/node';

// #region agent log
try {
  fetch('http://127.0.0.1:7245/ingest/92008ec0-4865-46b1-a863-69afada2c59a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'estimate/index.ts:3',message:'Module estimate/index.ts chargé',data:{step:'module_load'},timestamp:Date.now(),runId:'run3',hypothesisId:'D'})}).catch(()=>{});
} catch(e) {}
// #endregion

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // #region agent log
  try {
    fetch('http://127.0.0.1:7245/ingest/92008ec0-4865-46b1-a863-69afada2c59a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'estimate/index.ts:10',message:'Handler appelé',data:{method:req.method,url:req.url,bodySize:req.body?JSON.stringify(req.body).length:0},timestamp:Date.now(),runId:'run3',hypothesisId:'D'})}).catch(()=>{});
  } catch(e) {}
  // #endregion
  
  // Seulement POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // #region agent log
  try {
    fetch('http://127.0.0.1:7245/ingest/92008ec0-4865-46b1-a863-69afada2c59a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'estimate/index.ts:18',message:'Avant réponse JSON',data:{hasBody:!!req.body},timestamp:Date.now(),runId:'run3',hypothesisId:'D'})}).catch(()=>{});
  } catch(e) {}
  // #endregion

  res.setHeader('Content-Type', 'application/json');
  res.json({ 
    message: 'Handler fonctionne',
    method: req.method,
    hasBody: !!req.body,
    bodySize: req.body ? JSON.stringify(req.body).length : 0
  });
}
