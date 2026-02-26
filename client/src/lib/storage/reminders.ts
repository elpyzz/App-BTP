import { supabase } from '@/lib/supabaseClient';

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
 * Charge les relances depuis Supabase
 * @param invoiceId - ID de la facture (optionnel, pour filtrer)
 */
export async function loadReminders(invoiceId?: string): Promise<Reminder[]> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return [];

    let query = supabase
      .from('reminders')
      .select('*')
      .eq('user_id', userId)
      .order('sent_at', { ascending: false });

    if (invoiceId) {
      query = query.eq('invoice_id', invoiceId);
    }

    const { data, error } = await query;
    if (error) throw error;

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
    console.error('Error loading reminders:', error);
    return [];
  }
}

/**
 * Sauvegarde une relance dans Supabase
 */
export async function saveReminder(reminder: Omit<Reminder, 'id' | 'createdAt'>): Promise<Reminder> {
  const userId = await getCurrentUserId();
  if (!userId) {
    throw new Error('User not authenticated');
  }

  const reminderData = {
    user_id: userId,
    invoice_id: reminder.invoiceId,
    invoice_number: reminder.invoiceNumber,
    client_name: reminder.clientName,
    client_email: reminder.clientEmail || null,
    amount_due: reminder.amountDue,
    sent_at: reminder.sentAt,
  };

  const { data, error } = await supabase
    .from('reminders')
    .insert(reminderData)
    .select()
    .single();

  if (error) throw error;

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
}
