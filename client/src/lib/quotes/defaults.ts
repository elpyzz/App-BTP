import { QuoteConditions } from "./types";

export const DEFAULT_EXECUTION_TERMS = `Les travaux débuteront dans un délai de [X] semaines à compter de l'acceptation du présent devis et du versement de l'acompte. La durée prévisionnelle des travaux est estimée à [X] jours ouvrables, sous réserve des conditions météorologiques et de l'accessibilité du chantier.`;

export const DEFAULT_PAYMENT_TERMS = `Paiement à réception de facture. Modes de paiement acceptés : virement bancaire, chèque. En cas de retard de paiement, des pénalités de retard seront appliquées au taux de 3 fois le taux d'intérêt légal.`;

export const DEFAULT_DEPOSIT_TERMS = `Un acompte de 30% du montant TTC est demandé à la commande. Le solde sera facturé à la fin des travaux après réception.`;

export const DEFAULT_WARRANTIES = `Garantie décennale couvrant les travaux de gros œuvre. Garantie de parfait achèvement d'un an à compter de la réception des travaux. Garantie biennale de deux ans sur les éléments d'équipement.`;

export const DEFAULT_UNFORESEEN_CLAUSE = `Les travaux supplémentaires non prévus au présent devis feront l'objet d'un avenant signé par les deux parties avant leur exécution. En cas de découverte d'éléments cachés nécessitant des travaux supplémentaires, le client sera informé immédiatement et un devis complémentaire sera établi.`;

export const DEFAULT_CANCELLATION_TERMS = `Le client dispose d'un délai de rétractation de 14 jours à compter de l'acceptation du devis (vente à distance). Toute annulation après le démarrage des travaux donnera lieu à facturation des travaux réalisés et des matériaux commandés.`;

export const DEFAULT_LATE_PAYMENT_PENALTIES = `Conformément à l'article L.441-10 du Code de commerce, tout retard de paiement entraîne de plein droit :
- L'application de pénalités de retard au taux de 3 fois le taux d'intérêt légal
- Une indemnité forfaitaire pour frais de recouvrement de 40€`;

export const DEFAULT_RGPD_MENTION = `Les informations recueillies font l'objet d'un traitement informatique destiné à la gestion de la relation client. Conformément au RGPD, vous disposez d'un droit d'accès, de rectification et de suppression des données vous concernant.`;

export const DEFAULT_MATERIALS_OWNERSHIP = `Les matériaux et équipements livrés sur le chantier restent la propriété de l'entreprise jusqu'au paiement intégral de la facture.`;

/**
 * Conditions par défaut
 */
export const DEFAULT_CONDITIONS: QuoteConditions = {
  executionTerms: DEFAULT_EXECUTION_TERMS,
  paymentTerms: DEFAULT_PAYMENT_TERMS,
  depositTerms: DEFAULT_DEPOSIT_TERMS,
  warranties: DEFAULT_WARRANTIES,
  unforeseenClause: DEFAULT_UNFORESEEN_CLAUSE,
  cancellationTerms: DEFAULT_CANCELLATION_TERMS,
  latePaymentPenalties: DEFAULT_LATE_PAYMENT_PENALTIES,
  rgpdMention: DEFAULT_RGPD_MENTION,
  materialsOwnership: DEFAULT_MATERIALS_OWNERSHIP,
};

/**
 * Unités avec labels
 */
export const UNIT_LABELS: Record<string, string> = {
  h: "heure",
  m2: "m²",
  ml: "ml",
  m3: "m³",
  forfait: "forfait",
  unite: "unité",
  lot: "lot",
  jour: "jour",
  mois: "mois",
  kg: "kg",
  l: "litre",
};

/**
 * Taux de TVA avec descriptions
 */
export const VAT_RATES: Array<{ value: string; label: string; description: string }> = [
  { value: "20", label: "20%", description: "Taux normal" },
  { value: "10", label: "10%", description: "Travaux rénovation (logement > 2 ans)" },
  { value: "5.5", label: "5,5%", description: "Travaux amélioration énergétique" },
  { value: "0", label: "0%", description: "Exonéré / Non applicable" },
];

/**
 * Formes juridiques
 */
export const LEGAL_FORMS: Array<{ value: string; label: string }> = [
  { value: "SARL", label: "SARL" },
  { value: "SAS", label: "SAS" },
  { value: "SASU", label: "SASU" },
  { value: "EURL", label: "EURL" },
  { value: "SA", label: "SA" },
  { value: "EI", label: "Entreprise Individuelle" },
  { value: "EIRL", label: "EIRL" },
  { value: "SCI", label: "SCI" },
  { value: "AUTO_ENTREPRENEUR", label: "Auto-entrepreneur" },
  { value: "OTHER", label: "Autre" },
];
