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
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/92008ec0-4865-46b1-a863-69afada2c59a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:21',message:'Initializing auth',data:{},timestamp:Date.now(),runId:'run9',hypothesisId:"H"})}).catch(()=>{});
    // #endregion
    
    // Récupérer la session initiale de manière asynchrone
    const initializeAuth = async () => {
      try {
        // #region agent log
        fetch('http://127.0.0.1:7245/ingest/92008ec0-4865-46b1-a863-69afada2c59a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:26',message:'Calling getSession',data:{},timestamp:Date.now(),runId:'run15',hypothesisId:"AX"})}).catch(()=>{});
        // #endregion
        
        const { data: { session }, error } = await supabase.auth.getSession();
        
        // #region agent log
        fetch('http://127.0.0.1:7245/ingest/92008ec0-4865-46b1-a863-69afada2c59a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:30',message:'getSession result',data:{hasSession:!!session,hasUser:!!session?.user,userId:session?.user?.id,hasError:!!error,errorMessage:error?.message},timestamp:Date.now(),runId:'run15',hypothesisId:"AY"})}).catch(()=>{});
        // #endregion
        
        
        if (error) {
          console.error('Error getting session:', error);
          setLoading(false);
          return;
        }
        
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // #region agent log
        fetch('http://127.0.0.1:7245/ingest/92008ec0-4865-46b1-a863-69afada2c59a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:60',message:'Session and user set, loading false',data:{},timestamp:Date.now(),runId:'run15',hypothesisId:"BB"})}).catch(()=>{});
        // #endregion
      } catch (error) {
        // #region agent log
        fetch('http://127.0.0.1:7245/ingest/92008ec0-4865-46b1-a863-69afada2c59a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:65',message:'initializeAuth exception',data:{error:String(error)},timestamp:Date.now(),runId:'run15',hypothesisId:"BC"})}).catch(()=>{});
        // #endregion
        console.error('Error initializing auth:', error);
        setLoading(false);
      }
    };

    initializeAuth();

    // Écouter les changements d'authentification
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/92008ec0-4865-46b1-a863-69afada2c59a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:67',message:'onAuthStateChange event',data:{event,hasSession:!!session,hasUser:!!session?.user,userId:session?.user?.id,sessionExpiresAt:session?.expires_at},timestamp:Date.now(),runId:'login-final',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      console.log('Auth state change:', event, session ? 'has session' : 'no session');
      
      // Pour SIGNED_OUT, toujours mettre à jour l'état à null
      if (event === 'SIGNED_OUT') {
        // #region agent log
        fetch('http://127.0.0.1:7245/ingest/92008ec0-4865-46b1-a863-69afada2c59a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:74',message:'SIGNED_OUT event handling',data:{},timestamp:Date.now(),runId:'login-final',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        console.log('SIGNED_OUT event détecté');
        setSession(null);
        setUser(null);
        setLoading(false);
        return;
      }
      
      // Ignorer INITIAL_SESSION si la session est null (première initialisation)
      if (event === 'INITIAL_SESSION' && !session) {
        // #region agent log
        fetch('http://127.0.0.1:7245/ingest/92008ec0-4865-46b1-a863-69afada2c59a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:85',message:'Ignoring INITIAL_SESSION with null session',data:{},timestamp:Date.now(),runId:'login-final',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        setLoading(false);
        return;
      }
      
      // Mettre à jour normalement pour tous les autres cas
      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/92008ec0-4865-46b1-a863-69afada2c59a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:92',message:'Updating session and user from onAuthStateChange',data:{event,hasSession:!!session,hasUser:!!session?.user},timestamp:Date.now(),runId:'login-final',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
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
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/92008ec0-4865-46b1-a863-69afada2c59a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:142',message:'signIn called',data:{email},timestamp:Date.now(),runId:'login-final',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/92008ec0-4865-46b1-a863-69afada2c59a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:148',message:'signInWithPassword result',data:{hasError:!!error,hasUser:!!data?.user,hasSession:!!data?.session,userId:data?.user?.id,sessionExpiresAt:data?.session?.expires_at},timestamp:Date.now(),runId:'login-final',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      
      // Ne pas mettre à jour l'état manuellement - laisser onAuthStateChange le faire
      // Cela évite les conflits et garantit la cohérence
      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/92008ec0-4865-46b1-a863-69afada2c59a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:153',message:'signIn completed, waiting for onAuthStateChange',data:{hasError:!!error},timestamp:Date.now(),runId:'login-final',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      
      return { error };
    } catch (err: any) {
      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/92008ec0-4865-46b1-a863-69afada2c59a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:159',message:'signIn exception',data:{error:String(err)},timestamp:Date.now(),runId:'login-final',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
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
