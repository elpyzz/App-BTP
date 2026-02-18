import { z } from "zod";

// ============================================
// ENUMS
// ============================================

export const LegalFormEnum = z.enum([
  "SARL",
  "SAS",
  "SASU",
  "EURL",
  "SA",
  "EI",
  "EIRL",
  "SCI",
  "AUTO_ENTREPRENEUR",
  "OTHER",
]);

export type LegalForm = z.infer<typeof LegalFormEnum>;

export const VatRateEnum = z.enum(["0", "5.5", "10", "20"]);
export type VatRate = z.infer<typeof VatRateEnum>;

export const UnitEnum = z.enum([
  "h",      // heure
  "m2",     // mètre carré
  "ml",     // mètre linéaire
  "m3",     // mètre cube
  "forfait",
  "unite",
  "lot",
  "jour",
  "mois",
  "kg",
  "l",      // litre
]);

export type Unit = z.infer<typeof UnitEnum>;

export const DiscountTypeEnum = z.enum(["percentage", "amount"]);
export type DiscountType = z.infer<typeof DiscountTypeEnum>;

export const DepositBaseEnum = z.enum(["HT", "TTC"]);
export type DepositBase = z.infer<typeof DepositBaseEnum>;

export const QuoteStatusEnum = z.enum([
  "draft",      // Brouillon
  "sent",       // Envoyé
  "accepted",   // Accepté
  "rejected",   // Refusé
  "expired",    // Expiré
]);

export type QuoteStatus = z.infer<typeof QuoteStatusEnum>;

// ============================================
// SCHEMAS
// ============================================

// Informations entreprise
export const CompanySchema = z.object({
  // Obligatoires
  name: z.string().min(1, "Nom de l'entreprise requis"),
  legalForm: LegalFormEnum.optional(),
  siret: z.string().regex(/^\d{14}$/, "SIRET invalide (14 chiffres)"),
  address: z.string().min(1, "Adresse requise"),
  postalCode: z.string().regex(/^\d{5}$/, "Code postal invalide"),
  city: z.string().min(1, "Ville requise"),
  phone: z.string().min(1, "Téléphone requis"),
  email: z.string().email("Email invalide"),
  
  // Recommandés
  vatNumber: z.string().optional(), // N° TVA intracommunautaire
  rcsCity: z.string().optional(),   // Ville RCS
  capital: z.number().optional(),   // Capital social
  country: z.string().optional().default("France"), // Pays
  apeCode: z.string().optional(),   // Code APE/NAF
  
  // Optionnels
  logo: z.string().optional(),      // Base64 ou URL
  website: z.string().optional(),
  fax: z.string().optional(),
  iban: z.string().optional(),
  
  // Assurances (recommandées BTP)
  insuranceDecennale: z.object({
    company: z.string(),
    policyNumber: z.string(),
    coverageZone: z.string().optional(),
    validUntil: z.string(),
  }).optional(),
  
  insuranceRC: z.object({
    company: z.string(),
    policyNumber: z.string(),
  }).optional(),
  
  // Qualifications
  qualifications: z.array(z.string()).optional(), // RGE, Qualibat, etc.
});

export type Company = z.infer<typeof CompanySchema>;

// Client
export const QuoteClientSchema = z.object({
  id: z.string().optional(),
  type: z.enum(["particulier", "professionnel"]).default("particulier"),
  name: z.string().min(1, "Nom du client requis"),
  contactName: z.string().optional(),
  
  // Adresse facturation (obligatoire)
  billingAddress: z.string().min(1, "Adresse de facturation requise"),
  billingPostalCode: z.string().regex(/^\d{5}$/, "Code postal invalide"),
  billingCity: z.string().min(1, "Ville requise"),
  
  // Adresse chantier (si différente)
  siteAddress: z.string().optional(),
  sitePostalCode: z.string().optional(),
  siteCity: z.string().optional(),
  
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  vatNumber: z.string().optional(), // Si professionnel
});

export type QuoteClient = z.infer<typeof QuoteClientSchema>;

// Informations chantier
export const ChantierInfoSchema = z.object({
  name: z.string().min(1, "Nom du chantier requis"),
  description: z.string().optional(),
  address: z.string().optional(), // Si différent de siteAddress client
  estimatedStartDate: z.string().optional(),
  estimatedDuration: z.string().optional(), // "3 semaines", "2 mois"
  accessConstraints: z.string().optional(),
  specialConditions: z.string().optional(),
  internalReference: z.string().optional(),
});

export type ChantierInfo = z.infer<typeof ChantierInfoSchema>;

// Ligne de devis
export const QuoteLineSchema = z.object({
  id: z.string(),
  lotId: z.string().optional(),      // ID du lot (si dans un lot)
  lotName: z.string().optional(),    // Nom du lot (pour affichage)
  description: z.string().min(1, "Description requise"),
  quantity: z.number().min(0.01, "Quantité requise"),
  unit: UnitEnum,
  unitPriceHT: z.number().min(0, "Prix unitaire requis"),
  vatRate: VatRateEnum.default("20"),
  
  // Calculés automatiquement
  totalHT: z.number(),
  totalTVA: z.number(),
  totalTTC: z.number(),
  
  // Optionnels
  reference: z.string().optional(),
  estimatedTime: z.string().optional(),
  brand: z.string().optional(),
  notes: z.string().optional(),
  
  // Ordre d'affichage
  order: z.number(),
});

