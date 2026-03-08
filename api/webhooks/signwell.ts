import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Seulement POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { event_type, document } = req.body;

    if (!document || !document.id) {
      return res.status(400).json({ error: 'Document ID manquant' });
    }

    // Le frontend devra mettre à jour le devis en fonction de l'événement
    // On retourne les données pour que le frontend puisse les traiter
    res.json({
      received: true,
      eventType: event_type,
      documentId: document.id,
      completedPdfUrl: document.completed_pdf_url,
      status: document.status
    });

    // Note: Dans une vraie application, on devrait mettre à jour directement la base de données ici
    // Mais comme on utilise Supabase côté frontend, on laisse le frontend gérer la mise à jour
    // après avoir reçu cette notification

  } catch (error) {
    console.error('Erreur webhook SignWell:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Erreur serveur lors du traitement du webhook',
    });
  }
}
