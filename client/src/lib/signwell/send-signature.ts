import { Quote } from '@/lib/quotes/types';
import { generateQuotePDFBase64 } from '@/lib/quotes/pdf-generator';
import { loadQuote, saveQuote } from '@/lib/storage/quotes';
import { loadCurrentCompany } from '@/lib/storage/company';

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

    // Charger la company à jour (signature / logo) pour les inclure dans le PDF (ou toute la company si le devis n'en a pas)
    const currentCompany = await loadCurrentCompany();
    const companyOverrides = currentCompany
      ? (quote.company
          ? { signature: currentCompany.signature, logo: currentCompany.logo }
          : currentCompany)
      : undefined;

    // Générer le PDF en base64
    let pdfBase64: string;
    try {
      pdfBase64 = await generateQuotePDFBase64(quote, companyOverrides);
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
    const apiUrl = `/api/devis/${quoteId}/envoyer-signature`;
    // #region agent log
    console.log('[Client] Envoi requête SignWell:', {
      url: apiUrl,
      method: 'POST',
      quoteId,
      pdfSize: pdfBase64.length,
      hasQuoteData: !!quote,
      baseUrl: window.location.origin
    });
    // #endregion

    const response = await fetch(apiUrl, {
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

    // #region agent log
    console.log('[Client] Réponse reçue:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      contentType: response.headers.get('content-type'),
      url: response.url
    });
    // #endregion

    // Vérifier si la réponse est JSON avant de parser
    let data;
    const contentType = response.headers.get('content-type');
    
    // Lire la réponse en texte d'abord pour voir ce qui est réellement retourné
    let responseText: string;
    try {
      // Essayer de cloner la réponse pour lire le texte sans consommer la réponse
      const clonedResponse = response.clone();
      responseText = await clonedResponse.text();
    } catch (cloneError) {
      // Si clone() échoue, lire directement (mais cela consomme la réponse)
      responseText = await response.text();
    }
    
    // #region agent log
    console.log('[Client] Réponse brute (texte):', responseText);
    console.log('[Client] Longueur réponse:', responseText.length);
    console.log('[Client] Est vide?', responseText.length === 0);
    // #endregion
    
    if (contentType && contentType.includes('application/json')) {
      try {
        // Si la réponse est vide, créer un objet d'erreur
        if (responseText.length === 0) {
          console.error('[Client] Réponse JSON vide!');
          return {
            success: false,
            error: `Erreur ${response.status}: Le serveur a retourné une réponse vide`
          };
        }
        
        data = JSON.parse(responseText);
        // #region agent log
        console.log('[Client] Données parsées:', JSON.stringify(data, null, 2));
        console.log('[Client] Structure data:', {
          hasMessage: !!data?.message,
          hasDetails: !!data?.details,
          hasError: !!data?.error,
          hasSuccess: 'success' in data,
          keys: data ? Object.keys(data) : []
        });
        // #endregion
      } catch (jsonError) {
        console.error('[Client] Erreur parsing JSON:', jsonError);
        console.error('[Client] Texte qui a causé l\'erreur:', responseText.substring(0, 500));
        return {
          success: false,
          error: `Erreur ${response.status}: Réponse invalide du serveur (non-JSON valide)`
        };
      }
    } else {
      console.error('[Client] Réponse non-JSON:', responseText);
      return {
        success: false,
        error: `Erreur ${response.status}: ${responseText || response.statusText}`
      };
    }

    if (!response.ok) {
      // #region agent log
      console.error('[Client] Erreur API:', {
        status: response.status,
        statusText: response.statusText,
        data: data,
        details: data?.details,
        message: data?.message,
        error: data?.error
      });
      // #endregion
      
      // Construire un message d'erreur détaillé
      let errorMessage = data?.message || data?.error || `Erreur ${response.status}: ${response.statusText}`;
      
      // Ajouter les détails si disponibles
      if (data?.details) {
        if (data.details.error) {
          errorMessage += ` (${data.details.error})`;
        }
        if (data.details.errors && Array.isArray(data.details.errors) && data.details.errors.length > 0) {
          const errorList = data.details.errors.map((e: any) => e.message || e).join(', ');
          errorMessage += ` - ${errorList}`;
        }
        // Afficher le statut HTTP de SignWell si disponible
        if (data.details.status) {
          errorMessage += ` [Status SignWell: ${data.details.status}]`;
        }
      }
      
      return {
        success: false,
        error: errorMessage,
        details: data?.details
      };
    }

    if (!data.success) {
      return {
        success: false,
        error: data.message || 'Impossible d\'envoyer le devis pour signature. Vérifiez votre connexion et réessayez.'
      };
    }

    // Mettre à jour le devis avec les infos SignWell (statut restant "sent" : l'artisan vérifie la signature dans ses mails)
    const updatedQuote: Quote & {
      signwellDocumentId?: string;
      signwellSignedPdfUrl?: string;
      dateEnvoiSignature?: string;
      dateSignature?: string;
      dateRefus?: string;
    } = {
      ...quote,
      status: 'sent' as any,
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
