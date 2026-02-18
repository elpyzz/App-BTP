import { z } from "zod";
import { Company, CompanySchema, ChantierInfo, ChantierInfoSchema, VatRate, VatRateEnum, UnitEnum, Discount, DiscountSchema, LegalFormEnum } from "@/lib/quotes/types";

// Schéma Company strict pour les factures (SIRET et RCS obligatoires)
export const CompanySchemaForInvoice = CompanySchema.extend({
  siret: z.string().regex(/^\d{14}$/, "SIRET invalide (14 chiffres)").min(1, "SIRET obligatoire sur facture"),
  rcsCity: z.string().min(1, "Ville RCS obligatoire sur facture B2B"),
}).refine(
  (data) => {
    // Si forme juridique nécessite un capital (SARL, SAS, etc.) et capital = 0, erreur
    const requiresCapital = ["SARL", "SAS", "SASU", "SA", "EURL"];
    if (data.legalForm && requiresCapital.includes(data.legalForm)) {
      return data.capital === undefined || data.capital === null || data.capital > 0;
    }
    return true;
  },
  { message: "Le capital ne peut pas être 0 pour cette forme juridique", path: ["capital"] }
);

// ============================================
// ENUMS
// ============================================

export const InvoiceStatusEnum = z.enum([
  "draft",      // Brouillon
  "sent",       // Envoyée
  "paid",       // Payée
  "overdue",    // En retard
  "cancelled",  // Annulée
]);

export type InvoiceStatus = z.infer<typeof InvoiceStatusEnum>;

// ============================================
// SCHEMAS
// ============================================

// Client pour facture (étendu avec adresse de livraison)
export const InvoiceClientSchema = z.object({
  id: z.string().optional(),
  type: z.enum(["particulier", "professionnel"]).default("particulier"),
  name: z.string().min(1, "Nom du client requis"),
  contactName: z.string().optional(),
  
  // Adresse facturation (obligatoire)
  billingAddress: z.string().min(1, "Adresse de facturation requise"),
  billingPostalCode: z.string().regex(/^\d{5}$/, "Code postal invalide"),
  billingCity: z.string().min(1, "Ville requise"),
  
  // Adresse livraison/chantier (si différente)
  deliveryAddress: z.string().optional(),
  deliveryPostalCode: z.string().optional(),
  deliveryCity: z.string().optional(),
  
  // Adresse chantier (si différente)
  siteAddress: z.string().optional(),
  sitePostalCode: z.string().optional(),
  siteCity: z.string().optional(),
  
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  vatNumber: z.string().optional(), // Si professionnel B2B
});

export type InvoiceClient = z.infer<typeof InvoiceClientSchema>;

// Ligne de facture
export const InvoiceLineSchema = z.object({
  id: z.string(),
  lotId: z.string().optional(),
  lotName: z.string().optional(),
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
  brand: z.string().optional(),
  notes: z.string().optional(),
  
  // Ordre d'affichage
  order: z.number(),
});

export type InvoiceLine = z.infer<typeof InvoiceLineSchema>;

// Lot de facture
export const InvoiceLotSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Nom du lot requis"),
  description: z.string().optional(),
  order: z.number(),
});

export type InvoiceLot = z.infer<typeof InvoiceLotSchema>;

// Facture complète
export const InvoiceSchema = z.object({
  id: z.string(),
  userId: z.string().min(1, "User ID requis"),
  invoiceNumber: z.string().regex(/^FAC-\d{4}-\d{4}$/, "Format invalide (FAC-YYYY-XXXX)"),
  status: InvoiceStatusEnum.default("draft"),
  
  // Dates
  issueDate: z.string().min(1, "Date d'émission requise"),
  saleDate: z.string().optional(), // Date de vente/prestation (obligatoire si pas de période d'exécution)
  executionPeriodStart: z.string().optional(), // Période d'exécution début
  executionPeriodEnd: z.string().optional(), // Période d'exécution fin
  dueDate: z.string().min(1, "Date d'échéance requise"),
  paymentDelayDays: z.number().min(0).max(120).default(30),
  
  // Références
  quoteId: z.string().optional(), // ID du devis d'origine
  quoteNumber: z.string().optional(), // Numéro du devis
  purchaseOrderNumber: z.string().optional(), // Bon de commande
  internalReference: z.string().optional(),
  
  // Entités
  company: CompanySchemaForInvoice, // Schéma strict pour factures
  client: InvoiceClientSchema,
  chantier: ChantierInfoSchema,
  
  // Contenu
  lots: z.array(InvoiceLotSchema).default([]),
  lines: z.array(InvoiceLineSchema).min(1, "Au moins une ligne requise"),
  
  // Financier
  discount: DiscountSchema.optional(),
  travelCosts: z.number().optional(),
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
  
  // Acomptes
  depositsPaid: z.number().min(0).default(0), // Acomptes déjà payés
  remainingAmount: z.number().default(0), // Reste à payer = totalTTC - depositsPaid
  
  // Paiement
  paymentTerms: z.string().min(1, "Conditions de paiement obligatoires"),
  paymentMethods: z.array(z.string()).optional(),
  
  // Mentions légales
  latePaymentPenalties: z.string().min(1, "Pénalités de retard obligatoires en B2B"),
  recoveryFee: z.number().default(40), // Indemnité forfaitaire recouvrement (40€ B2B)
  specialVatMention: z.string().optional(), // Mention TVA spéciale
  
  // Métadonnées
  notes: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
}).refine(
  (data) => data.depositsPaid <= data.totalTTC,
  { 
    message: "Les acomptes ne peuvent pas dépasser le total TTC",
    path: ["depositsPaid"]
  }
).refine(
  (data) => data.saleDate || (data.executionPeriodStart && data.executionPeriodEnd),
  {
    message: "Date de prestation ou période d'exécution requise",
    path: ["saleDate"]
  }
);

export type Invoice = z.infer<typeof InvoiceSchema>;

// ============================================
// FONCTIONS UTILITAIRES
// ============================================

/**
 * Génère un numéro de facture unique
 * Format: FAC-YYYY-XXXX
 */
export function generateInvoiceNumber(existingInvoices: Invoice[]): string {
  const year = new Date().getFullYear();
  const prefix = `FAC-${year}-`;
  
  // Trouver le plus grand numéro pour cette année
  const maxNumber = existingInvoices
    .filter(inv => inv.invoiceNumber.startsWith(prefix))
    .map(inv => parseInt(inv.invoiceNumber.replace(prefix, "")) || 0)
    .reduce((max, n) => Math.max(max, n), 0);
  
  const nextNumber = (maxNumber + 1).toString().padStart(4, "0");
  return `${prefix}${nextNumber}`;
}

/**
 * Calcule la date d'échéance à partir de la date d'émission et du délai
 */
export function calculateDueDate(issueDate: string, delayDays: number): string {
  const date = new Date(issueDate);
  date.setDate(date.getDate() + delayDays);
  return date.toISOString().split("T")[0];
}

/**
 * Calcule le reste à payer
 */
export function calculateRemainingAmount(totalTTC: number, depositsPaid: number): number {
  return Math.round((totalTTC - depositsPaid) * 100) / 100;
}

/**
 * Génère un ID unique
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}
