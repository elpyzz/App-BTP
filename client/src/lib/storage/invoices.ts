import { Invoice, InvoiceSchema, generateId, generateInvoiceNumber, calculateDueDate, calculateRemainingAmount } from '@/lib/invoices/types';
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
 * Convertit un objet Invoice (camelCase) vers le format Supabase (snake_case)
 * Exclut created_at et updated_at car Supabase les gère automatiquement
 * Filtre les valeurs undefined/null pour éviter les erreurs Supabase
 */
function invoiceToSupabase(invoice: Invoice): any {
  const data: any = {
    invoice_number: invoice.invoiceNumber,
    status: invoice.status,
    issue_date: invoice.issueDate,
    due_date: invoice.dueDate,
    payment_delay_days: invoice.paymentDelayDays ?? 30,
    client: invoice.client,
    company: invoice.company,
    chantier: invoice.chantier,
    lots: invoice.lots || [],
    lines: invoice.lines || [],
  };

  // Ajouter l'ID seulement s'il est un UUID valide ou un ID texte valide
  if (invoice.id) {
    data.id = invoice.id;
  }

  // Ajouter les champs optionnels seulement s'ils sont définis
  if (invoice.saleDate) data.sale_date = invoice.saleDate;
  if (invoice.executionPeriodStart) data.execution_period_start = invoice.executionPeriodStart;
  if (invoice.executionPeriodEnd) data.execution_period_end = invoice.executionPeriodEnd;
  if (invoice.quoteId) data.quote_id = invoice.quoteId;
  if (invoice.quoteNumber) data.quote_number = invoice.quoteNumber;
  if (invoice.purchaseOrderNumber) data.purchase_order_number = invoice.purchaseOrderNumber;
  if (invoice.internalReference) data.internal_reference = invoice.internalReference;
  if (invoice.discount) data.discount = invoice.discount;
  if (invoice.travelCosts !== undefined && invoice.travelCosts !== null && invoice.travelCosts !== 0) {
    data.travel_costs = Number(invoice.travelCosts);
  }
  if (invoice.paymentTerms) data.payment_terms = invoice.paymentTerms;
  if (invoice.paymentMethods) data.payment_methods = invoice.paymentMethods;
  if (invoice.latePaymentPenalties) data.late_payment_penalties = invoice.latePaymentPenalties;
  if (invoice.specialVatMention) data.special_vat_mention = invoice.specialVatMention;
  if (invoice.notes) data.notes = invoice.notes;

  // Ajouter les colonnes numériques seulement si elles ont une valeur non-nulle
  const subtotalHT = Number(invoice.subtotalHT ?? 0);
  if (subtotalHT !== 0) data.subtotal_ht = subtotalHT;

  const discountAmount = Number(invoice.discountAmount ?? 0);
  if (discountAmount !== 0) data.discount_amount = discountAmount;

  const totalHT = Number(invoice.totalHT ?? 0);
  if (totalHT !== 0) data.total_ht = totalHT;

  const vatBreakdown = invoice.vatBreakdown || [];
  if (vatBreakdown.length > 0) data.vat_breakdown = vatBreakdown;

  const totalTVA = Number(invoice.totalTVA ?? 0);
  if (totalTVA !== 0) data.total_tva = totalTVA;

  const totalTTC = Number(invoice.totalTTC ?? 0);
  if (totalTTC !== 0) data.total_ttc = totalTTC;

  const depositsPaid = Number(invoice.depositsPaid ?? 0);
  if (depositsPaid !== 0) {
    data.deposits_paid = depositsPaid;
  }

  const remainingAmount = Number(invoice.remainingAmount ?? 0);
  if (remainingAmount !== 0) {
    data.remaining_amount = remainingAmount;
  }

  const recoveryFee = Number(invoice.recoveryFee ?? 40);
  if (recoveryFee !== 40) {
    data.recovery_fee = recoveryFee;
  }

  return data;
}

/**
 * Convertit un objet Supabase (snake_case) vers le format Invoice (camelCase)
 * Convertit les valeurs null en undefined pour les champs optionnels
 */
