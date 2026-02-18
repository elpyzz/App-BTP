"use client";

import { InvoiceLine, InvoiceLot, generateId, UnitEnum, VatRateEnum } from "@/lib/invoices/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { calculateLineTotal } from "@/lib/invoices/calculations";
import { UNIT_LABELS, VAT_RATES } from "@/lib/quotes/defaults";
import { useState } from "react";

interface StepLinesProps {
  lots: InvoiceLot[];
  lines: InvoiceLine[];
  onLotsChange: (lots: InvoiceLot[]) => void;
  onLinesChange: (lines: InvoiceLine[]) => void;
}

export function StepLines({ lots, lines, onLotsChange, onLinesChange }: StepLinesProps) {
  const [showLots, setShowLots] = useState(lots.length > 0);

  const addLot = () => {
    const newLot: InvoiceLot = {
      id: generateId(),
      name: `Lot ${lots.length + 1}`,
      order: lots.length,
    };
    onLotsChange([...lots, newLot]);
    setShowLots(true);
  };

  const removeLot = (lotId: string) => {
    onLotsChange(lots.filter(l => l.id !== lotId));
    onLinesChange(lines.map(line => 
      line.lotId === lotId ? { ...line, lotId: undefined, lotName: undefined } : line
    ));
  };

  const addLine = (lotId?: string) => {
    const newLine: InvoiceLine = {
      id: generateId(),
      lotId,
      lotName: lotId ? lots.find(l => l.id === lotId)?.name : undefined,
      description: "",
      quantity: 1,
      unit: "unite",
      unitPriceHT: 0,
      vatRate: "20",
      totalHT: 0,
      totalTVA: 0,
      totalTTC: 0,
      order: lines.length,
    };
    onLinesChange([...lines, newLine]);
  };

  const removeLine = (lineId: string) => {
    onLinesChange(lines.filter(l => l.id !== lineId));
  };

  const updateLine = (lineId: string, field: keyof InvoiceLine, value: any) => {
    const updatedLines = lines.map(line => {
      if (line.id === lineId) {
        const updated = { ...line, [field]: value };
        if (field === "quantity" || field === "unitPriceHT" || field === "vatRate") {
          const totals = calculateLineTotal(updated);
          return { ...updated, ...totals };
        }
        return updated;
      }
      return line;
    });
    onLinesChange(updatedLines);
  };

  const assignToLot = (lineId: string, lotId: string | undefined) => {
    updateLine(lineId, "lotId", lotId);
    updateLine(lineId, "lotName", lotId ? lots.find(l => l.id === lotId)?.name : undefined);
  };

  const linesWithoutLot = lines.filter(l => !l.lotId);
  const linesByLot = lots.map(lot => ({
    lot,
    lines: lines.filter(l => l.lotId === lot.id),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Lignes & Lots</h2>
          <p className="text-white/70">Ajoutez les prestations de votre facture</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowLots(!showLots)}
            className="text-white border-white/20"
          >
            {showLots ? "Masquer lots" : "Afficher lots"}
          </Button>
          {showLots && (
            <Button
              variant="outline"
              onClick={addLot}
              className="text-white border-white/20"
            >
              <Plus className="h-4 w-4 mr-2" />
              Ajouter lot
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => addLine()}
            className="text-white border-white/20"
          >
            <Plus className="h-4 w-4 mr-2" />
            Ajouter ligne
          </Button>
        </div>
      </div>

      {/* Lots */}
      {showLots && lots.length > 0 && (
        <div className="space-y-4">
          {lots.map((lot) => (
            <div key={lot.id} className="border border-white/20 rounded-lg p-4 bg-black/10">
              <div className="flex items-center justify-between mb-4">
                <Input
                  value={lot.name}
                  onChange={(e) => {
                    const updated = lots.map(l => 
                      l.id === lot.id ? { ...l, name: e.target.value } : l
                    );
                    onLotsChange(updated);
                    onLinesChange(lines.map(line =>
                      line.lotId === lot.id ? { ...line, lotName: e.target.value } : line
                    ));
                  }}
                  className="bg-black/20 border-white/10 text-white font-semibold"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => removeLot(lot.id)}
                  className="text-red-400 border-red-400/20"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-2">
                {linesByLot.find(l => l.lot.id === lot.id)?.lines.map((line) => (
                  <LineRow
                    key={line.id}
                    line={line}
                    onUpdate={(field, value) => updateLine(line.id, field, value)}
                    onRemove={() => removeLine(line.id)}
                  />
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addLine(lot.id)}
                  className="w-full text-white border-white/20"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter ligne au lot
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lignes sans lot */}
      {linesWithoutLot.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-white">Lignes sans lot</h3>
          {linesWithoutLot.map((line) => (
            <LineRow
              key={line.id}
              line={line}
              lots={lots}
              onUpdate={(field, value) => updateLine(line.id, field, value)}
              onRemove={() => removeLine(line.id)}
              onAssignToLot={(lotId) => assignToLot(line.id, lotId)}
            />
          ))}
        </div>
      )}

      {lines.length === 0 && (
        <div className="text-center py-12 text-white/50">
          <p>Aucune ligne de facture. Cliquez sur "Ajouter ligne" pour commencer.</p>
        </div>
      )}
    </div>
  );
}

function LineRow({
  line,
  lots,
  onUpdate,
  onRemove,
  onAssignToLot,
}: {
  line: InvoiceLine;
  lots?: InvoiceLot[];
  onUpdate: (field: keyof InvoiceLine, value: any) => void;
  onRemove: () => void;
  onAssignToLot?: (lotId: string | undefined) => void;
}) {
  return (
    <div className="grid grid-cols-12 gap-2 items-end p-3 bg-black/20 rounded-lg border border-white/10">
      <div className="col-span-12 md:col-span-4">
        <Label className="text-white text-xs">Description</Label>
        <Input
          value={line.description}
          onChange={(e) => onUpdate("description", e.target.value)}
          className="bg-black/20 border-white/10 text-white"
          placeholder="Description de la prestation"
        />
      </div>
      <div className="col-span-4 md:col-span-1">
        <Label className="text-white text-xs">Qté</Label>
        <Input
          type="number"
          step="0.01"
          min="0"
          value={line.quantity}
          onChange={(e) => onUpdate("quantity", parseFloat(e.target.value) || 0)}
          className="bg-black/20 border-white/10 text-white"
        />
      </div>
      <div className="col-span-4 md:col-span-1">
        <Label className="text-white text-xs">Unité</Label>
        <Select value={line.unit} onValueChange={(v) => onUpdate("unit", v)}>
          <SelectTrigger className="bg-black/20 border-white/10 text-white text-xs h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-black/20 border-white/10">
            {Object.entries(UNIT_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="col-span-4 md:col-span-2">
        <Label className="text-white text-xs">PU HT</Label>
        <Input
          type="number"
          step="0.01"
          min="0"
          value={line.unitPriceHT}
          onChange={(e) => onUpdate("unitPriceHT", parseFloat(e.target.value) || 0)}
          className="bg-black/20 border-white/10 text-white"
        />
      </div>
      <div className="col-span-4 md:col-span-1">
        <Label className="text-white text-xs">TVA</Label>
        <Select value={line.vatRate} onValueChange={(v) => onUpdate("vatRate", v)}>
          <SelectTrigger className="bg-black/20 border-white/10 text-white text-xs h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-black/20 border-white/10">
            {VAT_RATES.map((rate) => (
              <SelectItem key={rate.value} value={rate.value}>
                {rate.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="col-span-4 md:col-span-2">
        <Label className="text-white text-xs">Total HT</Label>
        <Input
          value={line.totalHT.toFixed(2)}
          disabled
          className="bg-black/30 border-white/10 text-white"
        />
      </div>
      <div className="col-span-4 md:col-span-1 flex gap-1">
        {lots && onAssignToLot && (
          <Select
            value={line.lotId || "__none__"}
            onValueChange={(v) => onAssignToLot(v === "__none__" ? undefined : v)}
          >
            <SelectTrigger className="bg-black/20 border-white/10 text-white text-xs h-9 w-20">
              <SelectValue placeholder="Lot" />
            </SelectTrigger>
            <SelectContent className="bg-black/20 border-white/10">
              <SelectItem value="__none__">Aucun</SelectItem>
              {lots.map((lot) => (
                <SelectItem key={lot.id} value={lot.id}>
                  {lot.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={onRemove}
          className="text-red-400 border-red-400/20"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
