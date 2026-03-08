import { Quote } from '@/lib/quotes/types';
import { generateQuotePDFBase64 } from '@/lib/quotes/pdf-generator';
import { loadQuote, saveQuote } from '@/lib/storage/quotes';

export interface SendSignatureResponse {
  success: boolean;
  message?: string;
  signwellDocumentId?: string;
  signingUrl?: string;
  recipientId?: string;
  error?: string;
}

/**
 * Envoie un devis pour signature électronique via SignWell
 */
export async function sendQuoteForSignature(
  quoteId: string,
  messagePersonnalise?: string
): Promise<SendSignatureResponse> {
  try {
    // Charger le devis complet
    const quote = await loadQuote(quoteId);
    if (!quote) {
      return {
        success: false,
        error: 'Devis introuvable'
      };
    }

    // Vérifier que le client a un email
    if (!quote.client?.email) {
      return {
        success: false,
        error: 'Ce client n\'a pas d\'email renseigné. Ajoutez son email dans sa fiche client avant d\'envoyer pour signature.'
      };
    }

    // Vérifier que le client a un nom
    if (!quote.client.name && !quote.client.contactName) {
      return {
        success: false,
        error: 'Le nom du client est manquant'
      };
    }

    // Générer le PDF en base64
    let pdfBase64: string;
    try {
      pdfBase64 = await generateQuotePDFBase64(quote);
      if (!pdfBase64 || pdfBase64.length === 0) {
        return {
          success: false,
          error: 'Erreur lors de la génération du PDF'
        };
      }
    } catch (pdfError) {
      console.error('Erreur génération PDF:', pdfError);
      return {
        success: false,
        error: 'Impossible de générer le PDF du devis'
      };
    }

    // Envoyer à SignWell via l'API backend
    const response = await fetch(`/api/devis/${quoteId}/envoyer-signature`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        pdfBase64,
        quoteData: quote,
        messagePersonnalise: messagePersonnalise || `Bonjour ${quote.client.contactName || quote.client.name}, veuillez trouver ci-joint le devis pour votre projet. Merci de le signer électroniquement.`
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Erreur API:', {
        status: response.status,
        statusText: response.statusText,
        data: data
      });
      return {
        success: false,
        error: data.message || `Erreur ${response.status}: ${response.statusText}`
      };
    }

    if (!data.success) {
      return {
        success: false,
        error: data.message || 'Impossible d\'envoyer le devis pour signature. Vérifiez votre connexion et réessayez.'
      };
    }

    // Mettre à jour le devis avec les informations SignWell
    const updatedQuote: Quote & {
      signwellDocumentId?: string;
      signwellSignedPdfUrl?: string;
      dateEnvoiSignature?: string;
      dateSignature?: string;
      dateRefus?: string;
    } = {
      ...quote,
      status: 'en_attente_signature' as any,
      signwellDocumentId: data.signwellDocumentId,
      dateEnvoiSignature: new Date().toISOString()
    };

    // Sauvegarder le devis mis à jour avec les champs SignWell
    await saveQuote(updatedQuote as Quote);

    return {
      success: true,
      message: data.message || 'Devis envoyé pour signature',
      signwellDocumentId: data.signwellDocumentId,
      signingUrl: data.signingUrl,
      recipientId: data.recipientId
    };

  } catch (error) {
    console.error('Erreur lors de l\'envoi pour signature:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue lors de l\'envoi pour signature'
    };
  }
}

/**
 * Met à jour le statut de signature d'un devis après réception du webhook
 */
export async function updateQuoteSignatureStatus(
  quoteId: string,
  status: 'signe' | 'refuse',
  signwellSignedPdfUrl?: string,
  dateSignature?: string
): Promise<boolean> {
  try {
    const quote = await loadQuote(quoteId);
    if (!quote) {
      return false;
    }

    const updatedQuote: Quote = {
      ...quote,
      status: status as any,
    };

    await saveQuote(updatedQuote);
    return true;

  } catch (error) {
    console.error('Erreur lors de la mise à jour du statut:', error);
    return false;
  }
}
