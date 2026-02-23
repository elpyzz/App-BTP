import OpenAI from 'openai';
// Ne pas importer fast-levenshtein au niveau du module, on le chargera dynamiquement

// Prompt système ultra-précis
export const PROMPT_SYSTEME_OPTIMISE = `Tu es un expert en estimation BTP français avec 20 ans d'expérience. 
Tu connais parfaitement:
- Les prix matériaux 2024-2025 par région
- Les temps de pose réels selon le métier
- Les coûts de main d'œuvre par région
- Les marges standards par type de chantier
- Les normes françaises (DTU, NF, Qualibat)

RÈGLES ABSOLUES:
1. Analyse TRÈS précisément chaque photo
2. Utilise les prix des matériaux fournis quand ils correspondent EXACTEMENT
3. Pour les matériaux non fournis, utilise les prix de marché français actuels
4. Calcule les quantités au m² près
5. Applique les coefficients de perte réels (5-15% selon matériau)
6. Inclus TOUS les coûts cachés (préparation, nettoyage, finitions)
7. Réponds EXCLUSIVEMENT en JSON valide, sans markdown

FORMAT RÉPONSE OBLIGATOIRE:
{
  "tempsRealisation": "X jours ouvrés",
  "materiaux": [
    {
      "nom": "Nom exact du matériau",
      "quantite": nombre,
      "unite": "m²|kg|L|unité",
      "prixUnitaire": nombre,
      "prixTotal": nombre,
      "coefficientPerte": nombre,
      "quantiteAvecPerte": nombre
    }
  ],
  "nombreOuvriers": nombre,
  "coutTotal": nombre,
  "detailsCouts": {
    "materiaux": nombre,
    "mainOeuvre": nombre,
    "transport": nombre,
    "outillage": nombre,
    "gestionDechets": nombre
  },
  "marge": nombre,
  "benefice": nombre,
  "recommandations": ["rec1", "rec2"],
  "difficulteChantier": "faible|moyenne|élevée",
  "facteursPrix": ["facteur1", "facteur2"]
}`;

// Fonction d'optimisation d'images avec Sharp (avec fallback)
export async function optimizeImages(files: Array<{ buffer: Buffer; mimetype: string }>): Promise<string[]> {
  const optimizedImages = await Promise.all(
    files.map(async (file, index) => {
      try {
        // Essayer d'utiliser Sharp (peut ne pas être disponible sur Vercel)
        const sharp = await import('sharp').catch(() => null);
        if (sharp && sharp.default) {
          const optimized = await sharp.default(file.buffer)
            .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
            .jpeg({ quality: 85 })
            .toBuffer();
          return optimized.toString('base64');
        } else {
          // Fallback si Sharp n'est pas disponible (sur Vercel par exemple)
          console.warn(`Sharp non disponible pour l'image ${index}, utilisation de l'image originale`);
          return file.buffer.toString('base64');
        }
      } catch (error) {
        console.error(`Erreur optimisation image ${index}:`, error);
        // Fallback: utiliser l'image originale en base64
        return file.buffer.toString('base64');
      }
    })
  );
  return optimizedImages;
}

// Fonction de construction du prompt utilisateur
export function buildPromptUtilisateur(
  surface: string,
  metier: string,
  materiaux: string,
  localisation: string,
  delai: string,
  existingMaterials: any[]
): string {
  const materiauxDisponibles = existingMaterials.map((mat: any) => 
    `- ${mat.name} (${mat.category}): ${mat.unitPrice}€/${mat.unit}`
  ).join('\n');
  
  return `
CHANTIER À ANALYSER:
Surface: ${surface} m²
Métier: ${metier}
Matériaux mentionnés: ${materiaux}
Localisation: ${localisation}
Délai souhaité: ${delai}

MATÉRIAUX DISPONIBLES AVEC PRIX RÉELS:
${materiauxDisponibles || 'Aucun matériau enregistré'}

INSTRUCTIONS SPÉCIFIQUES:
- Analyse les photos pour identifier le type exact de travaux
- Pour ${metier}, applique les temps de pose standards français
- Région ${localisation}: ajuste les prix selon l'indice BT01
- Délai ${delai}: applique un coefficient d'urgence si nécessaire
- Utilise IMPÉRATIVEMENT les prix des matériaux disponibles quand ils correspondent
- Calcule précisément les quantités selon la surface ${surface} m²
- Ajoute les matériaux complémentaires nécessaires (primaire, joint, etc.)
`;
}

