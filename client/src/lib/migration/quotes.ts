import { Quote, QuoteSchema, generateId, generateQuoteNumber, calculateExpirationDate } from '@/lib/quotes/types';
import { saveQuotesToLocalStorage, loadQuotesFromLocalStorage } from '@/lib/storage/quotes';

/**
 * Interface pour l'ancien format de devis (compatible avec DossiersPage)
 */
interface OldQuote {
  id: string;
  clientId: string;
  clientName: string;
  chantierId: string;
  chantierName: string;
  items: Array<{
    id: string;
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  subtotal: number;
  tva: number;
  total: number;
  validityDays: number;
  createdAt: string;
  isSigned?: boolean;
}

/**
 * Migre un devis de l'ancien format vers le nouveau format
 */
export function migrateOldQuoteToNew(oldQuote: OldQuote, company: any): Quote | null {
  try {
    // Convertir les items en QuoteLine
    const lines = oldQuote.items.map((item, index) => {
      const vatRate = "20" as const; // Par défaut 20%
      const totalHT = item.total / 1.2; // Approximatif si on n'a que le total TTC
      const totalTVA = item.total - totalHT;
      
      return {
        id: item.id || generateId(),
        description: item.description,
        quantity: item.quantity,
        unit: "unite" as const, // Par défaut
        unitPriceHT: item.unitPrice / 1.2, // Approximatif
        vatRate,
        totalHT: Math.round(totalHT * 100) / 100,
        totalTVA: Math.round(totalTVA * 100) / 100,
        totalTTC: item.total,
        order: index,
      };
    });

    // Créer le devis dans le nouveau format
    const newQuote: Quote = {
      id: oldQuote.id,
      quoteNumber: generateQuoteNumber([]), // Sera régénéré si nécessaire
      status: oldQuote.isSigned ? "accepted" : "draft",
      issueDate: oldQuote.createdAt.split('T')[0] || new Date().toISOString().split('T')[0],
      validityDays: oldQuote.validityDays || 30,
      expirationDate: calculateExpirationDate(
        oldQuote.createdAt.split('T')[0] || new Date().toISOString().split('T')[0],
        oldQuote.validityDays || 30
      ),
      company: company || {
        name: "Entreprise",
        siret: "00000000000000",
        address: "",
        postalCode: "00000",
        city: "",
        phone: "",
        email: "",
      },
      client: {
        name: oldQuote.clientName,
        type: "particulier" as const,
        billingAddress: "",
        billingPostalCode: "00000",
        billingCity: "",
      },
      chantier: {
        name: oldQuote.chantierName,
      },
      lots: [],
      lines,
      subtotalHT: oldQuote.subtotal,
      discountAmount: 0,
      totalHT: oldQuote.subtotal,
      vatBreakdown: [{
        rate: "20" as const,
        baseHT: oldQuote.subtotal,
        vatAmount: oldQuote.tva,
      }],
      totalTVA: oldQuote.tva,
      totalTTC: oldQuote.total,
      depositAmount: 0,
      remainingAmount: oldQuote.total,
      createdAt: oldQuote.createdAt,
      updatedAt: new Date().toISOString(),
    };

    // Valider avec Zod
    const result = QuoteSchema.safeParse(newQuote);
    if (result.success) {
      return result.data;
    } else {
      console.error('Erreur de validation lors de la migration:', result.error);
      return null;
    }
  } catch (error) {
    console.error('Erreur lors de la migration du devis:', error);
    return null;
  }
}

/**
 * Migre tous les devis existants vers le nouveau format
 */
export async function migrateAllQuotes(company: any): Promise<{
  migrated: number;
  failed: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let migrated = 0;
  let failed = 0;

  try {
    // Charger les devis existants
    const stored = localStorage.getItem('quotes_data');
    if (!stored) {
      return { migrated: 0, failed: 0, errors: [] };
    }

    const oldQuotes: OldQuote[] = JSON.parse(stored);
    
    // Vérifier si déjà migré
    const firstQuote = oldQuotes[0];
    if (firstQuote && 'quoteNumber' in firstQuote) {
      // Déjà migré
      return { migrated: 0, failed: 0, errors: [] };
    }

    // Migrer chaque devis
    const newQuotes: Quote[] = [];
    
    for (const oldQuote of oldQuotes) {
      const migratedQuote = migrateOldQuoteToNew(oldQuote, company);
      if (migratedQuote) {
        newQuotes.push(migratedQuote);
        migrated++;
      } else {
        failed++;
        errors.push(`Échec migration devis ${oldQuote.id}`);
      }
    }

    // Sauvegarder les devis migrés
    if (newQuotes.length > 0) {
      await saveQuotesToLocalStorage(newQuotes);
      // Marquer la migration comme effectuée
      localStorage.setItem('quotes_migration_done', 'true');
    }

    return { migrated, failed, errors };
  } catch (error) {
    console.error('Erreur lors de la migration globale:', error);
    errors.push(`Erreur globale: ${error}`);
    return { migrated, failed, errors };
  }
}

/**
 * Vérifie si la migration a déjà été effectuée
 */
export function isMigrationDone(): boolean {
  return localStorage.getItem('quotes_migration_done') === 'true';
}
