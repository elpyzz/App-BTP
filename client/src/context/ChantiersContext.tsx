import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from './AuthContext';

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  user_id?: string;
  created_at?: string;
  updated_at?: string;
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
  user_id?: string;
  created_at?: string;
  updated_at?: string;
}

interface ChantiersContextType {
  clients: Client[];
  chantiers: Chantier[];
  loading: boolean;
  addClient: (client: Omit<Client, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateClient: (id: string, updates: Partial<Client>) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;
  addChantier: (chantier: Omit<Chantier, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateChantier: (id: string, updates: Partial<Chantier>) => Promise<void>;
  deleteChantier: (id: string) => Promise<void>;
}

const ChantiersContext = createContext<ChantiersContextType | undefined>(undefined);

export function ChantiersProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [chantiers, setChantiers] = useState<Chantier[]>([]);
  const [loading, setLoading] = useState(true);

  // Charger les clients depuis Supabase
  const loadClients = async () => {
    if (!user?.id) {
      setClients([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error loading clients:', error);
      setClients([]);
    } finally {
      setLoading(false);
    }
  };

  // Charger les chantiers depuis Supabase
  const loadChantiers = async () => {
    if (!user?.id) {
      setChantiers([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('chantiers')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setChantiers(data || []);
    } catch (error) {
      console.error('Error loading chantiers:', error);
      setChantiers([]);
    }
  };

  // Charger les données au montage et quand l'utilisateur change
  useEffect(() => {
    if (user?.id) {
      loadClients();
      loadChantiers();
    } else {
      setClients([]);
      setChantiers([]);
      setLoading(false);
    }
  }, [user?.id]);

  const addClient = async (client: Omit<Client, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user?.id) throw new Error('User not authenticated');

    try {
      const { data, error } = await supabase
        .from('clients')
        .insert({
          ...client,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      setClients(prev => [...prev, data]);
    } catch (error) {
      console.error('Error adding client:', error);
      throw error;
    }
  };

  const updateClient = async (id: string, updates: Partial<Client>) => {
    if (!user?.id) throw new Error('User not authenticated');

    try {
      const { data, error } = await supabase
        .from('clients')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      setClients(prev => prev.map(c => c.id === id ? data : c));
    } catch (error) {
      console.error('Error updating client:', error);
      throw error;
    }
  };

  const deleteClient = async (id: string) => {
    if (!user?.id) throw new Error('User not authenticated');

    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
      setClients(prev => prev.filter(c => c.id !== id));
      // Supprimer aussi les chantiers associés
      await supabase
        .from('chantiers')
        .delete()
        .eq('client_id', id)
        .eq('user_id', user.id);
      await loadChantiers();
    } catch (error) {
      console.error('Error deleting client:', error);
      throw error;
    }
  };

  const addChantier = async (chantier: Omit<Chantier, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user?.id) throw new Error('User not authenticated');

    try {
      const { data, error } = await supabase
        .from('chantiers')
        .insert({
          ...chantier,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      setChantiers(prev => [...prev, data]);
    } catch (error) {
      console.error('Error adding chantier:', error);
      throw error;
    }
  };

  const updateChantier = async (id: string, updates: Partial<Chantier>) => {
    if (!user?.id) throw new Error('User not authenticated');

    try {
      const { data, error } = await supabase
        .from('chantiers')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      setChantiers(prev => prev.map(c => c.id === id ? data : c));
    } catch (error) {
      console.error('Error updating chantier:', error);
      throw error;
    }
  };

  const deleteChantier = async (id: string) => {
    if (!user?.id) throw new Error('User not authenticated');

    try {
      const { error } = await supabase
        .from('chantiers')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
      setChantiers(prev => prev.filter(c => c.id !== id));
    } catch (error) {
      console.error('Error deleting chantier:', error);
      throw error;
    }
  };

  return (
    <ChantiersContext.Provider value={{ 
      clients, 
      chantiers, 
      loading,
      addClient, 
      updateClient, 
      deleteClient, 
      addChantier, 
      updateChantier, 
      deleteChantier
    }}>
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