// Fonction de parsing JSON ultra-robuste
export function parseGPTResponse(content: string | null | undefined): any {
  if (!content) {
    throw new Error('Réponse GPT vide');
  }
  
  let jsonStr = content.trim();
  
  // Suppression du markdown si présent
  jsonStr = jsonStr.replace(/^```json\s*/i, '').replace(/```$/i, '');
  jsonStr = jsonStr.replace(/^```\s*/, '').replace(/```$/, '');
  
  // Extraction du JSON si mélangé avec du texte
  const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    jsonStr = jsonMatch[0];
  }
  
  try {
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error('Erreur parsing JSON:', error);
    console.log('Contenu brut:', content);
    
    // Tentative de réparation automatique
    let repaired = jsonStr
      .replace(/,(\s*[}\]])/g, '$1') // Virgules traînantes
      .replace(/([{,]\s*)(\w+):/g, '$1"$2":'); // Clés sans guillemets (basique)
    
    try {
      return JSON.parse(repaired);
    } catch (repairError) {
      throw new Error(`Impossible de parser la réponse GPT: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  }
}

// Fonction d'enrichissement avec matériaux existants
export function enrichirAvecMateriauxExistants(estimation: any, existingMaterials: any[]): any {
  if (!estimation.materiaux || !Array.isArray(estimation.materiaux)) {
    return estimation;
  }
  
  const enrichedMateriaux = estimation.materiaux.map((mat: any) => {
    // Normaliser le nom pour le matching
    const normalizeString = (str: string) => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w\s]/g, '').trim();
    
    let bestMatch: any = null;
    let bestScore = 0;
    
    for (const existing of existingMaterials) {
      const name1 = normalizeString(mat.nom);
      const name2 = normalizeString(existing.name);
      
      // Score par nom
      let nameScore = 0;
      if (name1 === name2) {
        nameScore = 1.0;
      } else if (name1.includes(name2) || name2.includes(name1)) {
        nameScore = 0.9;
      } else {
        // Charger Levenshtein dynamiquement avec fallback
        try {
          // @ts-ignore - fast-levenshtein n'a pas de types
          const Levenshtein = require('fast-levenshtein');
          const distance = Levenshtein.get(name1, name2);
          const maxLength = Math.max(name1.length, name2.length);
          if (maxLength > 0) {
            nameScore = Math.max(0, (maxLength - distance) / maxLength);
          }
        } catch (e) {
          // Si Levenshtein n'est pas disponible, utiliser une comparaison simple
          console.warn('Levenshtein non disponible, utilisation du fallback:', e);
          nameScore = calculateSimpleSimilarity(name1, name2);
        }
      }
      
      // Score par unité
      const unitScore = mat.unite?.toLowerCase() === existing.unit?.toLowerCase() ? 1 : 0;
      
      const totalScore = (nameScore * 0.8) + (unitScore * 0.2);
      
      if (totalScore > bestScore && totalScore >= 0.7) {
        bestScore = totalScore;
        const quantite = typeof mat.quantite === 'number' ? mat.quantite : parseFloat(mat.quantite.toString().replace(',', '.')) || 0;
        bestMatch = {
          material: existing,
          confidence: totalScore,
          prixCalcule: quantite * existing.unitPrice
        };
      }
    }
    
    if (bestMatch) {
      return {
        ...mat,
        prixReel: true,
        materialId: bestMatch.material.id,
        confidence: bestMatch.confidence,
        prixUnitaire: bestMatch.material.unitPrice,
        prixTotal: bestMatch.prixCalcule
      };
    } else {
      return {
        ...mat,
        prixReel: false,
        needsAdding: true
      };
    }
  });
  
  // Recalculer le coût total des matériaux
  const totalMateriaux = enrichedMateriaux.reduce((sum: number, mat: any) => sum + (mat.prixTotal || 0), 0);
  
  return {
    ...estimation,
    materiaux: enrichedMateriaux,
    detailsCouts: {
      ...estimation.detailsCouts,
      materiaux: totalMateriaux
    }
  };
}

// Fonction de similarité simple si Levenshtein n'est pas disponible
function calculateSimpleSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  if (longer.length === 0) return 1.0;
  
  // Calcul simple basé sur la longueur et les caractères communs
  let commonChars = 0;
  for (let i = 0; i < shorter.length; i++) {
    if (longer.includes(shorter[i])) {
      commonChars++;
    }
  }
  
  const similarity = commonChars / longer.length;
  return Math.max(0, similarity);
}
