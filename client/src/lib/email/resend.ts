// Configuration Resend - vérification côté serveur via API
let resendConfiguredCache: boolean | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 60000; // 1 minute

// Fonction pour forcer la vérification (ignorer le cache)
export function clearResendCache() {
  resendConfiguredCache = null;
  cacheTimestamp = 0;
}

export async function isResendConfigured(forceRefresh = false): Promise<boolean> {
  // Si forceRefresh, ignorer le cache
  if (forceRefresh) {
    resendConfiguredCache = null;
    cacheTimestamp = 0;
  }
  // Utiliser le cache si disponible et récent
  const now = Date.now();
  if (resendConfiguredCache !== null && (now - cacheTimestamp) < CACHE_DURATION) {
    return resendConfiguredCache;
  }

  try {
    const response = await fetch('/api/resend/status');
    
    if (!response.ok) {
      console.error('[Resend] API returned error status:', response.status);
      resendConfiguredCache = false;
      cacheTimestamp = now;
      return false;
    }
    
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.error('[Resend] API returned non-JSON response:', contentType);
      const text = await response.text();
      console.error('[Resend] Response text:', text.substring(0, 200));
      resendConfiguredCache = false;
      cacheTimestamp = now;
      return false;
    }
    
    const data = await response.json();
    console.log('[Resend] Status response:', data);
    resendConfiguredCache = data.configured || false;
    cacheTimestamp = now;
    return resendConfiguredCache;
  } catch (error) {
    console.error('[Resend] Error checking status:', error);
    resendConfiguredCache = false;
    cacheTimestamp = now;
    return false;
  }
}
