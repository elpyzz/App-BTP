import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Company, CompanySchema } from '@/lib/quotes/types';

interface CompanyContextType {
  company: Company | null;
  setCompany: (company: Company) => void;
  loadCompany: () => void;
  saveCompany: (company: Company) => void;
  isLoading: boolean;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

// Fonction helper pour charger les infos entreprise depuis localStorage
const loadCompanyFromStorage = (): Company | null => {
  try {
    const stored = localStorage.getItem('company_data');
    if (stored) {
      const parsed = JSON.parse(stored);
      // Valider avec Zod
      const result = CompanySchema.safeParse(parsed);
      if (result.success) {
        return result.data;
      } else {
        console.error('Erreur de validation des données entreprise:', result.error);
        return null;
      }
    }
  } catch (error) {
    console.error('Error loading company from localStorage:', error);
  }
  return null;
};

// Fonction helper pour sauvegarder
const saveCompanyToStorage = (company: Company): void => {
  try {
    localStorage.setItem('company_data', JSON.stringify(company));
  } catch (error) {
    console.error('Error saving company to localStorage:', error);
  }
};

export function CompanyProvider({ children }: { children: ReactNode }) {
  const [company, setCompanyState] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadCompany = () => {
    setIsLoading(true);
    const loaded = loadCompanyFromStorage();
    setCompanyState(loaded);
    setIsLoading(false);
  };

  const saveCompany = (newCompany: Company) => {
    // Valider avec Zod
    const result = CompanySchema.safeParse(newCompany);
    if (!result.success) {
      console.error('Erreur de validation:', result.error);
      throw new Error('Données entreprise invalides');
    }
    
    setCompanyState(result.data);
    saveCompanyToStorage(result.data);
  };

  const setCompany = (newCompany: Company) => {
    saveCompany(newCompany);
  };

  useEffect(() => {
    loadCompany();
  }, []);

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
