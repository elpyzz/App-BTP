import { supabase } from '@/lib/supabaseClient';

/**
 * Génère un ID unique pour une relance
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export interface Reminder {
  id: string;
  userId: string;
  invoiceId: string;
  invoiceNumber: string;
  clientName: string;
  clientEmail?: string;
  amountDue: number;
  sentAt: string;
  createdAt: string;
}

/**
 * Obtient l'ID de l'utilisateur actuel
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
 * Fallback localStorage pour les relances
 */
function loadRemindersFromLocalStorage(userId: string, invoiceId?: string): Reminder[] {
  try {
    const key = `reminders_${userId}`;
    const data = localStorage.getItem(key);
    if (!data) return [];
    
    const reminders: Reminder[] = JSON.parse(data);
    if (invoiceId) {
      return reminders.filter(r => r.invoiceId === invoiceId);
    }
    return reminders;
  } catch (error) {
    console.error('Error loading reminders from localStorage:', error);
    return [];
  }
}

function saveReminderToLocalStorage(reminder: Reminder): void {
  try {
    const key = `reminders_${reminder.userId}`;
    const existing = loadRemindersFromLocalStorage(reminder.userId);
    const updated = [reminder, ...existing.filter(r => r.id !== reminder.id)];
    localStorage.setItem(key, JSON.stringify(updated));
  } catch (error) {
    console.error('Error saving reminder to localStorage:', error);
  }
}

/**
 * Charge les relances depuis Supabase
 * @param invoiceId - ID de la facture (optionnel, pour filtrer)
 */
export async function loadReminders(invoiceId?: string): Promise<Reminder[]> {
  const userId = await getCurrentUserId();
  if (!userId) return [];

  try {
    let query = supabase
      .from('reminders')
      .select('*')
      .eq('user_id', userId)
      .order('sent_at', { ascending: false });

    if (invoiceId) {
      query = query.eq('invoice_id', invoiceId);
    }

    const { data, error } = await query;
    
    if (error) {
      // Si erreur 404 ou PGRST205, utiliser localStorage comme fallback
      if (error.code === 'PGRST116' || error.code === 'PGRST205' || error.status === 404 || error.message?.includes('404') || error.message?.includes('schema cache')) {
        console.warn('Table reminders non accessible, utilisation du fallback localStorage');
        return loadRemindersFromLocalStorage(userId, invoiceId);
      }
      throw error;
    }

    return (data || []).map((item: any) => ({
      id: item.id,
      userId: item.user_id,
      invoiceId: item.invoice_id,
      invoiceNumber: item.invoice_number,
      clientName: item.client_name,
      clientEmail: item.client_email,
      amountDue: parseFloat(item.amount_due || 0),
      sentAt: item.sent_at,
      createdAt: item.created_at,
    }));
  } catch (error) {
    console.error('Error loading reminders, fallback to localStorage:', error);
    return loadRemindersFromLocalStorage(userId, invoiceId);
  }
}

/**
 * Sauvegarde une relance dans Supabase avec meilleure gestion d'erreur
 */
export async function saveReminder(reminder: Omit<Reminder, 'id' | 'createdAt'>): Promise<Reminder> {
  const userId = await getCurrentUserId();
  if (!userId) {
    throw new Error('User not authenticated');
  }

  // Générer un ID unique avant l'insertion
  const reminderId = generateId();

  const reminderData = {
    id: reminderId,
    user_id: userId,
    invoice_id: reminder.invoiceId,
    invoice_number: reminder.invoiceNumber,
    client_name: reminder.clientName,
    client_email: reminder.clientEmail || null,
    amount_due: reminder.amountDue,
    sent_at: reminder.sentAt,
  };

  const fullReminder: Reminder = {
    id: reminderId,
    userId: userId,
    invoiceId: reminder.invoiceId,
    invoiceNumber: reminder.invoiceNumber,
    clientName: reminder.clientName,
    clientEmail: reminder.clientEmail,
    amountDue: reminder.amountDue,
    sentAt: reminder.sentAt,
    createdAt: new Date().toISOString(),
  };

  try {
    const { data, error } = await supabase
      .from('reminders')
      .insert(reminderData)
      .select()
      .single();

    if (error) {
      // Si erreur 404 ou PGRST205, utiliser localStorage comme fallback
      if (error.code === 'PGRST205' || error.code === 'PGRST116' || error.status === 404 || error.message?.includes('404') || error.message?.includes('schema cache')) {
        console.warn('Table reminders non accessible, sauvegarde dans localStorage (fallback)');
        saveReminderToLocalStorage(fullReminder);
        return fullReminder;
      }
      
      // Gestion des erreurs de colonne
      if (error.code === 'PGRST204') {
        const columnName = error.message?.match(/column ['"]([^'"]+)['"]/i)?.[1] || 'inconnue';
        throw new Error(`La colonne "${columnName}" n'existe pas dans la table reminders. Veuillez recréer la table avec le script SQL complet.`);
      }
      
      // Log détaillé de l'erreur
      console.error('Erreur lors de l\'insertion de la relance:', {
        error,
        errorCode: error.code,
        errorStatus: error.status,
        errorMessage: error.message,
        reminderData,
        userId
      });
      
      throw error;
    }

    return {
      id: data.id,
      userId: data.user_id,
      invoiceId: data.invoice_id,
      invoiceNumber: data.invoice_number,
      clientName: data.client_name,
      clientEmail: data.client_email,
      amountDue: parseFloat(data.amount_due || 0),
      sentAt: data.sent_at,
      createdAt: data.created_at,
    };
  } catch (error: any) {
    // Si c'est une erreur PGRST205 ou 404, utiliser localStorage
    if (error?.code === 'PGRST205' || error?.code === 'PGRST116' || error?.status === 404 || error?.message?.includes('schema cache')) {
      console.warn('Utilisation du fallback localStorage pour sauvegarder la relance');
      saveReminderToLocalStorage(fullReminder);
      return fullReminder;
    }
    
    // Log complet pour debug
    console.error('Erreur complète saveReminder:', {
      error,
      errorCode: error?.code,
      errorStatus: error?.status,
      errorMessage: error?.message,
      reminderData
    });
    throw error;
  }
}
