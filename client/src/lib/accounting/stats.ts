import type { Invoice } from "@/lib/invoices/types";

/**
 * CA encaissé du mois : factures avec payment_status = 'paid' et paid_at dans le mois donné.
 * Somme des totalTTC.
 */
export function caEncaisseDuMois(invoices: Invoice[], year: number, month: number): number {
  return invoices
    .filter(
      (inv) =>
        inv.paymentStatus === "paid" &&
        inv.paidAt &&
        isInMonth(inv.paidAt, year, month)
    )
    .reduce((sum, inv) => sum + (inv.totalTTC ?? 0), 0);
}

/**
 * CA en attente : factures non payées (unpaid ou partial).
 * Somme des remainingAmount.
 */
export function caEnAttente(invoices: Invoice[]): number {
  return invoices
    .filter((inv) => inv.paymentStatus === "unpaid" || inv.paymentStatus === "partial")
    .reduce((sum, inv) => sum + (inv.remainingAmount ?? 0), 0);
}

/**
 * CA de l'année : factures avec payment_status = 'paid' et paid_at dans l'année.
 * Somme des totalTTC.
 */
export function caEncaisseAnnee(invoices: Invoice[], year: number): number {
  return invoices
    .filter(
      (inv) =>
        inv.paymentStatus === "paid" &&
        inv.paidAt &&
        getYearFromDateString(inv.paidAt) === year
    )
    .reduce((sum, inv) => sum + (inv.totalTTC ?? 0), 0);
}

/**
 * Évolution mensuelle des encaissements pour le graphique.
 * Retourne un tableau { mois, annee, label, montant } pour les 12 derniers mois.
 * Montant = CA encaissé du mois (paid + paid_at dans le mois).
 */
export function evolutionMensuelleEncaissements(
  invoices: Invoice[]
): { mois: number; annee: number; label: string; montant: number }[] {
  const months = [
    "Jan", "Fév", "Mar", "Avr", "Mai", "Jun",
    "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc",
  ];
  const now = new Date();
  const result: { mois: number; annee: number; label: string; montant: number }[] = [];

  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = d.getMonth();
    const label = `${months[month]} ${year}`;
    const montant = caEncaisseDuMois(invoices, year, month + 1); // getMonth() 0-based
    result.push({ mois: month + 1, annee: year, label, montant });
  }

  return result;
}

function isInMonth(dateStr: string, year: number, month: number): boolean {
  const [y, m] = dateStr.split("-").map(Number);
  return y === year && m === month;
}

function getYearFromDateString(dateStr: string): number {
  const y = parseInt(dateStr.slice(0, 4), 10);
  return Number.isNaN(y) ? 0 : y;
}
