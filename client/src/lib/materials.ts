// Interface et fonctions helper pour gérer les matériaux dans localStorage

import { supabase } from './supabaseClient';

export interface Material {
  id: string;
  name: string;
  category: string;
  unitPrice: number;
  unit: string; // "m²", "m", "kg", "unité", "L", etc.
  user_id?: string | null; // Pour associer au membre d'équipe
  created_at: string;
  updated_at: string;
}

// Catégories de matériaux disponibles
export const MATERIAL_CATEGORIES = [
  'Carrelage / Faïence',
  'Peinture / Enduit',
  'Plomberie',
  'Électricité',
  'Menuiserie',
  'Isolation',
  'Autre'
];

// Unités de mesure disponibles
export const MATERIAL_UNITS = [
  'm²',
  'm',
  'kg',
  'L',
  'unité',
  'sac',
  'rouleau'
];

// Helper pour obtenir l'ID de l'utilisateur Supabase connecté
async function getCurrentUserId(): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id || null;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

// Charger depuis localStorage
function loadMaterialsFromStorage(): Material[] {
  const key = 'team_materials';
  const data = localStorage.getItem(key);
  if (data) {
    try {
      return JSON.parse(data);
    } catch {
      return [];
    }
  }
  return [];
}

// Sauvegarder dans localStorage
function saveMaterialsToStorage(materials: Material[]): void {
  const key = 'team_materials';
  try {
    localStorage.setItem(key, JSON.stringify(materials));
  } catch (error) {
    console.error('Erreur lors de la sauvegarde des matériaux:', error);
    throw new Error('Impossible de sauvegarder les matériaux. Le stockage local est peut-être plein.');
  }
}

// Récupérer tous les matériaux du membre connecté
export async function getMaterials(): Promise<Material[]> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return [];

    const allMaterials = loadMaterialsFromStorage();
    return allMaterials.filter((material: Material) => material.user_id === userId);
  } catch (error) {
    console.error('Error fetching materials:', error);
    return [];
  }
}

// Ajouter un nouveau matériau
export async function addMaterial(material: Omit<Material, 'id' | 'created_at' | 'updated_at' | 'user_id'>): Promise<Material | null> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('User not authenticated');

    const newMaterial: Material = {
      ...material,
      id: crypto.randomUUID(),
      user_id: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const allMaterials = loadMaterialsFromStorage();
    allMaterials.push(newMaterial);
    saveMaterialsToStorage(allMaterials);

    return newMaterial;
  } catch (error) {
    console.error('Error adding material:', error);
    throw error; // Propager l'erreur pour qu'elle soit visible
  }
}

// Modifier un matériau
export async function updateMaterial(id: string, updates: Partial<Omit<Material, 'id' | 'created_at' | 'user_id'>>): Promise<Material | null> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('User not authenticated');

    const allMaterials = loadMaterialsFromStorage();
    const index = allMaterials.findIndex((material: Material) => material.id === id && material.user_id === userId);

    if (index === -1) return null;

    allMaterials[index] = {
      ...allMaterials[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    saveMaterialsToStorage(allMaterials);

    return allMaterials[index];
  } catch (error) {
    console.error('Error updating material:', error);
    return null;
  }
}

// Supprimer un matériau
export async function deleteMaterial(id: string): Promise<boolean> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('User not authenticated');

    const allMaterials = loadMaterialsFromStorage();
    const filtered = allMaterials.filter((material: Material) => !(material.id === id && material.user_id === userId));
    saveMaterialsToStorage(filtered);

    return true;
  } catch (error) {
    console.error('Error deleting material:', error);
    return false;
  }
}

// Filtrer par catégorie
export async function getMaterialsByCategory(category: string): Promise<Material[]> {
  try {
    const materials = await getMaterials();
    if (category === 'all') return materials;
    return materials.filter((material: Material) => material.category === category);
  } catch (error) {
    console.error('Error filtering materials by category:', error);
    return [];
  }
}

// Rechercher par nom
export async function searchMaterials(query: string): Promise<Material[]> {
  try {
    const materials = await getMaterials();
    if (!query.trim()) return materials;
    
    const lowerQuery = query.toLowerCase();
    return materials.filter((material: Material) =>
      material.name.toLowerCase().includes(lowerQuery) ||
      material.category.toLowerCase().includes(lowerQuery)
    );
  } catch (error) {
    console.error('Error searching materials:', error);
    return [];
  }
}
