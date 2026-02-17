import { supabase } from '@/lib/supabaseClient';

export interface Prospect {
  id: string;
  user_id?: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  notes?: string;
  status: string;
  column_id: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Helper pour obtenir l'ID de l'utilisateur actuel
 */
async function getCurrentUserId(): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id || null;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

/**
 * Charge tous les prospects depuis Supabase (filtrés par user_id)
 */
export async function loadProspects(): Promise<Prospect[]> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      console.warn('No user ID, returning empty prospects');
      return [];
    }

    const { data, error } = await supabase
      .from('prospects')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error loading prospects:', error);
    return [];
  }
}

/**
 * Crée un nouveau prospect dans Supabase
 */
export async function createProspect(prospect: Omit<Prospect, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<Prospect> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('prospects')
      .insert({
        ...prospect,
        user_id: userId,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating prospect:', error);
    throw error;
  }
}

/**
 * Met à jour un prospect dans Supabase
 */
export async function updateProspect(id: string, updates: Partial<Prospect>): Promise<Prospect> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('prospects')
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating prospect:', error);
    throw error;
  }
}

/**
 * Supprime un prospect depuis Supabase
 */
export async function deleteProspect(id: string): Promise<void> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      throw new Error('User not authenticated');
    }

    const { error } = await supabase
      .from('prospects')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting prospect:', error);
    throw error;
  }
}

/**
 * Met à jour la colonne d'un prospect (pour le drag & drop)
 */
export async function updateProspectColumn(id: string, columnId: string, status: string): Promise<Prospect> {
  return updateProspect(id, { column_id: columnId, status });
}
