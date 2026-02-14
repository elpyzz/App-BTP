import { Quote, QuoteSchema, generateId, generateQuoteNumber, calculateExpirationDate } from '@/lib/quotes/types';

/**
 * Charge les devis depuis localStorage
 */
export async function loadQuotesFromLocalStorage(): Promise<Quote[]> {
  try {
    const stored = localStorage.getItem('quotes_data');
    if (stored) {
      const parsed = JSON.parse(stored);
      // Valider chaque devis avec Zod
      const quotes: Quote[] = [];
      for (const item of parsed) {
        const result = QuoteSchema.safeParse(item);
        if (result.success) {
          quotes.push(result.data);
        } else {
          console.warn('Devis invalide ignoré:', result.error);
        }
      }
      return quotes;
    }
  } catch (error) {
    console.error('Error loading quotes from localStorage:', error);
  }
  return [];
}

/**
 * Sauvegarde les devis dans localStorage
 */
export async function saveQuotesToLocalStorage(quotes: Quote[]): Promise<void> {
  try {
    localStorage.setItem('quotes_data', JSON.stringify(quotes));
    // Déclencher événement pour notifier les autres composants
    window.dispatchEvent(new Event('quotesUpdated'));
  } catch (error) {
    console.error('Error saving quotes to localStorage:', error);
    throw error;
  }
}

/**
 * Charge un devis par ID depuis localStorage
 */
export async function loadQuoteFromLocalStorage(id: string): Promise<Quote | null> {
  const quotes = await loadQuotesFromLocalStorage();
  return quotes.find(q => q.id === id) || null;
}

/**
 * Sauvegarde un devis (création ou mise à jour) dans localStorage
 */
export async function saveQuoteToLocalStorage(quote: Quote): Promise<Quote> {
  const quotes = await loadQuotesFromLocalStorage();
  const index = quotes.findIndex(q => q.id === quote.id);
  
  if (index >= 0) {
    // Mise à jour
    quotes[index] = quote;
  } else {
    // Création
    quotes.push(quote);
  }
  
  await saveQuotesToLocalStorage(quotes);
  return quote;
}

/**
 * Supprime un devis depuis localStorage
 */
export async function deleteQuoteFromLocalStorage(id: string): Promise<void> {
  const quotes = await loadQuotesFromLocalStorage();
  const filtered = quotes.filter(q => q.id !== id);
  await saveQuotesToLocalStorage(filtered);
}

/**
 * Charge les devis depuis Supabase (si configuré)
 */
export async function loadQuotesFromSupabase(filters?: {
  dossierId?: string;
  status?: string;
}): Promise<Quote[]> {
  try {
    const response = await fetch(
      `/api/quotes${filters ? '?' + new URLSearchParams(filters as any).toString() : ''}`
    );
    const result = await response.json();
    
    if (result.success) {
      return result.quotes || [];
    }
    throw new Error(result.error || 'Erreur lors du chargement');
  } catch (error) {
    console.error('Error loading quotes from Supabase:', error);
    // Fallback sur localStorage
    return loadQuotesFromLocalStorage();
  }
}

/**
 * Sauvegarde un devis dans Supabase (si configuré)
 */
export async function saveQuoteToSupabase(quote: Quote): Promise<Quote> {
  try {
    const method = quote.id ? 'PUT' : 'POST';
    const url = quote.id ? `/api/quotes/${quote.id}` : '/api/quotes';
    
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(quote),
    });
    
    const result = await response.json();
    
    if (result.success) {
      return result.quote;
    }
    throw new Error(result.error || 'Erreur lors de la sauvegarde');
  } catch (error) {
    console.error('Error saving quote to Supabase:', error);
    // Fallback sur localStorage
    return saveQuoteToLocalStorage(quote);
  }
}

/**
 * Supprime un devis depuis Supabase (si configuré)
 */
export async function deleteQuoteFromSupabase(id: string): Promise<void> {
  try {
    const response = await fetch(`/api/quotes/${id}`, {
      method: 'DELETE',
    });
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Erreur lors de la suppression');
    }
  } catch (error) {
    console.error('Error deleting quote from Supabase:', error);
    // Fallback sur localStorage
    await deleteQuoteFromLocalStorage(id);
  }
}

/**
 * Fonctions unifiées avec fallback automatique
 */
export async function loadQuotes(filters?: {
  dossierId?: string;
  status?: string;
}): Promise<Quote[]> {
  // Essayer Supabase d'abord, fallback localStorage
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return loadQuotesFromSupabase(filters);
  }
  return loadQuotesFromLocalStorage();
}

export async function saveQuote(quote: Quote): Promise<Quote> {
  // Générer numéro et dates si nouveau devis
  if (!quote.quoteNumber) {
    const existing = await loadQuotes();
    quote.quoteNumber = generateQuoteNumber(existing);
  }
  
  if (!quote.id) {
    quote.id = generateId();
  }
  
  if (!quote.expirationDate && quote.issueDate) {
    quote.expirationDate = calculateExpirationDate(quote.issueDate, quote.validityDays || 30);
  }
  
  // Essayer Supabase d'abord, fallback localStorage
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return saveQuoteToSupabase(quote);
  }
  return saveQuoteToLocalStorage(quote);
}

export async function loadQuote(id: string): Promise<Quote | null> {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    try {
      const response = await fetch(`/api/quotes/${id}`);
      const result = await response.json();
      if (result.success) {
        return result.quote;
      }
    } catch (error) {
      console.error('Error loading quote from Supabase:', error);
    }
  }
  return loadQuoteFromLocalStorage(id);
}

export async function deleteQuote(id: string): Promise<void> {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return deleteQuoteFromSupabase(id);
  }
  return deleteQuoteFromLocalStorage(id);
}
