// #region agent log
fetch('http://127.0.0.1:7245/ingest/92008ec0-4865-46b1-a863-69afada2c59a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'client/src/lib/supabaseClient.ts:1',message:'Attempting to import @supabase/supabase-js',data:{},timestamp:Date.now(),runId:'post-fix',hypothesisId:'B'})}).catch(()=>{});
// #endregion
import { createClient } from '@supabase/supabase-js';
// #region agent log
fetch('http://127.0.0.1:7245/ingest/92008ec0-4865-46b1-a863-69afada2c59a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'client/src/lib/supabaseClient.ts:3',message:'Successfully imported @supabase/supabase-js',data:{},timestamp:Date.now(),runId:'post-fix',hypothesisId:'B'})}).catch(()=>{});
// #endregion

// Configuration Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://vyedinahtdayjhsfafzx.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ5ZWRpbmFodGRheWpoc2ZhZnp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3MTUwNjcsImV4cCI6MjA4NjI5MTA2N30.XDVtkLZ8p2wqHcPP3yE5yMcQxeloGTmSnSdZiH2THtk';

// Créer le client Supabase
// Configuration pour session longue durée :
// - persistSession: true → Stocke la session dans localStorage
// - autoRefreshToken: true → Rafraîchit automatiquement le token (access_token expire après 1h, refresh_token dure 1 semaine)
// - La session Supabase dure 1 SEMAINE par défaut (pas 1h)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false, // Désactiver pour éviter les problèmes de déconnexion lors de la navigation
    storage: window.localStorage, // Utiliser explicitement localStorage
    storageKey: 'sb-vyedinahtdayjhsfafzx-auth-token' // Clé explicite pour le stockage
  }
});
