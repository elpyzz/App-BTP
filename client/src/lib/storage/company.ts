import { Company } from '@/lib/quotes/types';
import { supabase } from '@/lib/supabaseClient';

function supabaseToCompany(data: any): Company {
  return {
    name: data.name,
    legalForm: data.legal_form,
    siret: data.siret,
    address: data.address,
    postalCode: data.postal_code,
    city: data.city,
    phone: data.phone,
    email: data.email,
    vatNumber: data.vat_number,
    rcsCity: data.rcs_city,
    capital: data.capital != null ? parseFloat(data.capital) : undefined,
    country: data.country || 'France',
    apeCode: data.ape_code,
    logo: data.logo,
    website: data.website,
    fax: data.fax,
    iban: data.iban,
    insuranceDecennale: data.insurance_decennale,
    insuranceRC: data.insurance_rc,
    qualifications: data.qualifications,
    signature: data.signature,
  };
}

/**
 * Charge l'entreprise de l'utilisateur connecté depuis Supabase (hors contexte React).
 * Utilisé pour fusionner la signature / logo à jour dans les devis avant génération PDF.
 */
export async function loadCurrentCompany(): Promise<Company | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) {
      console.warn('[loadCurrentCompany] Pas d\'utilisateur connecté (user?.id manquant)');
      return null;
    }

    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.warn('[loadCurrentCompany] Erreur Supabase:', error.code, error.message);
      return null;
    }
    if (!data) {
      console.warn('[loadCurrentCompany] Aucune ligne company pour user_id:', user.id);
      return null;
    }

    return supabaseToCompany(data);
  } catch (err) {
    console.warn('[loadCurrentCompany] Exception:', err);
    return null;
  }
}
