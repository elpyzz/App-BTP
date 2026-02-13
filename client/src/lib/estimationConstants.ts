/**
 * Constantes pour les calculs d'estimation BTP
 */

/**
 * Coefficients de perte par type de matériau (en pourcentage)
 */
export const COEFFICIENTS_PERTE: Record<string, number> = {
  'carrelage': 0.05,      // 5%
  'faïence': 0.05,        // 5%
  'peinture': 0.03,       // 3%
  'enduit': 0.02,         // 2%
  'béton': 0.02,          // 2%
  'parquet': 0.08,        // 8%
  'lambris': 0.06,        // 6%
  'placo': 0.04,          // 4%
  'isolation': 0.03,      // 3%
  'tuile': 0.05,          // 5%
  'ardoise': 0.04,        // 4%
  'zinc': 0.03,           // 3%
  'default': 0.05          // 5% par défaut
};

/**
 * Temps de pose standards par métier (en heures par unité)
 */
export const TEMPS_POSE_STANDARDS: Record<string, Record<string, number>> = {
  'carreleur': {
    'sol': 0.5,           // heures/m²
    'mur': 0.8,           // heures/m²
    'salle_de_bain': 1.2  // heures/m²
  },
  'plombier': {
    'tube_cuivre': 0.3,   // heures/mètre
    'raccordement': 1.5,  // heures/unité
    'sanitaire': 2.0      // heures/unité
  },
  'peintre': {
    'mur': 0.15,          // heures/m²
    'plafond': 0.2,       // heures/m²
    'boiserie': 0.3       // heures/m²
  },
  'menuisier': {
    'porte': 2.0,         // heures/unité
    'fenetre': 3.0,       // heures/unité
    'placard': 4.0        // heures/unité
  },
  'electricien': {
    'prise': 0.5,         // heures/unité
    'interrupteur': 0.5,  // heures/unité
    'tableau': 4.0        // heures/unité
  }
};

/**
 * Marges sectorielles (en pourcentage)
 */
export const MARGES_STANDARDS: Record<string, number> = {
  'renovation': 0.25,     // 25%
  'neuf': 0.20,          // 20%
  'urgence': 0.35,       // 35%
  'gros_oeuvre': 0.15,   // 15%
  'second_oeuvre': 0.25, // 25%
  'default': 0.20        // 20% par défaut
};

/**
 * Obtient le coefficient de perte pour un matériau
 */
export function getCoefficientPerte(materialName: string): number {
  const nameLower = materialName.toLowerCase();
  
  for (const [key, value] of Object.entries(COEFFICIENTS_PERTE)) {
    if (nameLower.includes(key)) {
      return value;
    }
  }
  
  return COEFFICIENTS_PERTE.default;
}

/**
 * Obtient le temps de pose pour un métier et un type de travail
 */
export function getTempsPose(metier: string, typeTravail: string): number {
  const metierLower = metier.toLowerCase();
  const typeLower = typeTravail.toLowerCase();
  
  const tempsMetier = TEMPS_POSE_STANDARDS[metierLower];
  if (!tempsMetier) {
    return 0.5; // Temps par défaut
  }
  
  return tempsMetier[typeLower] || tempsMetier[Object.keys(tempsMetier)[0]] || 0.5;
}

/**
 * Obtient la marge selon le type de chantier
 */
export function getMarge(typeChantier: string): number {
  const typeLower = typeChantier.toLowerCase();
  
  for (const [key, value] of Object.entries(MARGES_STANDARDS)) {
    if (typeLower.includes(key)) {
      return value;
    }
  }
  
  return MARGES_STANDARDS.default;
}
