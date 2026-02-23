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
 * Convertit un objet Quote (camelCase) vers le format Supabase (snake_case)
 * Exclut created_at et updated_at car Supabase les gère automatiquement
 * Filtre les valeurs undefined/null pour éviter les erreurs Supabase
 */
function quoteToSupabase(quote: Quote): any {
  const data: any = {
    quote_number: quote.quoteNumber,
    status: quote.status,
    issue_date: quote.issueDate,
    validity_days: quote.validityDays ?? 30,
    expiration_date: quote.expirationDate,
    client: quote.client,
    company: quote.company,
    chantier: quote.chantier,
    lots: quote.lots || [],
    lines: quote.lines || [],
  };

  // Ajouter l'ID seulement s'il est un UUID valide
  if (quote.id && quote.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
    data.id = quote.id;
  }

  // Ajouter les champs optionnels seulement s'ils sont définis
  if (quote.dossierId) data.dossier_id = quote.dossierId;
  if (quote.salesPerson) data.sales_person = quote.salesPerson;
  if (quote.clientReference) data.client_reference = quote.clientReference;
  if (quote.discount) data.discount = quote.discount;
  if (quote.deposit) data.deposit = quote.deposit;
  if (quote.paymentSchedule) data.payment_schedule = quote.paymentSchedule;
  if (quote.travelCosts !== undefined && quote.travelCosts !== null && quote.travelCosts !== 0) {
    data.travel_costs = Number(quote.travelCosts);
  }
  if (quote.conditions) data.conditions = quote.conditions;
  if (quote.signature) data.signature = quote.signature;
  if (quote.notes) data.notes = quote.notes;

  // Ajouter les colonnes numériques seulement si elles ont une valeur non-nulle
  // Les colonnes avec DEFAULT 0 seront gérées par Supabase si on ne les envoie pas
  const subtotalHT = Number(quote.subtotalHT ?? 0);
  if (subtotalHT !== 0) data.subtotal_ht = subtotalHT;

  const discountAmount = Number(quote.discountAmount ?? 0);
  if (discountAmount !== 0) data.discount_amount = discountAmount;

  const totalHT = Number(quote.totalHT ?? 0);
  if (totalHT !== 0) data.total_ht = totalHT;

  const vatBreakdown = quote.vatBreakdown || [];
  if (vatBreakdown.length > 0) data.vat_breakdown = vatBreakdown;

  const totalTVA = Number(quote.totalTVA ?? 0);
  if (totalTVA !== 0) data.total_tva = totalTVA;

  const totalTTC = Number(quote.totalTTC ?? 0);
  if (totalTTC !== 0) data.total_ttc = totalTTC;

  // Envoyer deposit_amount et remaining_amount seulement si elles ont une valeur non-nulle
  // Si elles valent 0, laisser Supabase utiliser la valeur par défaut (évite le problème de cache)
  const depositAmount = Number(quote.depositAmount ?? 0);
  if (depositAmount !== 0) {
    data.deposit_amount = depositAmount;
  }

  const remainingAmount = Number(quote.remainingAmount ?? 0);
  if (remainingAmount !== 0) {
    data.remaining_amount = remainingAmount;
  }

  return data;
}

/**
 * Convertit un objet Supabase (snake_case) vers le format Quote (camelCase)
 * Convertit les valeurs null en undefined pour les champs optionnels
 */
