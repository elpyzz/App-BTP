import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Company, CompanySchema } from '@/lib/quotes/types';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from './AuthContext';

interface CompanyContextType {
  company: Company | null;
  setCompany: (company: Company) => Promise<void>;
  loadCompany: () => Promise<void>;
  saveCompany: (company: Company) => Promise<void>;
  isLoading: boolean;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

/**
 * Convertit un objet Company (camelCase) vers le format Supabase (snake_case)
 * Filtre les valeurs undefined/null pour éviter les erreurs Supabase
 */
function companyToSupabase(company: Company): any {
  const data: any = {
    name: company.name,
    legal_form: company.legalForm || '',
    siret: company.siret,
    address: company.address,
    postal_code: company.postalCode,
    city: company.city,
    phone: company.phone,
    email: company.email,
  };

  // Ajouter les champs optionnels seulement s'ils sont définis
  if (company.vatNumber) data.vat_number = company.vatNumber;
  if (company.rcsCity) data.rcs_city = company.rcsCity;
  if (company.capital !== undefined && company.capital !== null) {
    data.capital = company.capital;
  }
  // Ne pas envoyer country - la colonne n'existe pas dans Supabase
  // if (company.country) data.country = company.country;
  if (company.apeCode) data.ape_code = company.apeCode;
  if (company.logo) data.logo = company.logo;
  if (company.website) data.website = company.website;
  if (company.fax) data.fax = company.fax;
  if (company.iban) data.iban = company.iban;
  if (company.insuranceDecennale) data.insurance_decennale = company.insuranceDecennale;
  if (company.insuranceRC) data.insurance_rc = company.insuranceRC;
  if (company.qualifications) data.qualifications = company.qualifications;

  return data;
}

/**
 * Convertit un objet Supabase (snake_case) vers le format Company (camelCase)
 */
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
    capital: data.capital ? parseFloat(data.capital) : undefined,
    country: data.country || 'France',
    apeCode: data.ape_code,
    logo: data.logo,
    website: data.website,
    fax: data.fax,
    iban: data.iban,
    insuranceDecennale: data.insurance_decennale,
    insuranceRC: data.insurance_rc,
    qualifications: data.qualifications,
  };
}

export function CompanyProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [company, setCompanyState] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadCompany = async () => {
    if (!user?.id) {
      setCompanyState(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        // Erreur 406 ou autres erreurs - peut indiquer que la table n'existe pas
        if (error.code === 'PGRST301' || error.message?.includes('406') || error.message?.includes('Not Acceptable')) {
          console.warn('Erreur 406: La table companies n\'existe peut-être pas dans Supabase. Veuillez exécuter le script SQL supabase_companies_table.sql dans votre dashboard Supabase.');
          setCompanyState(null);
          setIsLoading(false);
          return;
        }
        
        throw error;
      }

      if (data) {
        const convertedCompany = supabaseToCompany(data);
        const result = CompanySchema.safeParse(convertedCompany);
        if (result.success) {
          setCompanyState(result.data);
        } else {
          console.error('Erreur de validation des données entreprise:', result.error);
        }
      } else {
        setCompanyState(null);
      }
    } catch (error) {
      console.error('Error loading company:', error);
      setCompanyState(null);
    } finally {
      setIsLoading(false);
    }
  };

  const saveCompany = async (newCompany: Company) => {
    if (!user?.id) throw new Error('User not authenticated');

    const result = CompanySchema.safeParse(newCompany);
    if (!result.success) {
      console.error('Erreur de validation:', result.error);
      throw new Error('Données entreprise invalides');
    }

    try {
      const companyData = {
        ...companyToSupabase(result.data),
        user_id: user.id,
      };

      const { data, error } = await supabase
        .from('companies')
        .upsert(companyData)
        .select()
        .single();

      if (error) throw error;
      
      const convertedCompany = supabaseToCompany(data);
      setCompanyState(convertedCompany);
    } catch (error) {
      console.error('Error saving company:', error);
      throw error;
    }
  };

  const setCompany = async (newCompany: Company) => {
    await saveCompany(newCompany);
  };

  useEffect(() => {
    if (user?.id) {
      loadCompany();
    } else {
      setCompanyState(null);
      setIsLoading(false);
    }
  }, [user?.id]);

  return (
    <CompanyContext.Provider
      value={{
        company,
        setCompany,
        loadCompany,
        saveCompany,
        isLoading,
      }}
    >
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  const context = useContext(CompanyContext);
  if (context === undefined) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
}
