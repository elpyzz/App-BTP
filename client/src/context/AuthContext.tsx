import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Récupérer la session initiale de manière asynchrone
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          setLoading(false);
          return;
        }
        
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        } catch (error) {
        console.error('Error initializing auth:', error);
        setLoading(false);
      }
    };

    initializeAuth();

    // Écouter les changements d'authentification
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change:', event, session ? 'has session' : 'no session');
      
      // Pour SIGNED_OUT, toujours mettre à jour l'état à null
      if (event === 'SIGNED_OUT') {
        console.log('SIGNED_OUT event détecté');
        setSession(null);
        setUser(null);
        setLoading(false);
        return;
      }
      
      // Ignorer INITIAL_SESSION si la session est null (première initialisation)
      if (event === 'INITIAL_SESSION' && !session) {
        setLoading(false);
        return;
      }
      
      // Mettre à jour normalement pour tous les autres cas
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName?: string) => {
    try {
      // Créer le compte utilisateur
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) {
        console.error('SignUp error details:', {
          message: error.message,
          status: error.status,
          name: error.name,
          code: error.code
        });
        
        // Si l'erreur est "user_already_exists", améliorer le message d'erreur
        if (error.code === 'user_already_exists') {
          return { 
            error: { 
              ...error, 
              message: 'Cet email est déjà enregistré. Veuillez vous connecter à la place.',
            } 
          };
        }
        
        return { error };
      }

      // La session peut être null si l'email nécessite une confirmation
      setUser(data.user);
      setSession(data.session || null);

      return { error: null };
    } catch (err: any) {
      console.error('Error in signUp:', err);
      return { error: err };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      // Ne pas mettre à jour l'état manuellement - laisser onAuthStateChange le faire
      // Cela évite les conflits et garantit la cohérence
      return { error };
    } catch (err: any) {
      console.error('Error in signIn:', err);
      return { error: err };
    }
  };

  const signOut = async () => {
    try {
      console.log('Début de la déconnexion...');
      
      // Nettoyer le localStorage (seulement les données d'authentification)
      localStorage.removeItem('userType');
      localStorage.removeItem('teamMember');
      // Note: On ne nettoie pas tout le localStorage pour préserver les autres données
      
      // Déconnexion Supabase
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Error signing out:', error);
      } else {
        console.log('Déconnexion Supabase réussie');
      }
      
      // Mettre à jour l'état immédiatement
      setUser(null);
      setSession(null);
      setLoading(false);
      
      console.log('État mis à jour, utilisateur déconnecté');
    } catch (err) {
      console.error('Error in signOut:', err);
      // Forcer la mise à jour de l'état même en cas d'erreur
      setUser(null);
      setSession(null);
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
