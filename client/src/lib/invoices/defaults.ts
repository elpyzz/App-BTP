/**
 * Valeurs par défaut pour les factures
 */

export const DEFAULT_PAYMENT_TERMS = `Paiement à réception de facture. Modes de paiement acceptés : virement bancaire, chèque. En cas de retard de paiement, des pénalités de retard seront appliquées au taux de 3 fois le taux d'intérêt légal.`;

export const DEFAULT_LATE_PAYMENT_PENALTIES = `Conformément à l'article L.441-10 du Code de commerce, tout retard de paiement entraîne de plein droit :
- L'application de pénalités de retard au taux de 3 fois le taux d'intérêt légal
- Une indemnité forfaitaire pour frais de recouvrement de 40€`;

export const DEFAULT_RECOVERY_FEE = 40; // Indemnité forfaitaire recouvrement B2B

export const DEFAULT_PAYMENT_DELAY_DAYS = 30; // Délai de paiement par défaut

/**
 * Mentions TVA spéciales
 */
export const SPECIAL_VAT_MENTIONS = [
  { value: "__none__", label: "Aucune" },
  { value: "franchise", label: "TVA non applicable, art. 293 B du CGI (franchise en base)" },
  { value: "autoliquidation", label: "Autoliquidation de la TVA" },
];
