import { Invoice, InvoiceLine, Discount, VatRate } from "./types";

/**
 * Calcule le total HT d'une ligne
 */
export function calculateLineTotal(line: Partial<InvoiceLine>): {
  totalHT: number;
  totalTVA: number;
  totalTTC: number;
} {
  const quantity = line.quantity || 0;
  const unitPriceHT = line.unitPriceHT || 0;
  const vatRate = parseFloat(line.vatRate || "20");
  
  const totalHT = Math.round(quantity * unitPriceHT * 100) / 100;
  const totalTVA = Math.round(totalHT * (vatRate / 100) * 100) / 100;
  const totalTTC = Math.round((totalHT + totalTVA) * 100) / 100;
  
  return { totalHT, totalTVA, totalTTC };
}

/**
 * Calcule le sous-total HT de toutes les lignes
 */
export function calculateSubtotalHT(lines: InvoiceLine[]): number {
  return Math.round(
    lines.reduce((sum, line) => sum + line.totalHT, 0) * 100
  ) / 100;
}

/**
 * Calcule le montant de la remise
 */
export function calculateDiscountAmount(
  subtotalHT: number,
  discount?: Discount
): number {
  if (!discount?.enabled || !discount.value) return 0;
  
  if (discount.type === "percentage") {
    return Math.round(subtotalHT * (discount.value / 100) * 100) / 100;
  }
  
  return Math.round(discount.value * 100) / 100;
}

/**
 * Calcule la répartition TVA par taux
 */
export function calculateVATBreakdown(
  lines: InvoiceLine[],
  discountAmount: number
): Array<{ rate: VatRate; baseHT: number; vatAmount: number }> {
  // Grouper par taux de TVA
  const byRate = lines.reduce((acc, line) => {
    const rate = line.vatRate;
    if (!acc[rate]) {
      acc[rate] = { totalHT: 0, totalTVA: 0 };
    }
    acc[rate].totalHT += line.totalHT;
    acc[rate].totalTVA += line.totalTVA;
    return acc;
  }, {} as Record<string, { totalHT: number; totalTVA: number }>);
  
  // Répartir la remise proportionnellement
  const subtotalHT = calculateSubtotalHT(lines);
  
  return Object.entries(byRate).map(([rate, values]) => {
    const proportion = subtotalHT > 0 ? values.totalHT / subtotalHT : 0;
    const discountPart = discountAmount * proportion;
    const baseHT = Math.round((values.totalHT - discountPart) * 100) / 100;
    const vatAmount = Math.round(baseHT * (parseFloat(rate) / 100) * 100) / 100;
    
    return {
      rate: rate as VatRate,
      baseHT,
      vatAmount,
    };
  });
}

/**
 * Calcule tous les totaux de la facture
 */
export function calculateInvoiceTotals(
  lines: InvoiceLine[],
  discount?: Discount,
  travelCosts?: number,
  depositsPaid: number = 0
): {
  subtotalHT: number;
  discountAmount: number;
  totalHT: number;
  vatBreakdown: Array<{ rate: VatRate; baseHT: number; vatAmount: number }>;
  totalTVA: number;
  totalTTC: number;
  remainingAmount: number;
} {
  // Sous-total HT
  const subtotalHT = calculateSubtotalHT(lines);
  
  // Remise
  const discountAmount = calculateDiscountAmount(subtotalHT, discount);
  
  // Total HT après remise
  let totalHT = Math.round((subtotalHT - discountAmount) * 100) / 100;
  
  // Ajouter frais de déplacement
  if (travelCosts && travelCosts > 0) {
    totalHT = Math.round((totalHT + travelCosts) * 100) / 100;
  }
  
  // Répartition TVA
  const vatBreakdown = calculateVATBreakdown(lines, discountAmount);
  
  // Total TVA
  const totalTVA = Math.round(
    vatBreakdown.reduce((sum, item) => sum + item.vatAmount, 0) * 100
  ) / 100;
  
  // Total TTC
  const totalTTC = Math.round((totalHT + totalTVA) * 100) / 100;
  
  // Reste à payer (après déduction des acomptes)
  const remainingAmount = Math.round((totalTTC - depositsPaid) * 100) / 100;
  
  return {
    subtotalHT,
    discountAmount,
    totalHT,
    vatBreakdown,
    totalTVA,
    totalTTC,
    remainingAmount,
  };
}

/**
 * Formate un montant en euros
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

/**
 * Formate un taux de TVA
 */
export function formatVatRate(rate: VatRate): string {
  return `${rate}%`;
}
