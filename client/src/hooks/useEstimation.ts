import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { getMaterials, type Material } from '@/lib/materials';
import { validateImages } from '@/utils/imageValidation';
import { parseGPTResponse, type EstimationResult } from '@/utils/responseParser';
import { findBestMaterialMatch } from '@/lib/materialMatcher';

interface ChantierInfo {
  surface: string;
  materiaux: string;
  localisation: string;
  delai: string;
  metier: string;
}

export const useEstimation = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<EstimationResult | null>(null);
  const { toast } = useToast();
  
  const analyzeChantier = useCallback(async (
    images: File[],
    chantierInfo: ChantierInfo
  ) => {
    setIsLoading(true);
    setResult(null);
    
    try {
      // Validation des images
      const validImages = await validateImages(images);
      
      // Récupération des matériaux existants
      const existingMaterials = await getMaterials();
      
      // Compresser et convertir les images en base64 pour compatibilité Vercel
      // Vercel limite à 4.5MB pour le body, donc on doit compresser les images
      const imagesBase64 = await Promise.all(
        validImages.map(async (img) => {
          return new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async () => {
              try {
                const originalDataUrl = reader.result as string;
                // Compresser l'image pour réduire la taille
                const compressed = await compressImage(originalDataUrl, 0.7, 1920); // 70% qualité, max 1920px
                resolve(compressed);
              } catch (error) {
                // Si la compression échoue, utiliser l'original
                resolve(reader.result as string);
              }
            };
            reader.onerror = reject;
            reader.readAsDataURL(img);
          });
        })
      );
      
      // Préparation du body JSON (compatible Vercel serverless)
      // TEST: Envoyer d'abord un body minimal pour tester si le problème vient de la taille
      const requestBody = {
        surface: chantierInfo.surface,
        metier: chantierInfo.metier,
        materiaux: chantierInfo.materiaux,
        localisation: chantierInfo.localisation,
        delai: chantierInfo.delai,
        existingMaterials: JSON.stringify(existingMaterials),
        images: imagesBase64
      };
      
      // Calculer la taille du body
      const bodySize = JSON.stringify(requestBody).length;
      console.log('Sending request to /api/estimate', {
        imagesCount: validImages.length,
        surface: chantierInfo.surface,
        metier: chantierInfo.metier,
        bodySize: bodySize,
        bodySizeMB: (bodySize / 1024 / 1024).toFixed(2)
      });
      
      // Si le body est trop volumineux (>4.5MB), Vercel peut rejeter la requête
      if (bodySize > 4.5 * 1024 * 1024) {
        throw new Error(`Le body de la requête est trop volumineux (${(bodySize / 1024 / 1024).toFixed(2)}MB). Vercel limite à 4.5MB. Veuillez réduire la taille des images.`);
      }
      
      const response = await fetch('/api/estimate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });
      
      console.log('Response status:', response.status, response.statusText);
      
      if (!response.ok) {
        let errorData: any;
        try {
          const text = await response.text();
          console.error('Error response text:', text);
          errorData = text ? JSON.parse(text) : { error: 'Erreur inconnue' };
        } catch (parseError) {
          console.error('Erreur parsing JSON de la réponse d\'erreur:', parseError);
          errorData = { 
            error: `Erreur HTTP ${response.status}`,
            message: `Le serveur a retourné une erreur ${response.status}: ${response.statusText}`,
            details: `Impossible de parser la réponse: ${parseError instanceof Error ? parseError.message : 'Unknown'}`
          };
        }
        console.error('Error response:', errorData);
        
        // Créer un message d'erreur détaillé
        let errorMessage = errorData.message || errorData.error || `HTTP ${response.status}: ${response.statusText}`;
        
        // Ajouter les détails si disponibles (en dev/preview)
        if (errorData.details) {
          errorMessage += `\n\nDétails: ${errorData.details}`;
        }
        
        // Ajouter un lien d'aide si disponible
        if (errorData.helpUrl) {
          errorMessage += `\n\nPour résoudre ce problème, visitez: ${errorData.helpUrl}`;
        }
        
        throw new Error(errorMessage);
      }
      
      const estimation = await response.json();
      
      // Enrichissement des matériaux avec matching
      const enrichedEstimation = enrichMaterialsWithExisting(estimation, existingMaterials);
      
      setResult(enrichedEstimation);
      
      toast({
        title: "Estimation terminée",
        description: `Coût total: ${enrichedEstimation.coutTotal.toFixed(2)}€ TTC`,
      });
      
      return enrichedEstimation;
      
    } catch (error) {
      console.error('Erreur estimation:', error);
      const errorMessage = error instanceof Error ? error.message : 'Impossible de générer l\'estimation';
      
      // Déterminer le type d'erreur pour un message plus spécifique
      let title = "Erreur d'estimation";
      let description = errorMessage;
      
      if (errorMessage.includes('quota') || errorMessage.includes('crédits') || errorMessage.includes('exceeded')) {
        title = "Quota OpenAI dépassé";
        description = "Votre compte OpenAI a atteint sa limite de crédits. Veuillez ajouter des crédits sur votre compte OpenAI.";
      } else if (errorMessage.includes('rate limit') || errorMessage.includes('limite de requêtes')) {
        title = "Limite de requêtes atteinte";
        description = "Vous avez atteint la limite de requêtes. Veuillez patienter quelques minutes avant de réessayer.";
      } else if (errorMessage.includes('API key') || errorMessage.includes('clé API')) {
        title = "Erreur de configuration";
        description = "La clé API OpenAI est invalide. Veuillez vérifier votre configuration.";
      }
      
      toast({
        title,
        description: description.length > 200 ? description.substring(0, 200) + '...' : description,
        variant: "destructive",
        duration: 10000 // Afficher plus longtemps pour les erreurs importantes
      });
      
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);
  
  return { analyzeChantier, isLoading, result };
};

