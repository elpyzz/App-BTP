import { Quote, QuoteSchema, generateId, generateQuoteNumber, calculateExpirationDate } from '@/lib/quotes/types';

/**
 * Charge les devis depuis localStorage
 */
export async function loadQuotesFromLocalStorage(): Promise<Quote[]> {
  try {
    const stored = localStorage.getItem('quotes_data');
    if (stored) {
      const parsed = JSON.parse(stored);
      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/92008ec0-4865-46b1-a863-69afada2c59a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'quotes.ts:9',message:'loadQuotesFromLocalStorage - devis parsés',data:{parsedCount:parsed.length,firstQuoteId:parsed[0]?.id,firstQuoteHasClient:parsed[0]?.client!==undefined,firstQuoteHasTotalTTC:parsed[0]?.totalTTC!==undefined},timestamp:Date.now(),runId:'run1',hypothesisId:'A,B,C'})}).catch(()=>{});
      // #endregion
      // Valider chaque devis avec Zod
      const quotes: Quote[] = [];
      for (const item of parsed) {
        const result = QuoteSchema.safeParse(item);
        if (result.success) {
          quotes.push(result.data);
        } else {
          // #region agent log
          fetch('http://127.0.0.1:7245/ingest/92008ec0-4865-46b1-a863-69afada2c59a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'quotes.ts:18',message:'Devis invalide ignoré',data:{itemId:item.id,error:result.error.errors.map((e:any)=>e.path.join('.')+': '+e.message).join(', ')},timestamp:Date.now(),runId:'run1',hypothesisId:'C'})}).catch(()=>{});
          // #endregion
          console.warn('Devis invalide ignoré:', result.error);
        }
      }
      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/92008ec0-4865-46b1-a863-69afada2c59a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'quotes.ts:21',message:'loadQuotesFromLocalStorage - validation terminée',data:{validQuotesCount:quotes.length,invalidQuotesCount:parsed.length-quotes.length},timestamp:Date.now(),runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
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
  // #region agent log
  fetch('http://127.0.0.1:7245/ingest/92008ec0-4865-46b1-a863-69afada2c59a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'quotes.ts:46',message:'loadQuoteFromLocalStorage appelé',data:{searchId:id},timestamp:Date.now(),runId:'run1',hypothesisId:'A,B'})}).catch(()=>{});
  // #endregion
  const quotes = await loadQuotesFromLocalStorage();
  // #region agent log
  fetch('http://127.0.0.1:7245/ingest/92008ec0-4865-46b1-a863-69afada2c59a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'quotes.ts:49',message:'loadQuoteFromLocalStorage - quotes chargés',data:{quotesCount:quotes.length,quoteIds:quotes.map(q=>q.id),matchingQuote:quotes.find(q=>q.id===id)?'trouvé':'non trouvé'},timestamp:Date.now(),runId:'run1',hypothesisId:'A,B,C'})}).catch(()=>{});
  // #endregion
  return quotes.find(q => q.id === id) || null;
}

/**
 * Sauvegarde un devis (création ou mise à jour) dans localStorage
 */
export async function saveQuoteToLocalStorage(quote: Quote): Promise<Quote> {
  // #region agent log
  fetch('http://127.0.0.1:7245/ingest/92008ec0-4865-46b1-a863-69afada2c59a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'quotes.ts:69',message:'saveQuoteToLocalStorage - Données reçues',data:{quoteId:quote.id,companyName:quote.company?.name,companyAddress:quote.company?.address,companyPhone:quote.company?.phone,companyEmail:quote.company?.email,companySiret:quote.company?.siret,clientName:quote.client?.name,chantierName:quote.chantier?.name,linesCount:quote.lines?.length},timestamp:Date.now(),runId:'run1',hypothesisId:'B'})}).catch(()=>{});
  // #endregion
  
  // Charger directement depuis localStorage SANS validation Zod pour préserver toutes les données
  let quotes: any[] = [];
  try {
    const stored = localStorage.getItem('quotes_data');
    if (stored) {
      quotes = JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error loading quotes from localStorage for save:', error);
  }
  
  const index = quotes.findIndex((q: any) => q.id === quote.id);
  
  if (index >= 0) {
    // Mise à jour
    quotes[index] = quote;
  } else {
    // Création
    quotes.push(quote);
  }
  
  // #region agent log
  const quoteToSave = quotes[index >= 0 ? index : quotes.length - 1];
  fetch('http://127.0.0.1:7245/ingest/92008ec0-4865-46b1-a863-69afada2c59a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'quotes.ts:78',message:'saveQuoteToLocalStorage - Avant écriture localStorage',data:{quoteId:quoteToSave.id,companyName:quoteToSave.company?.name,companyAddress:quoteToSave.company?.address,companyPhone:quoteToSave.company?.phone,companyEmail:quoteToSave.company?.email,companySiret:quoteToSave.company?.siret,quotesCount:quotes.length},timestamp:Date.now(),runId:'run1',hypothesisId:'B'})}).catch(()=>{});
  // #endregion
  
  await saveQuotesToLocalStorage(quotes);
  
  // #region agent log
  const savedData = localStorage.getItem('quotes_data');
  const parsedSaved = savedData ? JSON.parse(savedData) : [];
  const savedQuote = parsedSaved.find((q: any) => q.id === quote.id);
  fetch('http://127.0.0.1:7245/ingest/92008ec0-4865-46b1-a863-69afada2c59a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'quotes.ts:92',message:'saveQuoteToLocalStorage - Après écriture localStorage',data:{quoteId:savedQuote?.id,companyName:savedQuote?.company?.name,companyAddress:savedQuote?.company?.address,companyPhone:savedQuote?.company?.phone,companyEmail:savedQuote?.company?.email,companySiret:savedQuote?.company?.siret,hasCompany:!!savedQuote?.company,allKeys:Object.keys(savedQuote||{}).join(','),quotesInStorage:parsedSaved.length},timestamp:Date.now(),runId:'run1',hypothesisId:'B'})}).catch(()=>{});
  // #endregion
  
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
  // #region agent log
  fetch('http://127.0.0.1:7245/ingest/92008ec0-4865-46b1-a863-69afada2c59a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'quotes.ts:159',message:'loadQuotes appelé',data:{hasProcessEnv:typeof process!=='undefined',hasProcessEnvNextPublic:typeof process!=='undefined'&&typeof process.env!=='undefined'?typeof process.env.NEXT_PUBLIC_SUPABASE_URL:'N/A'},timestamp:Date.now(),runId:'run1',hypothesisId:'A,B'})}).catch(()=>{});
  // #endregion
  // Essayer Supabase d'abord, fallback localStorage
  // Note: Supabase est désactivé (mock), donc on utilise toujours localStorage
  // if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
  //   return loadQuotesFromSupabase(filters);
  // }
  return loadQuotesFromLocalStorage();
}

export async function saveQuote(quote: Quote): Promise<Quote> {
  // #region agent log
  fetch('http://127.0.0.1:7245/ingest/92008ec0-4865-46b1-a863-69afada2c59a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'quotes.ts:181',message:'saveQuote appelé',data:{hasProcessEnv:typeof process!=='undefined',hasProcessEnvNextPublic:typeof process!=='undefined'&&typeof process.env!=='undefined'?typeof process.env.NEXT_PUBLIC_SUPABASE_URL:'N/A',quoteId:quote.id},timestamp:Date.now(),runId:'run1',hypothesisId:'A,B'})}).catch(()=>{});
  // #endregion
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
  // Note: Supabase est désactivé (mock), donc on utilise toujours localStorage
  // if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
  //   return saveQuoteToSupabase(quote);
  // }
  return saveQuoteToLocalStorage(quote);
}

export async function loadQuote(id: string): Promise<Quote | null> {
  // Note: Supabase est désactivé (mock), donc on utilise toujours localStorage
  // if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
  //   try {
  //     const response = await fetch(`/api/quotes/${id}`);
  //     const result = await response.json();
  //     if (result.success) {
  //       return result.quote;
  //     }
  //   } catch (error) {
  //     console.error('Error loading quote from Supabase:', error);
  //   }
  // }
  return loadQuoteFromLocalStorage(id);
}

export async function deleteQuote(id: string): Promise<void> {
  // Note: Supabase est désactivé (mock), donc on utilise toujours localStorage
  // if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
  //   return deleteQuoteFromSupabase(id);
  // }
  return deleteQuoteFromLocalStorage(id);
}
