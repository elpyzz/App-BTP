import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Version ultra-minimale pour tester si le handler peut être appelé
  try {
    return res.status(200).json({ 
      message: 'Handler fonctionne',
      method: req.method,
      hasBody: !!req.body
    });
  } catch (error: any) {
    return res.status(500).json({ 
      error: 'Erreur dans handler minimal',
      message: error?.message || 'Unknown error',
      stack: error?.stack?.substring(0, 500)
    });
  }
}
