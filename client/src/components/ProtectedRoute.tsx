import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading, session } = useAuth();
  const [, setLocation] = useLocation();
  const [hasCheckedSession, setHasCheckedSession] = useState(false);

  // #region agent log
  useEffect(() => {
    fetch('http://127.0.0.1:7245/ingest/92008ec0-4865-46b1-a863-69afada2c59a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ProtectedRoute.tsx:10',message:'ProtectedRoute render',data:{hasUser:!!user,hasSession:!!session,loading,hasCheckedSession},timestamp:Date.now(),runId:'login-fix',hypothesisId:'E'})}).catch(()=>{});
  }, [user, session, loading, hasCheckedSession]);
  // #endregion

  useEffect(() => {
    if (!loading) {
      // Attendre un court délai pour laisser le temps à la session de se restaurer
      const timer = setTimeout(() => {
        // #region agent log
        fetch('http://127.0.0.1:7245/ingest/92008ec0-4865-46b1-a863-69afada2c59a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ProtectedRoute.tsx:18',message:'Setting hasCheckedSession to true',data:{hasUser:!!user,hasSession:!!session},timestamp:Date.now(),runId:'login-fix',hypothesisId:'E'})}).catch(()=>{});
        // #endregion
        setHasCheckedSession(true);
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [loading, user, session]);

  // Réinitialiser hasCheckedSession si user ou session change (après connexion)
  useEffect(() => {
    if (user && session && !hasCheckedSession) {
      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/92008ec0-4865-46b1-a863-69afada2c59a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ProtectedRoute.tsx:35',message:'User/session appeared, resetting hasCheckedSession',data:{hasUser:!!user,hasSession:!!session},timestamp:Date.now(),runId:'login-fix',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      setHasCheckedSession(true);
    }
  }, [user, session, hasCheckedSession]);

  useEffect(() => {
    // Si pas de session après vérification, rediriger vers /auth
    if (hasCheckedSession && !loading && !user && !session) {
      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/92008ec0-4865-46b1-a863-69afada2c59a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ProtectedRoute.tsx:45',message:'Redirecting to /auth - no user/session',data:{hasUser:!!user,hasSession:!!session,loading,hasCheckedSession},timestamp:Date.now(),runId:'login-fix',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      setLocation('/auth');
    }
  }, [hasCheckedSession, loading, user, session, setLocation]);

  // Afficher le chargement pendant l'initialisation
  if (loading || !hasCheckedSession) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-white">Chargement...</div>
      </div>
    );
  }

  // Si pas d'utilisateur, ne rien afficher (redirection en cours)
  if (!user || !session) {
    return null;
  }

  return <>{children}</>;
}
