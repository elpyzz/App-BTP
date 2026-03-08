import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Seulement GET
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false,
      error: 'Method not allowed',
      allowedMethods: ['GET']
    });
  }

  try {
    // Vérifier que SignWell est configuré
    if (!process.env.SIGNWELL_API_KEY) {
      console.log('[Test SignWell] Clé API manquante');
      return res.status(500).json({
        success: false,
        message: 'SignWell n\'est pas configuré. Veuillez ajouter SIGNWELL_API_KEY dans les variables d\'environnement.',
      });
    }

    const apiKey = process.env.SIGNWELL_API_KEY;
    const apiKeyPrefix = apiKey.substring(0, 10);
    
    console.log('[Test SignWell] Test de connexion:', {
      hasApiKey: !!apiKey,
      apiKeyLength: apiKey.length,
      apiKeyPrefix: apiKeyPrefix,
      endpoint: 'https://www.signwell.com/api/v1/me/'
    });

    // Appel simple à l'API SignWell pour vérifier la connexion
    const signwellResponse = await fetch('https://www.signwell.com/api/v1/me/', {
      method: 'GET',
      headers: {
        'X-Api-Key': apiKey,
        'Content-Type': 'application/json'
      }
    });

    console.log('[Test SignWell] Réponse reçue:', {
      status: signwellResponse.status,
      statusText: signwellResponse.statusText,
      ok: signwellResponse.ok,
      headers: Object.fromEntries(signwellResponse.headers.entries())
    });

    // Lire la réponse
    let signwellData;
    const contentType = signwellResponse.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      signwellData = await signwellResponse.json();
    } else {
      const textResponse = await signwellResponse.text();
      console.log('[Test SignWell] Réponse non-JSON:', textResponse);
      signwellData = { error: textResponse, message: 'Réponse invalide de SignWell' };
    }

    console.log('[Test SignWell] Données reçues:', JSON.stringify(signwellData, null, 2));

    if (!signwellResponse.ok) {
      console.error('[Test SignWell] Erreur:', {
        status: signwellResponse.status,
        statusText: signwellResponse.statusText,
        data: signwellData
      });
      
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la connexion à SignWell',
        details: {
          status: signwellResponse.status,
          statusText: signwellResponse.statusText,
          error: signwellData.error || signwellData.message,
          fullResponse: signwellData
        }
      });
    }

    // Succès
    res.json({
      success: true,
      message: 'Connexion à SignWell réussie',
      data: signwellData,
      apiKeyInfo: {
        hasKey: true,
        keyLength: apiKey.length,
        keyPrefix: apiKeyPrefix
      }
    });

  } catch (error) {
    console.error('[Test SignWell] Erreur (catch):', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Erreur serveur lors du test SignWell',
      details: process.env.NODE_ENV === 'development' ? {
        error: String(error),
        stack: error instanceof Error ? error.stack : undefined
      } : undefined
    });
  }
}
