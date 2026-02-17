import { Quote, QuoteSchema, generateId, generateQuoteNumber, calculateExpirationDate } from '@/lib/quotes/types';
import { supabase } from '@/lib/supabaseClient';

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
 * Charge les devis depuis Supabase (filtrés par user_id)
 */
export async function loadQuotesFromSupabase(filters?: {
  dossierId?: string;
  status?: string;
}): Promise<Quote[]> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      console.warn('No user ID, returning empty quotes');
      return [];
    }

    let query = supabase
      .from('quotes')
      .select('*')
      .eq('user_id', userId);

    if (filters?.dossierId) {
      query = query.eq('dossier_id', filters.dossierId);
    }
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;

    // Valider chaque devis avec Zod
    const quotes: Quote[] = [];
    for (const item of data || []) {
      const result = QuoteSchema.safeParse(item);
      if (result.success) {
        quotes.push(result.data);
      } else {
        console.warn('Devis invalide ignoré:', result.error);
      }
    }

    return quotes;
  } catch (error) {
    console.error('Error loading quotes from Supabase:', error);
    return [];
  }
}

/**
 * Sauvegarde un devis dans Supabase (avec user_id)
 */
export async function saveQuoteToSupabase(quote: Quote): Promise<Quote> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      throw new Error('User not authenticated');
    }

    // Générer numéro et dates si nouveau devis
    if (!quote.quoteNumber) {
      const existing = await loadQuotesFromSupabase();
      quote.quoteNumber = generateQuoteNumber(existing);
    }

    if (!quote.id) {
      quote.id = generateId();
    }

    if (!quote.expirationDate && quote.issueDate) {
      quote.expirationDate = calculateExpirationDate(quote.issueDate, quote.validityDays || 30);
    }

    // Préparer les données pour Supabase (inclure user_id)
    const quoteData = {
      ...quote,
      user_id: userId,
    };

    // Vérifier si le devis existe déjà
    const { data: existing } = await supabase
      .from('quotes')
      .select('id')
      .eq('id', quote.id)
      .eq('user_id', userId)
      .single();

    let result;
    if (existing) {
      // Mise à jour
      const { data, error } = await supabase
        .from('quotes')
        .update(quoteData)
        .eq('id', quote.id)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else {
      // Création
      const { data, error } = await supabase
        .from('quotes')
        .insert(quoteData)
        .select()
        .single();

      if (error) throw error;
      result = data;
    }

    // Valider le résultat
    const validated = QuoteSchema.safeParse(result);
    if (!validated.success) {
      console.error('Erreur de validation après sauvegarde:', validated.error);
      throw new Error('Données invalides après sauvegarde');
    }

    // Déclencher événement pour notifier les autres composants
    window.dispatchEvent(new Event('quotesUpdated'));

    return validated.data;
  } catch (error) {
    console.error('Error saving quote to Supabase:', error);
    throw error;
  }
}

/**
 * Supprime un devis depuis Supabase (avec vérification user_id)
 */
export async function deleteQuoteFromSupabase(id: string): Promise<void> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      throw new Error('User not authenticated');
    }

    const { error } = await supabase
      .from('quotes')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;

    // Déclencher événement pour notifier les autres composants
    window.dispatchEvent(new Event('quotesUpdated'));
  } catch (error) {
    console.error('Error deleting quote from Supabase:', error);
    throw error;
  }
}

/**
 * Charge un devis par ID depuis Supabase (avec vérification user_id)
 */
export async function loadQuoteFromSupabase(id: string): Promise<Quote | null> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return null;
    }

    const { data, error } = await supabase
      .from('quotes')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // No rows returned
        return null;
      }
      throw error;
    }

    if (!data) return null;

    const result = QuoteSchema.safeParse(data);
    if (result.success) {
      return result.data;
    } else {
      console.warn('Devis invalide:', result.error);
      return null;
    }
  } catch (error) {
    console.error('Error loading quote from Supabase:', error);
    return null;
  }
}

/**
 * Fonctions unifiées - utilisent maintenant Supabase directement
 */
export async function loadQuotes(filters?: {
  dossierId?: string;
  status?: string;
}): Promise<Quote[]> {
  return loadQuotesFromSupabase(filters);
}

export async function saveQuote(quote: Quote): Promise<Quote> {
  return saveQuoteToSupabase(quote);
}

export async function loadQuote(id: string): Promise<Quote | null> {
  return loadQuoteFromSupabase(id);
}

export async function deleteQuote(id: string): Promise<void> {
  return deleteQuoteFromSupabase(id);
}

/**
 * Fonctions de compatibilité avec localStorage (dépréciées, conservées pour migration)
 * @deprecated Utiliser les fonctions Supabase directement
 */
export async function loadQuotesFromLocalStorage(): Promise<Quote[]> {
  console.warn('loadQuotesFromLocalStorage is deprecated, use loadQuotesFromSupabase');
  return loadQuotesFromSupabase();
}

export async function saveQuotesToLocalStorage(quotes: Quote[]): Promise<void> {
  console.warn('saveQuotesToLocalStorage is deprecated, use saveQuoteToSupabase for each quote');
  // Migrer tous les quotes vers Supabase
  for (const quote of quotes) {
    try {
      await saveQuoteToSupabase(quote);
    } catch (error) {
      console.error(`Error migrating quote ${quote.id}:`, error);
    }
  }
}

export async function loadQuoteFromLocalStorage(id: string): Promise<Quote | null> {
  console.warn('loadQuoteFromLocalStorage is deprecated, use loadQuoteFromSupabase');
  return loadQuoteFromSupabase(id);
}

export async function saveQuoteToLocalStorage(quote: Quote): Promise<Quote> {
  console.warn('saveQuoteToLocalStorage is deprecated, use saveQuoteToSupabase');
  return saveQuoteToSupabase(quote);
}

export async function deleteQuoteFromLocalStorage(id: string): Promise<void> {
  console.warn('deleteQuoteFromLocalStorage is deprecated, use deleteQuoteFromSupabase');
  return deleteQuoteFromSupabase(id);
}
