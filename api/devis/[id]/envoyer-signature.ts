import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Seulement POST
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false,
      error: 'Method not allowed',
      allowedMethods: ['POST']
    });
  }

  try {
    const { id } = req.query;
    const { messagePersonnalise, pdfBase64, quoteData } = req.body;

    // Vérifier que SignWell est configuré
    if (!process.env.SIGNWELL_API_KEY) {
      return res.status(500).json({
        success: false,
        message: 'SignWell n\'est pas configuré. Veuillez ajouter SIGNWELL_API_KEY dans les variables d\'environnement.',
      });
    }

    // Validation des paramètres
    if (!pdfBase64) {
      return res.status(400).json({
        success: false,
        message: 'Paramètre manquant: pdfBase64 est requis',
      });
    }

    if (!quoteData) {
      return res.status(400).json({
        success: false,
        message: 'Paramètre manquant: quoteData est requis',
      });
    }

    // Vérifier que le client a un email
    if (!quoteData.client?.email) {
      return res.status(400).json({
        success: false,
        message: 'Ce client n\'a pas d\'email renseigné. Ajoutez son email dans sa fiche client avant d\'envoyer pour signature.',
      });
    }

    // Vérifier que le client a un nom
    const clientName = quoteData.client.contactName || quoteData.client.name;
    if (!clientName) {
      return res.status(400).json({
        success: false,
        message: 'Le nom du client est manquant',
      });
    }

    // Vérifier que le PDF en base64 n'est pas vide
    if (typeof pdfBase64 !== 'string' || pdfBase64.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Le PDF généré est vide ou invalide',
      });
    }

    // Créer le document dans SignWell
    const signwellPayload = {
      test_mode: process.env.NODE_ENV === 'development' || process.env.SIGNWELL_TEST_MODE === 'true',
      files: [
        {
          name: `Devis-${quoteData.quoteNumber || id}.pdf`,
          file_base64: pdfBase64
        }
      ],
      recipients: [
        {
          id: '1',
          name: clientName,
          email: quoteData.client.email,
          placeholder_fields: [
            {
              api_id: 'signature_client',
              type: 'signature'
            },
            {
              api_id: 'date_signature',
              type: 'date'
            }
          ]
        }
      ],
      name: `Devis N°${quoteData.quoteNumber || id} — ${clientName}`,
      message: messagePersonnalise || `Bonjour ${clientName}, veuillez trouver ci-joint le devis pour votre projet. Merci de le signer électroniquement.`,
      redirect_url: `${process.env.APP_URL || 'https://app-btp-one.vercel.app'}/devis/${id}/signature-confirmee`,
      apply_signing_order: false
    };

    console.log('[SignWell] Envoi du document:', {
      testMode: signwellPayload.test_mode,
      fileName: signwellPayload.files[0].name,
      recipientEmail: signwellPayload.recipients[0].email,
      pdfSize: pdfBase64.length
    });

    const signwellResponse = await fetch('https://www.signwell.com/api/v1/documents/', {
      method: 'POST',
      headers: {
        'X-Api-Key': process.env.SIGNWELL_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(signwellPayload)
    });

    // Vérifier si la réponse est JSON avant de parser
    let signwellData;
    const contentType = signwellResponse.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      signwellData = await signwellResponse.json();
    } else {
      const textResponse = await signwellResponse.text();
      console.error('Réponse SignWell non-JSON:', textResponse);
      signwellData = { error: textResponse, message: 'Réponse invalide de SignWell' };
    }

    if (!signwellResponse.ok) {
      console.error('Erreur SignWell complète:', {
        status: signwellResponse.status,
        statusText: signwellResponse.statusText,
        data: signwellData,
        requestInfo: {
          testMode: signwellPayload.test_mode,
          fileName: signwellPayload.files[0].name,
          recipientEmail: signwellPayload.recipients[0].email,
          pdfSize: pdfBase64.length
        }
      });
      return res.status(500).json({
        success: false,
        message: signwellData.message || signwellData.error || 'Erreur lors de l\'envoi à SignWell',
        details: process.env.NODE_ENV === 'development' ? {
          status: signwellResponse.status,
          error: signwellData.error || signwellData.message,
          fullResponse: signwellData
        } : undefined
      });
    }

    res.json({
      success: true,
      message: 'Devis envoyé pour signature',
      signwellDocumentId: signwellData.id,
      signingUrl: signwellData.recipients?.[0]?.signing_url,
      recipientId: signwellData.recipients?.[0]?.id
    });

  } catch (error) {
    console.error('Erreur SignWell:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Erreur serveur lors de l\'envoi à SignWell',
    });
  }
}
