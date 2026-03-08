import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

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

    // Initialiser Supabase avec la clé de service (service role key)
    // Cette clé permet de bypasser RLS et mettre à jour directement
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://vyedinahtdayjhsfafzx.supabase.co';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseServiceKey) {
      console.error('[Webhook] SUPABASE_SERVICE_ROLE_KEY manquante');
      return res.status(500).json({ error: 'Configuration Supabase manquante. Veuillez ajouter SUPABASE_SERVICE_ROLE_KEY dans les variables d\'environnement Vercel.' });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Trouver le devis par signwell_document_id
    const { data: quotes, error: findError } = await supabase
      .from('quotes')
      .select('id, status')
      .eq('signwell_document_id', document.id)
      .limit(1);

    if (findError) {
      console.error('[Webhook] Erreur recherche devis:', findError);
      return res.status(500).json({ error: 'Erreur lors de la recherche du devis' });
    }

    if (!quotes || quotes.length === 0) {
      console.warn('[Webhook] Devis non trouvé pour document ID:', document.id);
      return res.status(404).json({ error: 'Devis non trouvé' });
    }

    const quote = quotes[0];
    let updateData: any = {};

    // Mettre à jour selon l'événement
    if (event_type === 'document_completed') {
      // Document signé
      updateData = {
        status: 'signe',
        signwell_signed_pdf_url: document.completed_pdf_url,
        date_signature: new Date().toISOString()
      };
      console.log('[Webhook] Document signé, mise à jour devis:', {
        quoteId: quote.id,
        documentId: document.id,
        signedPdfUrl: document.completed_pdf_url
      });
    } else if (event_type === 'document_declined') {
      // Document refusé
      updateData = {
        status: 'refuse',
        date_refus: new Date().toISOString()
      };
      console.log('[Webhook] Document refusé, mise à jour devis:', {
        quoteId: quote.id,
        documentId: document.id
      });
    }

    // Mettre à jour le devis
    if (Object.keys(updateData).length > 0) {
      const { error: updateError } = await supabase
        .from('quotes')
        .update(updateData)
        .eq('id', quote.id);

      if (updateError) {
        console.error('[Webhook] Erreur mise à jour devis:', updateError);
        return res.status(500).json({ error: 'Erreur lors de la mise à jour du devis' });
      }

      console.log('[Webhook] Devis mis à jour avec succès:', {
        quoteId: quote.id,
        eventType: event_type,
        newStatus: updateData.status
      });
    }

    res.json({
      received: true,
      eventType: event_type,
      documentId: document.id,
      quoteId: quote.id,
      updated: Object.keys(updateData).length > 0
    });

  } catch (error) {
    console.error('Erreur webhook SignWell:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Erreur serveur lors du traitement du webhook',
    });
  }
}
