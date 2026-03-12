import { useState } from "react"
import { useLocation } from "wouter"
import { useAuth } from "@/context/AuthContext"
import { SignInPage } from "@/components/SignInPage"
import { supabase } from "@/lib/supabaseClient"

export default function AuthPage() {
  const [isSignUp, setIsSignUp] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { signUp, signIn } = useAuth()
  const [, setLocation] = useLocation()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    
    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const fullName = formData.get('fullName') as string

    try {
      if (isSignUp) {
        // Création de compte
        if (!email || !password || !fullName) {
          setError("Veuillez remplir tous les champs obligatoires")
          return
        }
        
        const { error: signUpError } = await signUp(email, password, fullName)
        
        if (signUpError) {
          if (signUpError.code === 'user_already_exists') {
            setError("Cet email est déjà enregistré. Veuillez vous connecter à la place.")
            setTimeout(() => setIsSignUp(false), 2000)
          } else {
            setError(signUpError.message || "Erreur lors de la création du compte")
          }
        } else {
          // Rediriger directement vers le dashboard après création réussie
          setLocation("/dashboard")
        }
      } else {
        // Connexion
        if (!email || !password) {
          setError("Veuillez remplir tous les champs")
          return
        }
        
        const { error: signInError } = await signIn(email, password)

        if (signInError) {
          setError(signInError.message || "Email ou mot de passe incorrect")
        } else {
          // #region agent log
          fetch('http://127.0.0.1:7245/ingest/2bc13647-e8ed-45f5-9680-8af1344cbade',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'28a3ac'},body:JSON.stringify({sessionId:'28a3ac',location:'AuthPage.tsx:afterSignIn',message:'waiting for session',data:{step:'start'},timestamp:Date.now(),hypothesisId:'H4_H5'})}).catch(()=>{});
          // #endregion
          let attempts = 0;
          const maxAttempts = 20;
          while (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 100));
            const { data: { session } } = await supabase.auth.getSession();

            if (session) {
              // #region agent log
              fetch('http://127.0.0.1:7245/ingest/2bc13647-e8ed-45f5-9680-8af1344cbade',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'28a3ac'},body:JSON.stringify({sessionId:'28a3ac',location:'AuthPage.tsx:redirectDashboard',message:'session found redirect',data:{attempts},timestamp:Date.now(),hypothesisId:'H4_H5'})}).catch(()=>{});
              // #endregion
              setLocation("/dashboard")
              return;
            }
            attempts++;
          }
          // #region agent log
          fetch('http://127.0.0.1:7245/ingest/2bc13647-e8ed-45f5-9680-8af1344cbade',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'28a3ac'},body:JSON.stringify({sessionId:'28a3ac',location:'AuthPage.tsx:sessionTimeout',message:'session not found after 2s',data:{attempts:maxAttempts},timestamp:Date.now(),hypothesisId:'H5'})}).catch(()=>{});
          // #endregion
          setError("Erreur lors de la connexion. Veuillez réessayer.")
        }
      }
    } catch (err: any) {
      setError(err.message || "Une erreur est survenue")
    }
  }

  return (
    <div className="relative w-full min-h-screen overflow-hidden">
      <div className="relative z-10">
        {error && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm backdrop-blur-md">
            {error}
          </div>
        )}
        <SignInPage
          title={
            <span className="font-light text-white tracking-tighter">
              {isSignUp ? "Créer un compte" : "Bienvenue"}
            </span>
          }
          description={
            isSignUp
              ? "Créez votre compte pour accéder à votre application Aos Renov"
              : "Connectez-vous à votre compte Aos Renov"
          }
          isSignUp={isSignUp}
          onToggleMode={() => setIsSignUp(!isSignUp)}
          onSignIn={handleSubmit}
        />
      </div>
    </div>
  )
}