/**
 * Enrichit les matériaux de l'estimation avec les matériaux existants
 */
function enrichMaterialsWithExisting(
  estimation: EstimationResult,
  existingMaterials: Material[]
): EstimationResult {
  const enrichedMateriaux = estimation.materiaux.map((mat) => {
    // Extraire la quantité numérique de la chaîne
    const quantiteMatch = mat.quantite.toString().match(/(\d+(?:[.,]\d+)?)/);
    const quantite = quantiteMatch ? parseFloat(quantiteMatch[1].replace(',', '.')) : 0;
    
    // Créer un objet pour le matching
    const estimationMaterial = {
      nom: mat.nom,
      quantite: quantite,
      unite: mat.unite || 'unité',
      prixUnitaire: mat.prixUnitaire || 0,
      prixTotal: mat.prixTotal || 0
    };
    
    // Chercher le meilleur match
    const match = findBestMaterialMatch(estimationMaterial, existingMaterials);
    
    if (match && match.confidence >= 0.7) {
      // Matériau trouvé dans les paramètres
      return {
        ...mat,
        prixReel: true,
        materialId: match.material.id,
        confidence: match.confidence,
        prixUnitaire: match.material.unitPrice,
        prixTotal: match.prixCalcule
      };
    } else {
      // Matériau non trouvé
      return {
        ...mat,
        prixReel: false,
        needsAdding: true,
        confidence: match?.confidence || 0
      };
    }
  });
  
  // Recalculer le coût total des matériaux
  const totalMateriaux = enrichedMateriaux.reduce((sum, mat) => sum + (mat.prixTotal || 0), 0);
  
  // Recalculer le coût total
  const newCoutTotal = (estimation.detailsCouts?.mainOeuvre || 0) + 
                       totalMateriaux + 
                       (estimation.detailsCouts?.transport || 0) + 
                       (estimation.detailsCouts?.outillage || 0) + 
                       (estimation.detailsCouts?.gestionDechets || 0);
  
  return {
    ...estimation,
    materiaux: enrichedMateriaux,
    detailsCouts: {
      ...estimation.detailsCouts,
      materiaux: totalMateriaux
    },
    coutTotal: newCoutTotal,
    benefice: newCoutTotal - (newCoutTotal - (estimation.marge || 0))
  };
}
