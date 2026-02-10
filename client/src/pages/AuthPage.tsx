import { useState } from "react"
import { useLocation } from "wouter"
import { useAuth } from "@/context/AuthContext"
import { SignInPage } from "@/components/SignInPage"

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
        if (!email || !password || !fullName) {
          setError("Veuillez remplir tous les champs obligatoires")
          return
        }
        const { error } = await signUp(email, password, fullName)
        if (error) {
          setError(error.message || "Erreur lors de la création du compte")
        } else {
          setLocation("/login")
        }
      } else {
        if (!email || !password) {
          setError("Veuillez remplir tous les champs")
          return
        }
        const { error } = await signIn(email, password)
        if (error) {
          setError(error.message || "Email ou mot de passe incorrect")
        } else {
          setLocation("/login")
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

