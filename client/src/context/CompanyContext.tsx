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
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error;
      }

      if (data) {
        const result = CompanySchema.safeParse(data);
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
      const { data, error } = await supabase
        .from('companies')
        .upsert({
          ...result.data,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      setCompanyState(result.data);
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
