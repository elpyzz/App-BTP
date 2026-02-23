import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Seulement GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const hasKey = !!process.env.RESEND_API_KEY;
  const keyLength = process.env.RESEND_API_KEY?.length || 0;
  const configured = hasKey && keyLength > 0;
  const keyPrefix = process.env.RESEND_API_KEY?.substring(0, 5) || 'none';

  res.setHeader('Content-Type', 'application/json');
  res.json({ 
    configured: configured,
    debug: process.env.NODE_ENV === 'development' ? {
      hasKey,
      keyLength,
      keyPrefix
    } : undefined
  });
}
