"use client";

import { Invoice } from "@/lib/invoices/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { DEFAULT_PAYMENT_TERMS } from "@/lib/invoices/defaults";

interface StepPaymentProps {
  invoice: Partial<Invoice>;
  totalTTC: number;
  onInvoiceChange: (invoice: Partial<Invoice>) => void;
}

export function StepPayment({ invoice, totalTTC, onInvoiceChange }: StepPaymentProps) {
  const handleChange = (field: keyof Invoice, value: any) => {
    onInvoiceChange({ ...invoice, [field]: value });
  };

  const handleDepositsPaidChange = (value: number) => {
    console.log('[DEBUG] handleDepositsPaidChange:', { newValue: value, current: invoice.depositsPaid, totalTTC });
    handleChange("depositsPaid", value);
    // Recalculer le reste à payer
    const remainingAmount = Math.max(0, totalTTC - value);
    handleChange("remainingAmount", remainingAmount);
  };

  const handleDepositsPercentageChange = (percentage: number) => {
    const amount = (totalTTC * percentage) / 100;
    handleDepositsPaidChange(amount);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Paiement & Acomptes</h2>
        <p className="text-white/70">Configurez les conditions de paiement et les acomptes</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            className="bg-black/20 border-white/10 text-white"
            disabled
          />
          <p className="text-xs text-white/50 mt-1">Calculée automatiquement</p>
        </div>

        <div className="md:col-span-2 border-t border-white/10 pt-4">
          <h3 className="text-lg font-semibold text-white mb-4">Acomptes déjà payés</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="depositsPaid" className="text-white">Montant (€)</Label>
              <Input
                id="depositsPaid"
                type="number"
                step="0.01"
                min="0"
                max={totalTTC}
                value={typeof invoice.depositsPaid === 'number' ? invoice.depositsPaid : 0}
                onChange={(e) => {
                  const value = parseFloat(e.target.value) || 0;
                  handleDepositsPaidChange(value);
                }}
                className="bg-black/20 border-white/10 text-white"
              />
            </div>

            <div>
              <Label htmlFor="depositsPercentage" className="text-white">Pourcentage (%)</Label>
              <Input
                id="depositsPercentage"
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={totalTTC > 0 ? ((typeof invoice.depositsPaid === 'number' ? invoice.depositsPaid : 0) / totalTTC * 100).toFixed(1) : 0}
                onChange={(e) => {
                  const percentage = parseFloat(e.target.value) || 0;
                  handleDepositsPercentageChange(percentage);
                }}
                className="bg-black/20 border-white/10 text-white"
              />
            </div>
          </div>

          <div className="mt-4 p-4 bg-black/20 rounded-lg">
            <div className="flex justify-between text-white mb-2">
              <span>Total TTC :</span>
              <span className="font-semibold">{totalTTC.toFixed(2)} €</span>
            </div>
            <div className="flex justify-between text-white/70 mb-2">
              <span>Acomptes payés :</span>
              <span>{(invoice.depositsPaid || 0).toFixed(2)} €</span>
            </div>
            <div className="flex justify-between text-white font-semibold border-t border-white/10 pt-2">
              <span>Reste à payer :</span>
              <span>{(invoice.remainingAmount || totalTTC).toFixed(2)} €</span>
            </div>
          </div>

          {invoice.depositsPaid && invoice.depositsPaid > totalTTC && (
            <p className="text-red-400 text-sm mt-2">
              ⚠️ Les acomptes ne peuvent pas dépasser le total TTC
            </p>
          )}
        </div>

        <div className="md:col-span-2">
          <Label htmlFor="paymentTerms" className="text-white">
            Conditions de paiement <span className="text-red-400">*</span>
          </Label>
          <Textarea
            id="paymentTerms"
            value={invoice.paymentTerms || DEFAULT_PAYMENT_TERMS}
            onChange={(e) => handleChange("paymentTerms", e.target.value)}
            className="bg-black/20 border-white/10 text-white"
            rows={4}
            placeholder={DEFAULT_PAYMENT_TERMS}
            required
          />
          <p className="text-xs text-red-400/70 mt-1">
            ⚠️ Obligatoire sur les factures
          </p>
        </div>

        <div className="md:col-span-2">
          <Label className="text-white mb-2 block">Moyens de paiement acceptés</Label>
          <div className="space-y-2">
            {["Virement bancaire", "Chèque", "Espèces", "Carte bancaire", "Prélèvement"].map((method) => {
              const methods = invoice.paymentMethods || [];
              const isSelected = methods.includes(method);
              return (
                <div key={method} className="flex items-center space-x-2">
                  <Checkbox
                    id={method}
                    checked={isSelected}
                    onCheckedChange={(checked) => {
                      const newMethods = checked
                        ? [...methods, method]
                        : methods.filter(m => m !== method);
                      handleChange("paymentMethods", newMethods);
                    }}
                  />
                  <Label htmlFor={method} className="text-white cursor-pointer">
                    {method}
                  </Label>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
