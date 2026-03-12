"use client";

import { useState, useEffect, useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import { UserAccountButton } from "@/components/UserAccountButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { loadInvoices } from "@/lib/storage/invoices";
import { loadCurrentCompany } from "@/lib/storage/company";
import type { Invoice } from "@/lib/invoices/types";
import {
  generateReceiptsBookPDF,
  type ReceiptsBookLine,
} from "@/lib/accounting/receipts-book-pdf";
import { useCompany } from "@/context/CompanyContext";

const MONTHS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

function isInMonth(paidAt: string, year: number, month: number): boolean {
  const [y, m] = paidAt.split("-").map(Number);
  return y === year && m === month;
}

function isInYear(paidAt: string, year: number): boolean {
  return parseInt(paidAt.slice(0, 4), 10) === year;
}

function buildLines(invoices: Invoice[]): ReceiptsBookLine[] {
  return invoices.map((inv) => {
    const date = inv.paidAt || inv.issueDate || "";
    const amount =
      inv.paymentStatus === "paid"
        ? inv.totalTTC ?? 0
        : inv.depositsPaid ?? 0;
    return {
      date,
      invoiceNumber: inv.invoiceNumber ?? "",
      clientName: inv.client?.name ?? "—",
      amount,
      status: inv.paymentStatus === "paid" ? "paid" : "partial",
    };
  });
}

export default function LivreRecettesPage() {
  const { company } = useCompany();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | "all">("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await loadInvoices();
      const paidOrPartial = list.filter(
        (inv) => inv.paymentStatus === "paid" || inv.paymentStatus === "partial"
      );
      setInvoices(paidOrPartial);
    } catch (e) {
      console.error(e);
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const handler = () => load();
    window.addEventListener("invoicesUpdated", handler);
    return () => window.removeEventListener("invoicesUpdated", handler);
  }, [load]);

  const filtered = invoices.filter((inv) => {
    const paidAt = inv.paidAt;
    if (!paidAt) return false;
    if (selectedMonth === "all") return isInYear(paidAt, selectedYear);
    return isInMonth(paidAt, selectedYear, selectedMonth);
  });

  const lines = buildLines(filtered);
  const periodLabel =
    selectedMonth === "all"
      ? `Année ${selectedYear}`
      : `${MONTHS[selectedMonth - 1]} ${selectedYear}`;
  const total = lines.reduce((s, l) => s + l.amount, 0);

  const handleExportPDF = async () => {
    const companyForPdf = company ?? (await loadCurrentCompany());
    const doc = generateReceiptsBookPDF(lines, periodLabel, companyForPdf ?? undefined);
    doc.save(`Livre_de_recettes_${periodLabel.replace(/\s/g, "_")}.pdf`);
  };

  const years = Array.from(
    { length: 5 },
    (_, i) => new Date().getFullYear() - i
  );

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="relative z-10">
        <Sidebar />
        <UserAccountButton />
        <main className="ml-0 lg:ml-0 p-4 md:p-6 lg:p-8">
          <div className="max-w-5xl mx-auto">
            <div className="mb-6 md:mb-8 ml-0 md:ml-20">
              <h1 className="text-2xl md:text-4xl font-light tracking-tight text-white mb-2 drop-shadow-lg">
                Livre de recettes
              </h1>
              <p className="text-sm md:text-base text-white/90 drop-shadow-md">
                Liste des encaissements (factures payées ou partiellement payées)
              </p>
            </div>

            <Card className="bg-black/20 backdrop-blur-md border border-white/10 shadow-xl rounded-2xl text-white">
              <CardHeader>
                <CardTitle className="text-white font-light">Filtres</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-4 items-end">
                <div>
                  <Label className="text-white/80 text-sm">Année</Label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="mt-1 block w-full rounded-md bg-white/10 border border-white/20 text-white px-3 py-2"
                  >
                    {years.map((y) => (
                      <option key={y} value={y} style={{ backgroundColor: '#fff', color: '#000' }}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className="text-white/80 text-sm">Mois</Label>
                  <select
                    value={selectedMonth}
                    onChange={(e) =>
                      setSelectedMonth(
                        e.target.value === "all" ? "all" : Number(e.target.value)
                      )
                    }
                    className="mt-1 block w-full rounded-md bg-white/10 border border-white/20 text-white px-3 py-2"
                  >
                    <option value="all" style={{ backgroundColor: '#fff', color: '#000' }}>Tous les mois</option>
                    {MONTHS.map((m, i) => (
                      <option key={i} value={i + 1} style={{ backgroundColor: '#fff', color: '#000' }}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
                <Button
                  onClick={handleExportPDF}
                  disabled={lines.length === 0}
                  className="bg-[var(--accent-amber)] text-black hover:opacity-90"
                >
                  Exporter en PDF
                </Button>
              </CardContent>
            </Card>

            <Card className="mt-6 bg-black/20 backdrop-blur-md border border-white/10 shadow-xl rounded-2xl text-white overflow-hidden">
              <CardHeader>
                <CardTitle className="text-white font-light">
                  Encaissements — {periodLabel}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {loading ? (
                  <div className="p-8 text-center text-white/60">
                    Chargement…
                  </div>
                ) : lines.length === 0 ? (
                  <div className="p-8 text-center text-white/60">
                    Aucun encaissement pour cette période. Renseignez le statut de
                    paiement et la date d&apos;encaissement sur les factures
                    (Dossiers).
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/10">
                          <th className="text-left py-3 px-4 text-white/70 font-medium">
                            Date
                          </th>
                          <th className="text-left py-3 px-4 text-white/70 font-medium">
                            N° Facture
                          </th>
                          <th className="text-left py-3 px-4 text-white/70 font-medium">
                            Client
                          </th>
                          <th className="text-left py-3 px-4 text-white/70 font-medium">
                            Statut
                          </th>
                          <th className="text-right py-3 px-4 text-white/70 font-medium">
                            Montant
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {lines.map((line, i) => (
                          <tr
                            key={`${line.invoiceNumber}-${i}`}
                            className="border-b border-white/5"
                          >
                            <td className="py-2 px-4">
                              {new Date(line.date).toLocaleDateString("fr-FR")}
                            </td>
                            <td className="py-2 px-4">{line.invoiceNumber}</td>
                            <td className="py-2 px-4">{line.clientName}</td>
                            <td className="py-2 px-4">
                              {line.status === "paid" ? "Payée" : "Partiel"}
                            </td>
                            <td className="py-2 px-4 text-right">
                              {line.amount.toFixed(2).replace(".", ",")} €
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="border-t border-white/10 py-3 px-4 flex justify-end font-medium">
                      Total : {total.toFixed(2).replace(".", ",")} €
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