export type QuoteLine = z.infer<typeof QuoteLineSchema>;

// Lot de devis
export const QuoteLotSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Nom du lot requis"),
  description: z.string().optional(),
  order: z.number(),
});

export type QuoteLot = z.infer<typeof QuoteLotSchema>;

// Remise
export const DiscountSchema = z.object({
  enabled: z.boolean().default(false),
  type: DiscountTypeEnum.default("percentage"),
  value: z.number().min(0).default(0),
  description: z.string().optional(),
});

export type Discount = z.infer<typeof DiscountSchema>;

// Acompte
export const DepositSchema = z.object({
  enabled: z.boolean().default(false),
  type: DiscountTypeEnum.default("percentage"),
  value: z.number().min(0).default(30), // 30% par défaut
  base: DepositBaseEnum.default("TTC"),
  description: z.string().optional(),
});

export type Deposit = z.infer<typeof DepositSchema>;

// Échéance de paiement
export const PaymentScheduleItemSchema = z.object({
  id: z.string(),
  label: z.string(),          // "À la commande", "Début travaux", etc.
  percentage: z.number(),
  amount: z.number(),
  trigger: z.string(),        // Condition de déclenchement
  dueDate: z.string().optional(),
});

export type PaymentScheduleItem = z.infer<typeof PaymentScheduleItemSchema>;

// Conditions du devis
export const QuoteConditionsSchema = z.object({
  executionTerms: z.string().optional(),
  paymentTerms: z.string().optional(),
  depositTerms: z.string().optional(),
  warranties: z.string().optional(),
  unforeseenClause: z.string().optional(),
  cancellationTerms: z.string().optional(),
  latePaymentPenalties: z.string().optional(),
  generalConditionsUrl: z.string().optional(),
  rgpdMention: z.string().optional(),
  materialsOwnership: z.string().optional(),
  paymentMethods: z.array(z.string()).optional(), // Moyens de paiement sélectionnés
});

export type QuoteConditions = z.infer<typeof QuoteConditionsSchema>;

// Signature
export const SignatureSchema = z.object({
  enabled: z.boolean().default(false),
  signatureData: z.string().optional(), // Base64 de la signature
  signerName: z.string().optional(),
  signedAt: z.string().optional(),
  signedPlace: z.string().optional(),
  acceptanceText: z.string().default("Bon pour accord"),
});

export type Signature = z.infer<typeof SignatureSchema>;

// Devis complet
export const QuoteSchema = z.object({
  id: z.string(),
  quoteNumber: z.string(),
  status: QuoteStatusEnum.default("draft"),
  
  // Dates
  issueDate: z.string(),
  validityDays: z.number().default(30),
  expirationDate: z.string(),
  
  // Références
  dossierId: z.string().optional(),
  salesPerson: z.string().optional(),
  clientReference: z.string().optional(),
  
  // Entités
  company: CompanySchema,
  client: QuoteClientSchema,
  chantier: ChantierInfoSchema,
  
  // Contenu
  lots: z.array(QuoteLotSchema).default([]),
  lines: z.array(QuoteLineSchema),
  
  // Financier
  discount: DiscountSchema.optional(),
  deposit: DepositSchema.optional(),
  paymentSchedule: z.array(PaymentScheduleItemSchema).optional(),
  travelCosts: z.number().optional(),
  
  // Totaux (calculés)
  subtotalHT: z.number(),
  discountAmount: z.number().default(0),
  totalHT: z.number(),
  vatBreakdown: z.array(z.object({
    rate: VatRateEnum,
    baseHT: z.number(),
    vatAmount: z.number(),
  })),
  totalTVA: z.number(),
  totalTTC: z.number(),
  depositAmount: z.number().default(0),
  remainingAmount: z.number(),
  
  // Conditions et signature
  conditions: QuoteConditionsSchema.optional(),
  signature: SignatureSchema.optional(),
  
  // Métadonnées
  notes: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Quote = z.infer<typeof QuoteSchema>;

// ============================================
// FONCTIONS UTILITAIRES
// ============================================

/**
 * Génère un numéro de devis unique
 * Format: DEV-YYYY-XXXX
 */
export function generateQuoteNumber(existingQuotes: Quote[]): string {
  const year = new Date().getFullYear();
  const prefix = `DEV-${year}-`;
  
  // Trouver le plus grand numéro pour cette année
  const maxNumber = existingQuotes
    .filter(q => q.quoteNumber.startsWith(prefix))
    .map(q => parseInt(q.quoteNumber.replace(prefix, "")) || 0)
    .reduce((max, n) => Math.max(max, n), 0);
  
  const nextNumber = (maxNumber + 1).toString().padStart(4, "0");
  return `${prefix}${nextNumber}`;
}

/**
 * Génère un ID unique
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Calcule la date d'expiration
 */
export function calculateExpirationDate(issueDate: string, validityDays: number): string {
  const date = new Date(issueDate);
  date.setDate(date.getDate() + validityDays);
  return date.toISOString().split("T")[0];
}
