"use client";

import { Discount, Deposit, VatRate } from "@/lib/quotes/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { formatCurrency, formatVatRate } from "@/lib/quotes/calculations";

interface StepTotalsProps {
  totals: {
    subtotalHT: number;
    discountAmount: number;
    totalHT: number;
    vatBreakdown: Array<{ rate: VatRate; baseHT: number; vatAmount: number }>;
    totalTVA: number;
    totalTTC: number;
    depositAmount: number;
    remainingAmount: number;
  };
  discount: Discount;
  deposit: Deposit;
  travelCosts: number;
  validityDays: number;
  salesPerson: string;
  onDiscountChange: (discount: Discount) => void;
  onDepositChange: (deposit: Deposit) => void;
  onTravelCostsChange: (costs: number) => void;
  onValidityDaysChange: (days: number) => void;
  onSalesPersonChange: (person: string) => void;
}

export function StepTotals({
  totals,
  discount,
  deposit,
  travelCosts,
  validityDays,
  salesPerson,
  onDiscountChange,
  onDepositChange,
  onTravelCostsChange,
  onValidityDaysChange,
  onSalesPersonChange,
}: StepTotalsProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Totaux & Paiement</h2>
        <p className="text-white/70">Configurez les remises, acomptes et conditions de paiement</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Métadonnées */}
        <Card className="p-4 bg-black/20 border-white/10">
          <h3 className="text-lg font-semibold text-white mb-4">Métadonnées</h3>
          <div className="space-y-4">
            <div>
              <Label htmlFor="validityDays" className="text-white">Durée de validité (jours)</Label>
              <Input
                id="validityDays"
                type="number"
                min="1"
                value={validityDays}
                onChange={(e) => onValidityDaysChange(parseInt(e.target.value) || 30)}
                className="bg-black/20 border-white/10 text-white"
              />
            </div>
            <div>
              <Label htmlFor="salesPerson" className="text-white">Commercial / Responsable</Label>
              <Input
                id="salesPerson"
                value={salesPerson}
                onChange={(e) => onSalesPersonChange(e.target.value)}
                className="bg-black/20 border-white/10 text-white"
                placeholder="Nom du commercial"
              />
            </div>
          </div>
        </Card>

        {/* Frais de déplacement */}
        <Card className="p-4 bg-black/20 border-white/10">
          <h3 className="text-lg font-semibold text-white mb-4">Frais supplémentaires</h3>
          <div>
            <Label htmlFor="travelCosts" className="text-white">Frais de déplacement / Livraison (HT)</Label>
            <Input
              id="travelCosts"
              type="number"
              step="0.01"
              min="0"
              value={travelCosts}
              onChange={(e) => onTravelCostsChange(parseFloat(e.target.value) || 0)}
              className="bg-black/20 border-white/10 text-white"
            />
          </div>
        </Card>
      </div>

      {/* Remise */}
      <Card className="p-4 bg-black/20 border-white/10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Remise</h3>
          <div className="flex items-center gap-2">
            <Label htmlFor="discountEnabled" className="text-white">Activer</Label>
            <Switch
              id="discountEnabled"
              checked={discount.enabled}
              onCheckedChange={(checked) =>
                onDiscountChange({ ...discount, enabled: checked })
              }
            />
          </div>
        </div>
        {discount.enabled && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-white">Type</Label>
              <Select
                value={discount.type}
                onValueChange={(value: "percentage" | "amount") =>
                  onDiscountChange({ ...discount, type: value })
                }
              >
                <SelectTrigger className="bg-black/20 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-black/20 border-white/10">
                  <SelectItem value="percentage">Pourcentage</SelectItem>
                  <SelectItem value="amount">Montant</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-white">
                {discount.type === "percentage" ? "Pourcentage (%)" : "Montant (€)"}
              </Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={discount.value}
                onChange={(e) =>
                  onDiscountChange({ ...discount, value: parseFloat(e.target.value) || 0 })
                }
                className="bg-black/20 border-white/10 text-white"
              />
            </div>
            <div>
              <Label className="text-white">Montant remise</Label>
              <Input
                value={formatCurrency(totals.discountAmount)}
                disabled
                className="bg-black/30 border-white/10 text-white"
              />
            </div>
          </div>
        )}
      </Card>

      {/* Acompte */}
      <Card className="p-4 bg-black/20 border-white/10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Acompte</h3>
          <div className="flex items-center gap-2">
            <Label htmlFor="depositEnabled" className="text-white">Activer</Label>
            <Switch
              id="depositEnabled"
              checked={deposit.enabled}
              onCheckedChange={(checked) =>
                onDepositChange({ ...deposit, enabled: checked })
              }
            />
          </div>
        </div>
        {deposit.enabled && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-white">Type</Label>
              <Select
                value={deposit.type}
                onValueChange={(value: "percentage" | "amount") =>
                  onDepositChange({ ...deposit, type: value })
                }
              >
                <SelectTrigger className="bg-black/20 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-black/20 border-white/10">
                  <SelectItem value="percentage">Pourcentage</SelectItem>
                  <SelectItem value="amount">Montant</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-white">Base de calcul</Label>
              <Select
                value={deposit.base}
                onValueChange={(value: "HT" | "TTC") =>
                  onDepositChange({ ...deposit, base: value })
                }
              >
                <SelectTrigger className="bg-black/20 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-black/20 border-white/10">
                  <SelectItem value="HT">HT</SelectItem>
                  <SelectItem value="TTC">TTC</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-white">
                {deposit.type === "percentage" ? "Pourcentage (%)" : "Montant (€)"}
              </Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={deposit.value}
                onChange={(e) =>
                  onDepositChange({ ...deposit, value: parseFloat(e.target.value) || 0 })
                }
                className="bg-black/20 border-white/10 text-white"
              />
            </div>
          </div>
        )}
      </Card>

      {/* Totaux */}
      <Card className="p-4 bg-black/20 border-white/10">
        <h3 className="text-lg font-semibold text-white mb-4">Récapitulatif</h3>
        <div className="space-y-2">
          <div className="flex justify-between text-white">
            <span>Sous-total HT:</span>
            <span>{formatCurrency(totals.subtotalHT)}</span>
          </div>
          {totals.discountAmount > 0 && (
            <div className="flex justify-between text-white">
              <span>Remise:</span>
              <span className="text-red-400">-{formatCurrency(totals.discountAmount)}</span>
            </div>
          )}
          {travelCosts > 0 && (
            <div className="flex justify-between text-white">
              <span>Frais de déplacement:</span>
              <span>{formatCurrency(travelCosts)}</span>
            </div>
          )}
          <div className="flex justify-between text-white font-semibold">
            <span>Total HT:</span>
            <span>{formatCurrency(totals.totalHT)}</span>
          </div>
          {totals.vatBreakdown.map((vat) => (
            <div key={vat.rate} className="flex justify-between text-white/70 text-sm">
              <span>TVA {formatVatRate(vat.rate)}:</span>
              <span>{formatCurrency(vat.vatAmount)}</span>
            </div>
          ))}
          <div className="flex justify-between text-white">
            <span>Total TVA:</span>
            <span>{formatCurrency(totals.totalTVA)}</span>
          </div>
          <div className="flex justify-between text-white font-bold text-lg pt-2 border-t border-white/10">
            <span>TOTAL TTC:</span>
            <span className="text-violet-400">{formatCurrency(totals.totalTTC)}</span>
          </div>
          {deposit.enabled && (
            <>
              <div className="flex justify-between text-white pt-2">
                <span>Acompte à la commande:</span>
                <span>{formatCurrency(totals.depositAmount)}</span>
              </div>
              <div className="flex justify-between text-white font-semibold">
                <span>Solde à payer:</span>
                <span>{formatCurrency(totals.remainingAmount)}</span>
              </div>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
