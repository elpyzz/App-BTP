import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
}

export interface Chantier {
  id: string;
  nom: string;
  clientId: string;
  clientName: string;
  dateDebut: string;
  duree: string;
  images: string[];
  statut: 'planifié' | 'en cours' | 'terminé';
}

interface ChantiersContextType {
  clients: Client[];
  chantiers: Chantier[];
  addClient: (client: Client) => void;
  updateClient: (id: string, updates: Partial<Client>) => void;
  deleteClient: (id: string) => void;
  addChantier: (chantier: Chantier) => void;
  updateChantier: (id: string, updates: Partial<Chantier>) => void;
  deleteChantier: (id: string) => void;
}

const ChantiersContext = createContext<ChantiersContextType | undefined>(undefined);

// Fonction helper pour charger les clients depuis localStorage
const loadClientsFromStorage = (): Client[] => {
  try {
    const stored = localStorage.getItem('clients_data');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error loading clients from localStorage:', error);
  }
  // Valeurs par défaut si aucune donnée n'est trouvée
  return [
    { id: '1', name: 'Jean Dupont', email: 'jean.dupont@email.com', phone: '06 12 34 56 78' },
    { id: '2', name: 'Marie Martin', email: 'marie.martin@email.com', phone: '06 98 76 54 32' }
  ];
};

// Fonction helper pour charger les chantiers depuis localStorage
const loadChantiersFromStorage = (): Chantier[] => {
  try {
    const stored = localStorage.getItem('chantiers_data');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error loading chantiers from localStorage:', error);
  }
  return [];
};

export function ChantiersProvider({ children }: { children: ReactNode }) {
  const [clients, setClients] = useState<Client[]>(loadClientsFromStorage);
  const [chantiers, setChantiers] = useState<Chantier[]>(loadChantiersFromStorage);

  const addClient = (client: Client) => {
    setClients(prev => [...prev, client]);
  };

  const updateClient = (id: string, updates: Partial<Client>) => {
    setClients(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const deleteClient = (id: string) => {
    setClients(prev => prev.filter(c => c.id !== id));
    // Supprimer aussi les chantiers associés à ce client
    setChantiers(prev => prev.filter(c => c.clientId !== id));
  };

  const addChantier = (chantier: Chantier) => {
    setChantiers(prev => [...prev, chantier]);
  };

  const updateChantier = (id: string, updates: Partial<Chantier>) => {
    setChantiers(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const deleteChantier = (id: string) => {
    setChantiers(prev => prev.filter(c => c.id !== id));
  };

  // Synchroniser les clients avec localStorage à chaque changement
  useEffect(() => {
    try {
      localStorage.setItem('clients_data', JSON.stringify(clients));
    } catch (error) {
      console.error('Error saving clients to localStorage:', error);
    }
  }, [clients]);

  // Synchroniser les chantiers avec localStorage à chaque changement
  useEffect(() => {
    try {
      localStorage.setItem('chantiers_data', JSON.stringify(chantiers));
    } catch (error) {
      console.error('Error saving chantiers to localStorage:', error);
    }
  }, [chantiers]);

  return (
    <ChantiersContext.Provider value={{ clients, chantiers, addClient, updateClient, deleteClient, addChantier, updateChantier, deleteChantier }}>
      {children}
    </ChantiersContext.Provider>
  );
}

export function useChantiers() {
  const context = useContext(ChantiersContext);
  if (context === undefined) {
    throw new Error('useChantiers must be used within a ChantiersProvider');
  }
  return context;
}

