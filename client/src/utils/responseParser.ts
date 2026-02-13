/**
 * Parse et valide la réponse JSON de GPT
 */

export interface EstimationMaterial {
  nom: string;
  quantite: number;
  quantiteAvecPerte?: number;
  unite: string;
  prixUnitaire: number;
  prixTotal: number;
  coefficientPerte?: number;
}

export interface EstimationResult {
  tempsRealisation: string;
  materiaux: EstimationMaterial[];
  nombreOuvriers: number;
  coutTotal: number;
  detailsCouts: {
    materiaux: number;
    mainOeuvre: number;
    transport: number;
    outillage: number;
    gestionDechets: number;
  };
  marge: number;
  benefice: number;
  recommandations: string[];
  difficulteChantier?: string;
  facteursPrix?: string[];
}

/**
 * Valide la structure de l'estimation
 */
function validateEstimationStructure(obj: any): void {
  const required = ['tempsRealisation', 'materiaux', 'nombreOuvriers', 'coutTotal'];
  
  for (const field of required) {
    if (!(field in obj)) {
      throw new Error(`Champ manquant: ${field}`);
    }
  }
  
  if (!Array.isArray(obj.materiaux)) {
    throw new Error('Le champ "materiaux" doit être un tableau');
  }
  
  for (const [index, material] of obj.materiaux.entries()) {
    const requiredMaterialFields = ['nom', 'quantite', 'unite', 'prixTotal'];
    for (const field of requiredMaterialFields) {
      if (!(field in material)) {
        throw new Error(`Matériau ${index}: champ manquant "${field}"`);
      }
    }
  }
}

/**
 * Tente de réparer un JSON malformé
 */
function attemptJsonRepair(jsonStr: string): any {
  // Réparations courantes
  let repaired = jsonStr
    .replace(/,(\s*[}\]])/g, '$1') // Virgules traînantes
    .replace(/([{,]\s*)(\w+):/g, '$1"$2":') // Clés sans guillemets
    .replace(/:\s*([^",{\[\]\s]+)([,}\]])/g, ': "$1"$2'); // Valeurs sans guillemets (basique)
  
  try {
    return JSON.parse(repaired);
  } catch (error) {
    throw new Error('Impossible de parser la réponse GPT');
  }
}

/**
 * Parse la réponse de GPT en JSON valide
 */
export function parseGPTResponse(content: string | null | undefined): EstimationResult {
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
    const parsed = JSON.parse(jsonStr);
    
    // Validation de la structure
    validateEstimationStructure(parsed);
    
    return parsed as EstimationResult;
  } catch (error) {
    console.error('Erreur parsing JSON:', error);
    console.log('Contenu brut:', content);
    
    // Tentative de réparation automatique
    try {
      const repaired = attemptJsonRepair(jsonStr);
      validateEstimationStructure(repaired);
      return repaired as EstimationResult;
    } catch (repairError) {
      throw new Error(`Erreur lors du parsing de la réponse GPT: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  }
}