function supabaseToInvoice(data: any): Invoice {
  return {
    id: data.id,
    userId: data.user_id,
    invoiceNumber: data.invoice_number,
    status: data.status,
    issueDate: data.issue_date,
    saleDate: data.sale_date ?? undefined,
    executionPeriodStart: data.execution_period_start ?? undefined,
    executionPeriodEnd: data.execution_period_end ?? undefined,
    dueDate: data.due_date,
    paymentDelayDays: data.payment_delay_days ?? 30,
    quoteId: data.quote_id ?? undefined,
    quoteNumber: data.quote_number ?? undefined,
    purchaseOrderNumber: data.purchase_order_number ?? undefined,
    internalReference: data.internal_reference ?? undefined,
    client: data.client,
    company: data.company,
    chantier: data.chantier,
    lots: data.lots || [],
    lines: data.lines || [],
    discount: data.discount ?? undefined,
    travelCosts: data.travel_costs ? parseFloat(data.travel_costs) : undefined,
    subtotalHT: parseFloat(data.subtotal_ht || 0),
    discountAmount: parseFloat(data.discount_amount || 0),
    totalHT: parseFloat(data.total_ht || 0),
    vatBreakdown: data.vat_breakdown || [],
    totalTVA: parseFloat(data.total_tva || 0),
    totalTTC: parseFloat(data.total_ttc || 0),
    depositsPaid: parseFloat(data.deposits_paid || 0),
    remainingAmount: parseFloat(data.remaining_amount || 0),
    paymentTerms: data.payment_terms ?? undefined,
    paymentMethods: data.payment_methods ?? undefined,
    latePaymentPenalties: data.late_payment_penalties ?? undefined,
    recoveryFee: parseFloat(data.recovery_fee || 40),
    specialVatMention: data.special_vat_mention ?? undefined,
    notes: data.notes ?? undefined,
    createdAt: data.created_at || new Date().toISOString(),
    updatedAt: data.updated_at || new Date().toISOString(),
  };
}

/**
 * Fallback localStorage pour le mode mock
 */
function loadInvoicesFromLocalStorage(): Invoice[] {
  try {
    const data = localStorage.getItem("invoices_data");
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveInvoicesToLocalStorage(invoices: Invoice[]): void {
  try {
    localStorage.setItem("invoices_data", JSON.stringify(invoices));
  } catch (error) {
    console.error("Error saving invoices to localStorage:", error);
  }
}

/**
 * Charge les factures depuis Supabase (filtrées par user_id)
 */
export async function loadInvoicesFromSupabase(filters?: {
  quoteId?: string;
  status?: string;
}): Promise<Invoice[]> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      console.warn('No user ID, returning empty invoices');
      return [];
    }

    let query = supabase
      .from('invoices')
      .select('*')
      .eq('user_id', userId);

    if (filters?.quoteId) {
      query = query.eq('quote_id', filters.quoteId);
    }
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;

    // Convertir et valider chaque facture
    const invoices: Invoice[] = [];
    for (const item of data || []) {
      try {
        const invoice = supabaseToInvoice(item);
        const result = InvoiceSchema.safeParse(invoice);
        if (result.success) {
          invoices.push(result.data);
        } else {
          console.warn('Facture invalide ignorée:', result.error);
        }
      } catch (err) {
        console.warn('Erreur lors de la conversion de la facture:', err);
      }
    }

    return invoices;
  } catch (error) {
    console.error('Error loading invoices from Supabase:', error);
    return [];
  }
}

/**
 * Sauvegarde une facture dans Supabase (avec user_id)
 */