function supabaseToQuote(data: any): Quote {
  return {
    id: data.id,
    quoteNumber: data.quote_number,
    status: data.status,
    issueDate: data.issue_date,
    validityDays: data.validity_days ?? 30,
    expirationDate: data.expiration_date,
    dossierId: data.dossier_id ?? undefined,
    salesPerson: data.sales_person ?? undefined,
    clientReference: data.client_reference ?? undefined,
    client: data.client,
    company: data.company,
    chantier: data.chantier,
    lots: data.lots || [],
    lines: data.lines || [],
    discount: data.discount ?? undefined,
    deposit: data.deposit ?? undefined,
    paymentSchedule: data.payment_schedule ?? undefined,
    travelCosts: data.travel_costs ? parseFloat(data.travel_costs) : undefined,
    subtotalHT: parseFloat(data.subtotal_ht || 0),
    discountAmount: parseFloat(data.discount_amount || 0),
    totalHT: parseFloat(data.total_ht || 0),
    vatBreakdown: data.vat_breakdown || [],
    totalTVA: parseFloat(data.total_tva || 0),
    totalTTC: parseFloat(data.total_ttc || 0),
    depositAmount: parseFloat(data.deposit_amount || 0),
    remainingAmount: parseFloat(data.remaining_amount || 0),
    conditions: data.conditions ?? undefined,
    signature: data.signature ?? undefined,
    notes: data.notes ?? undefined,
    createdAt: data.created_at || new Date().toISOString(),
    updatedAt: data.updated_at || new Date().toISOString(),
  };
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

    // Convertir et valider chaque devis
    const quotes: Quote[] = [];
    for (const item of data || []) {
      try {
        const quote = supabaseToQuote(item);
        const result = QuoteSchema.safeParse(quote);
        if (result.success) {
          quotes.push(result.data);
        } else {
          console.warn('Devis invalide ignoré:', result.error);
        }
      } catch (err) {
        console.warn('Erreur lors de la conversion du devis:', err);
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

    if (!quote.expirationDate && quote.issueDate) {
      quote.expirationDate = calculateExpirationDate(quote.issueDate, quote.validityDays || 30);
    }

    // Convertir vers le format Supabase (snake_case)
    const baseData = quoteToSupabase(quote);
    const quoteData: any = {
      ...baseData,
      user_id: userId,
    };

    // Pour les nouveaux devis, ne pas envoyer l'ID (Supabase le générera automatiquement)
    // Pour les mises à jour, garder l'ID seulement s'il est un UUID valide
    const isNewQuote = !quote.id || !quote.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    if (isNewQuote) {
      delete quoteData.id;
    }

    // Vérifier si le devis existe déjà (seulement si on a un ID valide)
    let existing = null;
    if (quoteData.id) {
      const { data } = await supabase
        .from('quotes')
        .select('id')
        .eq('id', quoteData.id)
        .eq('user_id', userId)
        .single();
      existing = data;
    }

    let result;
    if (existing) {
      // Mise à jour
      const { data, error } = await supabase
        .from('quotes')
        .update(quoteData)
        .eq('id', quoteData.id)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        // Message d'erreur plus clair pour les problèmes de schéma
        if (error.code === 'PGRST204') {
          const columnName = error.message?.match(/column ['"]([^'"]+)['"]/i)?.[1] || 'inconnue';
          throw new Error(`La colonne "${columnName}" n'existe pas dans la table quotes. Message Supabase: ${error.message}. Veuillez recréer la table avec le script SQL complet.`);
        }
        throw error;
      }
      result = data;
    } else {
      // Création
      const { data, error } = await supabase
        .from('quotes')
        .insert(quoteData)
        .select()
        .single();

      if (error) {
        // Message d'erreur plus clair pour les problèmes de schéma
        if (error.code === 'PGRST204') {
          const columnName = error.message?.match(/column ['"]([^'"]+)['"]/i)?.[1] || 'inconnue';
          throw new Error(`La colonne "${columnName}" n'existe pas dans la table quotes. Message Supabase: ${error.message}. Veuillez recréer la table avec le script SQL complet.`);
        }
        throw error;
      }
      result = data;
    }

    // Convertir et valider le résultat
    const convertedQuote = supabaseToQuote(result);
    const validated = QuoteSchema.safeParse(convertedQuote);
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

    // Convertir et valider
    const quote = supabaseToQuote(data);
    const result = QuoteSchema.safeParse(quote);
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
