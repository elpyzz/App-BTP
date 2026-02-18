"use client";

import { Invoice } from "@/lib/invoices/types";
import { Quote } from "@/lib/quotes/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { loadQuotes } from "@/lib/storage/quotes";
import { useEffect, useState } from "react";
import { calculateDueDate } from "@/lib/invoices/types";

interface StepInvoiceInfoProps {
  invoice: Partial<Invoice>;
  onInvoiceChange: (invoice: Partial<Invoice>) => void;
}

export function StepInvoiceInfo({ invoice, onInvoiceChange }: StepInvoiceInfoProps) {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [selectedQuoteId, setSelectedQuoteId] = useState<string>("");

  useEffect(() => {
    loadQuotes().then(setQuotes);
  }, []);

  const handleChange = (field: keyof Invoice, value: any) => {
    onInvoiceChange({ ...invoice, [field]: value });
  };

  const handleQuoteSelect = (quoteId: string) => {
    if (quoteId === "__none__" || quoteId === "") {
      setSelectedQuoteId("");
      handleChange("quoteId", undefined);
      handleChange("quoteNumber", undefined);
      return;
    }

    const selectedQuote = quotes.find(q => q.id === quoteId);
    if (selectedQuote) {
      setSelectedQuoteId(quoteId);
      handleChange("quoteId", selectedQuote.id);
      handleChange("quoteNumber", selectedQuote.quoteNumber);
    }
  };

  // Calculer la date d'échéance si la date d'émission ou le délai change
  useEffect(() => {
    if (invoice.issueDate && invoice.paymentDelayDays !== undefined) {
      const dueDate = calculateDueDate(invoice.issueDate, invoice.paymentDelayDays);
      handleChange("dueDate", dueDate);
    }
  }, [invoice.issueDate, invoice.paymentDelayDays]);

  // Pré-remplir avec la date d'aujourd'hui si vide
  useEffect(() => {
    if (!invoice.issueDate) {
      const today = new Date().toISOString().split("T")[0];
      handleChange("issueDate", today);
    }
    if (!invoice.paymentDelayDays) {
      handleChange("paymentDelayDays", 30);
    }
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Informations Facture</h2>
        <p className="text-white/70">Renseignez les dates et références de la facture</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="issueDate" className="text-white">
            Date d'émission <span className="text-red-400">*</span>
          </Label>
          <Input
            id="issueDate"
            type="date"
            value={invoice.issueDate || ""}
            onChange={(e) => handleChange("issueDate", e.target.value)}
            className="bg-black/20 border-white/10 text-white"
          />
        </div>

        <div>
          <Label htmlFor="saleDate" className="text-white">
            Date de vente/prestation <span className="text-red-400">*</span>
          </Label>
          <Input
            id="saleDate"
            type="date"
            value={invoice.saleDate || ""}
            onChange={(e) => handleChange("saleDate", e.target.value || undefined)}
            className="bg-black/20 border-white/10 text-white"
            required
          />
          <p className="text-xs text-white/50 mt-1">
            OU remplir la période d'exécution ci-dessous
          </p>
        </div>

        <div>
          <Label htmlFor="executionPeriodStart" className="text-white">
            Période d'exécution - Début <span className="text-yellow-400">⚠️</span>
          </Label>
          <Input
            id="executionPeriodStart"
            type="date"
            value={invoice.executionPeriodStart || ""}
            onChange={(e) => handleChange("executionPeriodStart", e.target.value || undefined)}
            className="bg-black/20 border-white/10 text-white"
          />
          <p className="text-xs text-white/50 mt-1">
            Si période d'exécution, remplir début et fin
          </p>
        </div>

        <div>
          <Label htmlFor="executionPeriodEnd" className="text-white">
            Période d'exécution - Fin <span className="text-yellow-400">⚠️</span>
          </Label>
          <Input
            id="executionPeriodEnd"
            type="date"
            value={invoice.executionPeriodEnd || ""}
            onChange={(e) => handleChange("executionPeriodEnd", e.target.value || undefined)}
            className="bg-black/20 border-white/10 text-white"
          />
        </div>

        <div>
          <Label htmlFor="paymentDelayDays" className="text-white">
            Délai de paiement (jours) <span className="text-red-400">*</span>
          </Label>
          <Input
            id="paymentDelayDays"
            type="number"
            min="0"
            max="120"
            value={invoice.paymentDelayDays || 30}
            onChange={(e) => handleChange("paymentDelayDays", parseInt(e.target.value) || 30)}
            className="bg-black/20 border-white/10 text-white"
          />
        </div>

        <div>
          <Label htmlFor="dueDate" className="text-white">
            Date d'échéance <span className="text-red-400">*</span>
          </Label>
          <Input
            id="dueDate"
            type="date"
            value={invoice.dueDate || ""}
            onChange={(e) => handleChange("dueDate", e.target.value)}
            className="bg-black/20 border-white/10 text-white"
            disabled
          />
          <p className="text-xs text-white/50 mt-1">Calculée automatiquement</p>
        </div>

        <div className="md:col-span-2">
          <Label htmlFor="quoteId" className="text-white">Référence devis</Label>
          <Select value={selectedQuoteId || "__none__"} onValueChange={handleQuoteSelect}>
            <SelectTrigger className="bg-black/20 border-white/10 text-white">
              <SelectValue placeholder="Sélectionner un devis (optionnel)" />
            </SelectTrigger>
            <SelectContent className="bg-black/20 border-white/10">
              <SelectItem value="__none__">Aucun devis</SelectItem>
              {quotes.map((quote) => (
                <SelectItem key={quote.id} value={quote.id}>
                  {quote.quoteNumber} - {quote.client.name} - {quote.totalTTC.toFixed(2)}€
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {invoice.quoteNumber && (
            <p className="text-xs text-white/50 mt-1">Devis sélectionné : {invoice.quoteNumber}</p>
          )}
        </div>

        <div>
          <Label htmlFor="purchaseOrderNumber" className="text-white">Numéro bon de commande</Label>
          <Input
            id="purchaseOrderNumber"
            value={invoice.purchaseOrderNumber || ""}
            onChange={(e) => handleChange("purchaseOrderNumber", e.target.value || undefined)}
            className="bg-black/20 border-white/10 text-white"
            placeholder="BC-2024-001"
          />
        </div>

        <div>
          <Label htmlFor="internalReference" className="text-white">Référence interne</Label>
          <Input
            id="internalReference"
            value={invoice.internalReference || ""}
            onChange={(e) => handleChange("internalReference", e.target.value || undefined)}
            className="bg-black/20 border-white/10 text-white"
            placeholder="REF-INT-001"
          />
        </div>
      </div>
    </div>
  );
}