export async function saveInvoiceToSupabase(invoice: Invoice): Promise<Invoice> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      throw new Error('User not authenticated');
    }

    // Générer numéro et dates si nouvelle facture
    if (!invoice.invoiceNumber) {
      const existing = await loadInvoicesFromSupabase();
      invoice.invoiceNumber = generateInvoiceNumber(existing);
    }

    if (!invoice.dueDate && invoice.issueDate) {
      invoice.dueDate = calculateDueDate(invoice.issueDate, invoice.paymentDelayDays || 30);
    }

    // Calculer le reste à payer
    invoice.remainingAmount = calculateRemainingAmount(invoice.totalTTC, invoice.depositsPaid);

    // Convertir vers le format Supabase (snake_case)
    const baseData = invoiceToSupabase(invoice);
    const invoiceData: any = {
      ...baseData,
      user_id: userId,
    };

    // Pour les nouvelles factures, ne pas envoyer l'ID (Supabase le générera automatiquement)
    const isNewInvoice = !invoice.id;
    if (isNewInvoice) {
      delete invoiceData.id;
    }

    // Vérifier si la facture existe déjà
    let existing = null;
    if (invoice.id) {
      const { data } = await supabase
        .from('invoices')
        .select('id')
        .eq('id', invoice.id)
        .eq('user_id', userId)
        .maybeSingle();
      existing = data;
    }

    let result;
    if (existing) {
      // Mise à jour
      const { data, error } = await supabase
        .from('invoices')
        .update(invoiceData)
        .eq('id', invoice.id)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        // Message d'erreur plus clair pour les problèmes de schéma
        if (error.code === 'PGRST204') {
          const columnName = error.message?.match(/column ['"]([^'"]+)['"]/i)?.[1] || 'inconnue';
          throw new Error(`La colonne "${columnName}" n'existe pas dans la table invoices. Message Supabase: ${error.message}. Veuillez recréer la table avec le script SQL complet.`);
        }
        throw error;
      }
      result = data;
    } else {
      // Création
      const { data, error } = await supabase
        .from('invoices')
        .insert(invoiceData)
        .select()
        .single();

      if (error) {
        // Message d'erreur plus clair pour les problèmes de schéma
        if (error.code === 'PGRST204') {
          const columnName = error.message?.match(/column ['"]([^'"]+)['"]/i)?.[1] || 'inconnue';
          throw new Error(`La colonne "${columnName}" n'existe pas dans la table invoices. Message Supabase: ${error.message}. Veuillez recréer la table avec le script SQL complet.`);
        }
        throw error;
      }
      result = data;
    }

    // Convertir et valider le résultat
    const convertedInvoice = supabaseToInvoice(result);
    const validated = InvoiceSchema.safeParse(convertedInvoice);
    if (!validated.success) {
      console.error('Erreur de validation après sauvegarde:', validated.error);
      throw new Error('Données invalides après sauvegarde');
    }

    // Déclencher événement pour notifier les autres composants
    window.dispatchEvent(new Event('invoicesUpdated'));

    return validated.data;
  } catch (error) {
    console.error('Error saving invoice to Supabase:', error);
    throw error;
  }
}

/**
 * Supprime une facture depuis Supabase (avec vérification user_id)
 */
export async function deleteInvoiceFromSupabase(id: string): Promise<void> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      throw new Error('User not authenticated');
    }

    const { error } = await supabase
      .from('invoices')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;

    // Déclencher événement pour notifier les autres composants
    window.dispatchEvent(new Event('invoicesUpdated'));
  } catch (error) {
    console.error('Error deleting invoice from Supabase:', error);
    throw error;
  }
}

/**
 * Charge une facture par ID depuis Supabase (avec vérification user_id)
 */
export async function loadInvoiceFromSupabase(id: string): Promise<Invoice | null> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return null;
    }

    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      if (error.code === 'PGRST116') { // No rows returned
        return null;
      }
      throw error;
    }

    if (!data) return null;

    // Convertir et valider
    const invoice = supabaseToInvoice(data);
    const result = InvoiceSchema.safeParse(invoice);
    if (result.success) {
      return result.data;
    } else {
      console.warn('Facture invalide:', result.error);
      return null;
    }
  } catch (error) {
    console.error('Error loading invoice from Supabase:', error);
    return null;
  }
}

/**
 * Fonctions unifiées - utilisent Supabase avec fallback localStorage
 */
export async function loadInvoices(filters?: {
  quoteId?: string;
  status?: string;
}): Promise<Invoice[]> {
  return loadInvoicesFromSupabase(filters);
}

export async function saveInvoice(invoice: Invoice): Promise<Invoice> {
  return saveInvoiceToSupabase(invoice);
}

export async function loadInvoice(id: string): Promise<Invoice | null> {
  return loadInvoiceFromSupabase(id);
}

export async function deleteInvoice(id: string): Promise<void> {
  return deleteInvoiceFromSupabase(id);
}
