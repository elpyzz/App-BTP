import Levenshtein from 'fast-levenshtein';
import type { Material } from './materials';

export interface MaterialMatch {
  material: Material;
  confidence: number;
  prixCalcule: number;
}

export interface EstimationMaterial {
  nom: string;
  quantite: number;
  unite: string;
  prixUnitaire?: number;
  prixTotal?: number;
}

/**
 * Normalise une chaîne de caractères pour la comparaison
 */
function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Supprime les accents
    .replace(/[^\w\s]/g, '') // Supprime la ponctuation
    .trim();
}

/**
 * Calcule un score de similarité entre deux noms de matériaux
 */
function calculateNameScore(name1: string, name2: string): number {
  const n1 = normalizeString(name1);
  const n2 = normalizeString(name2);
  
  // Score exact
  if (n1 === n2) return 1.0;
  
  // Score par inclusion
  if (n1.includes(n2) || n2.includes(n1)) return 0.9;
  
  // Score Levenshtein normalisé
  const distance = Levenshtein.get(n1, n2);
  const maxLength = Math.max(n1.length, n2.length);
  if (maxLength === 0) return 0;
  
  return Math.max(0, (maxLength - distance) / maxLength);
}

/**
 * Trouve le meilleur match pour un matériau d'estimation dans la liste des matériaux existants
 */
export function findBestMaterialMatch(
  estimationMaterial: EstimationMaterial,
  existingMaterials: Material[]
): MaterialMatch | null {
  
  let bestMatch: MaterialMatch | null = null;
  let bestScore = 0;
  
  for (const existing of existingMaterials) {
    // Matching par nom (80% du score)
    const nameScore = calculateNameScore(estimationMaterial.nom, existing.name);
    
    // Matching par unité (20% du score)
    const unitScore = estimationMaterial.unite.toLowerCase() === existing.unit.toLowerCase() ? 1 : 0;
    
    const totalScore = (nameScore * 0.8) + (unitScore * 0.2);
    
    // Seuil de confiance 70%
    if (totalScore > bestScore && totalScore >= 0.7) {
      bestScore = totalScore;
      
      // Calculer le prix total avec le matériau existant
      const quantite = estimationMaterial.quantite || 0;
      const prixCalcule = quantite * existing.unitPrice;
      
      bestMatch = {
        material: existing,
        confidence: totalScore,
        prixCalcule
      };
    }
  }
  
  return bestMatch;
}
