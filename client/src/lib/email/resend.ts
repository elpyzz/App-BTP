// Configuration Resend (sera configuré plus tard via variables d'environnement)
export const RESEND_API_KEY = import.meta.env.VITE_RESEND_API_KEY || '';

export function isResendConfigured(): boolean {
  return !!RESEND_API_KEY && RESEND_API_KEY.length > 0;
}
