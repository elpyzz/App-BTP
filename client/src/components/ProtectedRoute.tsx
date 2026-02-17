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

  useEffect(() => {
    if (!loading) {
      // Attendre un court délai pour laisser le temps à la session de se restaurer
      const timer = setTimeout(() => {
        setHasCheckedSession(true);
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [loading]);

  useEffect(() => {
    // Si pas de session après vérification, rediriger vers /auth
    if (hasCheckedSession && !loading && !user && !session) {
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
