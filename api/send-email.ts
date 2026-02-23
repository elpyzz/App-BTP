import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Resend } from 'resend';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Seulement POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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
      from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
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
}
