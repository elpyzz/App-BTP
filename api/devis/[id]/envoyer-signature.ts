import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // #region agent log
  console.log('[Vercel Function] envoyer-signature appelée:', {
    method: req.method,
    url: req.url,
    query: req.query,
    hasBody: !!req.body
  });
  // #endregion

  // Seulement POST
  if (req.method !== 'POST') {
    console.log('[Vercel Function] Méthode non autorisée:', req.method);
    return res.status(405).json({ 
      success: false,
      error: 'Method not allowed',
      allowedMethods: ['POST'],
      receivedMethod: req.method
    });
  }

  try {
    // Sur Vercel, les paramètres de route dynamique sont dans req.query
    const id = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
    const { messagePersonnalise, pdfBase64, quoteData } = req.body;

    // #region agent log
    console.log('[Vercel Function] Paramètres reçus:', {
      id,
      hasMessage: !!messagePersonnalise,
      hasPdf: !!pdfBase64,
      hasQuoteData: !!quoteData,
      pdfSize: pdfBase64?.length || 0
    });
    // #endregion

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'ID du devis manquant dans l\'URL'
      });
    }

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
    // Structure correcte : fields est un tableau de tableaux au niveau racine
    // Le tableau extérieur correspond aux fichiers, le tableau intérieur contient les champs
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
          email: quoteData.client.email
        }
      ],
      name: `Devis N°${quoteData.quoteNumber || id} — ${clientName}`,
      message: messagePersonnalise || `Bonjour ${clientName}, veuillez trouver ci-joint le devis pour votre projet. Merci de le signer électroniquement.`,
      redirect_url: `${process.env.APP_URL || 'https://app-btp-one.vercel.app'}/devis/${id}/signature-confirmee`,
      apply_signing_order: false,
      // fields est un tableau de tableaux : [ [champs pour fichier 0] ]
      // Coordonnées pour bas à droite : PDF A4 = 595x842 points, y=0 en haut
      fields: [
        [
          {
            type: 'signature',
            required: true,
            recipient_id: '1',
            page: 1,
            x: 380,  // Bas à droite (595 - 200 (largeur) - 15 (marge))
            y: 750,  // Bas de page (842 - 60 (hauteur) - 32 (marge))
            width: 200,
            height: 60
          },
          {
            type: 'date',
            required: true,
            recipient_id: '1',
            page: 1,
            x: 380,  // Bas à droite, aligné avec la signature
            y: 700,  // Juste au-dessus de la signature
            width: 150,
            height: 30
          }
        ]
      ]
    };

    console.log('[SignWell] Envoi du document:', {
      testMode: signwellPayload.test_mode,
      fileName: signwellPayload.files[0].name,
      recipientEmail: signwellPayload.recipients[0].email,
      recipientName: signwellPayload.recipients[0].name,
      pdfSize: pdfBase64.length,
      hasApiKey: !!process.env.SIGNWELL_API_KEY,
      apiKeyPrefix: process.env.SIGNWELL_API_KEY?.substring(0, 10) || 'none',
      payloadKeys: Object.keys(signwellPayload),
      recipientsStructure: JSON.stringify(signwellPayload.recipients, null, 2),
      fieldsStructure: JSON.stringify(signwellPayload.fields, null, 2),
      fieldsCount: signwellPayload.fields?.[0]?.length || 0
    });
    
    // Log du payload complet pour debug
    console.log('[SignWell] Payload complet:', JSON.stringify(signwellPayload, null, 2));

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
      // Log complet de l'erreur pour diagnostic
      const errorDetails = {
        status: signwellResponse.status,
        statusText: signwellResponse.statusText,
        data: signwellData,
        requestInfo: {
          testMode: signwellPayload.test_mode,
          fileName: signwellPayload.files[0].name,
          recipientEmail: signwellPayload.recipients[0].email,
          pdfSize: pdfBase64.length,
          hasApiKey: !!process.env.SIGNWELL_API_KEY,
          apiKeyPrefix: process.env.SIGNWELL_API_KEY?.substring(0, 10) || 'none'
        }
      };
      console.error('Erreur SignWell complète:', JSON.stringify(errorDetails, null, 2));
      
      // Retourner plus de détails même en production pour diagnostiquer
      return res.status(500).json({
        success: false,
        message: signwellData.message || signwellData.error || signwellData.errors?.[0]?.message || 'Erreur lors de l\'envoi à SignWell',
        details: {
          status: signwellResponse.status,
          statusText: signwellResponse.statusText,
          error: signwellData.error || signwellData.message || signwellData.errors?.[0]?.message,
          errors: signwellData.errors,
          fullResponse: signwellData
        }
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
    console.error('Erreur SignWell (catch):', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    });
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Erreur serveur lors de l\'envoi à SignWell',
      details: process.env.NODE_ENV === 'development' ? {
        error: String(error),
        stack: error instanceof Error ? error.stack : undefined
      } : undefined
    });
  }
}
