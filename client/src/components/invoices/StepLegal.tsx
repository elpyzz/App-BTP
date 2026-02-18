"use client";

import { Invoice } from "@/lib/invoices/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DEFAULT_LATE_PAYMENT_PENALTIES, DEFAULT_RECOVERY_FEE, SPECIAL_VAT_MENTIONS } from "@/lib/invoices/defaults";

interface StepLegalProps {
  invoice: Partial<Invoice>;
  onInvoiceChange: (invoice: Partial<Invoice>) => void;
}

export function StepLegal({ invoice, onInvoiceChange }: StepLegalProps) {
  const handleChange = (field: keyof Invoice, value: any) => {
    onInvoiceChange({ ...invoice, [field]: value });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Mentions Légales</h2>
        <p className="text-white/70">Configurez les mentions légales obligatoires pour les factures B2B</p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="latePaymentPenalties" className="text-white">
            Pénalités de retard
          </Label>
          <Textarea
            id="latePaymentPenalties"
            value={invoice.latePaymentPenalties || DEFAULT_LATE_PAYMENT_PENALTIES}
            onChange={(e) => handleChange("latePaymentPenalties", e.target.value)}
            className="bg-black/20 border-white/10 text-white"
            rows={4}
            placeholder={DEFAULT_LATE_PAYMENT_PENALTIES}
          />
          <p className="text-xs text-white/50 mt-1">
            Obligatoire en B2B selon l'article L.441-10 du Code de commerce
          </p>
        </div>

        <div>
          <Label htmlFor="recoveryFee" className="text-white">
            Indemnité forfaitaire pour frais de recouvrement (€)
          </Label>
          <Input
            id="recoveryFee"
            type="number"
            step="0.01"
            min="0"
            value={invoice.recoveryFee || DEFAULT_RECOVERY_FEE}
            onChange={(e) => handleChange("recoveryFee", parseFloat(e.target.value) || DEFAULT_RECOVERY_FEE)}
            className="bg-black/20 border-white/10 text-white"
          />
          <p className="text-xs text-white/50 mt-1">
            Montant forfaitaire de 40€ par défaut (B2B)
          </p>
        </div>

        <div>
          <Label htmlFor="specialVatMention" className="text-white">Mention TVA spéciale</Label>
          <Select
            value={invoice.specialVatMention || "__none__"}
            onValueChange={(value) => handleChange("specialVatMention", value === "__none__" ? undefined : value)}
          >
            <SelectTrigger className="bg-black/20 border-white/10 text-white">
              <SelectValue placeholder="Sélectionner une mention" />
            </SelectTrigger>
            <SelectContent className="bg-black/20 border-white/10">
              {SPECIAL_VAT_MENTIONS.map((mention) => (
                <SelectItem key={mention.value} value={mention.value}>
                  {mention.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-white/50 mt-1">
            Pour les cas particuliers (franchise en base, autoliquidation, etc.)
          </p>
        </div>

        {invoice.specialVatMention && invoice.specialVatMention !== "__none__" && invoice.specialVatMention !== "" && (
          <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <p className="text-yellow-400 text-sm">
              ⚠️ Mention TVA spéciale sélectionnée : {SPECIAL_VAT_MENTIONS.find(m => m.value === invoice.specialVatMention)?.label}
            </p>
          </div>
        )}

        <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <p className="text-blue-400 text-sm font-semibold mb-2">Informations légales</p>
          <ul className="text-white/70 text-sm space-y-1 list-disc list-inside">
            <li>Les pénalités de retard et l'indemnité forfaitaire sont obligatoires en B2B</li>
            <li>Le taux des pénalités est fixé à 3 fois le taux d'intérêt légal</li>
            <li>L'indemnité forfaitaire est de 40€ minimum pour les créances B2B</li>
            <li>Ces mentions doivent apparaître sur la facture pour être opposables</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
