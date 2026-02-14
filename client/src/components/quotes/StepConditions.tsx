"use client";

import { QuoteConditions, Signature } from "@/lib/quotes/types";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { DEFAULT_CONDITIONS } from "@/lib/quotes/defaults";
import { useState, useRef, useEffect } from "react";

interface StepConditionsProps {
  conditions: QuoteConditions;
  signature: Signature;
  notes: string;
  onConditionsChange: (conditions: QuoteConditions) => void;
  onSignatureChange: (signature: Signature) => void;
  onNotesChange: (notes: string) => void;
}

export function StepConditions({
  conditions,
  signature,
  notes,
  onConditionsChange,
  onSignatureChange,
  onNotesChange,
}: StepConditionsProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const handleConditionChange = (field: keyof QuoteConditions, value: string) => {
    onConditionsChange({ ...conditions, [field]: value });
  };

  // Initialiser le canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    // Configuration du style de dessin
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    
    // Charger la signature existante si disponible
    if (signature.signatureData) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
      };
      img.src = signature.signatureData;
    }
  }, [signature.signatureData]);

  const handleSignatureStart = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const handleSignatureMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const handleSignatureEnd = () => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const signatureData = canvas.toDataURL();
    onSignatureChange({ ...signature, signatureData });
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    onSignatureChange({ ...signature, signatureData: undefined });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Conditions & Signature</h2>
        <p className="text-white/70">Définissez les conditions légales et la signature</p>
      </div>

      {/* Conditions */}
      <div className="space-y-4">
        <Card className="p-4 bg-black/20 border-white/10">
          <h3 className="text-lg font-semibold text-white mb-4">Conditions légales</h3>
          <div className="space-y-4">
            <div>
              <Label htmlFor="executionTerms" className="text-white">Délais d'exécution</Label>
              <Textarea
                id="executionTerms"
                value={conditions.executionTerms || DEFAULT_CONDITIONS.executionTerms}
                onChange={(e) => handleConditionChange("executionTerms", e.target.value)}
                className="bg-black/20 border-white/10 text-white"
                rows={3}
                placeholder={DEFAULT_CONDITIONS.executionTerms}
              />
            </div>
            <div>
              <Label htmlFor="paymentTerms" className="text-white">Conditions de paiement</Label>
              <Textarea
                id="paymentTerms"
                value={conditions.paymentTerms || DEFAULT_CONDITIONS.paymentTerms}
                onChange={(e) => handleConditionChange("paymentTerms", e.target.value)}
                className="bg-black/20 border-white/10 text-white"
                rows={3}
                placeholder={DEFAULT_CONDITIONS.paymentTerms}
              />
            </div>
            <div>
              <Label htmlFor="depositTerms" className="text-white">Modalités d'acompte</Label>
              <Textarea
                id="depositTerms"
                value={conditions.depositTerms || DEFAULT_CONDITIONS.depositTerms}
                onChange={(e) => handleConditionChange("depositTerms", e.target.value)}
                className="bg-black/20 border-white/10 text-white"
                rows={2}
                placeholder={DEFAULT_CONDITIONS.depositTerms}
              />
            </div>
            <div>
              <Label htmlFor="warranties" className="text-white">Garanties</Label>
              <Textarea
                id="warranties"
                value={conditions.warranties || DEFAULT_CONDITIONS.warranties}
                onChange={(e) => handleConditionChange("warranties", e.target.value)}
                className="bg-black/20 border-white/10 text-white"
                rows={3}
                placeholder={DEFAULT_CONDITIONS.warranties}
              />
            </div>
            <div>
              <Label htmlFor="unforeseenClause" className="text-white">Réserve sur imprévus</Label>
              <Textarea
                id="unforeseenClause"
                value={conditions.unforeseenClause || DEFAULT_CONDITIONS.unforeseenClause}
                onChange={(e) => handleConditionChange("unforeseenClause", e.target.value)}
                className="bg-black/20 border-white/10 text-white"
                rows={2}
                placeholder={DEFAULT_CONDITIONS.unforeseenClause}
              />
            </div>
            <div>
              <Label htmlFor="cancellationTerms" className="text-white">Conditions d'annulation</Label>
              <Textarea
                id="cancellationTerms"
                value={conditions.cancellationTerms || DEFAULT_CONDITIONS.cancellationTerms}
                onChange={(e) => handleConditionChange("cancellationTerms", e.target.value)}
                className="bg-black/20 border-white/10 text-white"
                rows={2}
                placeholder={DEFAULT_CONDITIONS.cancellationTerms}
              />
            </div>
            <div>
              <Label htmlFor="latePaymentPenalties" className="text-white">Pénalités de retard</Label>
              <Textarea
                id="latePaymentPenalties"
                value={conditions.latePaymentPenalties || DEFAULT_CONDITIONS.latePaymentPenalties}
                onChange={(e) => handleConditionChange("latePaymentPenalties", e.target.value)}
                className="bg-black/20 border-white/10 text-white"
                rows={3}
                placeholder={DEFAULT_CONDITIONS.latePaymentPenalties}
              />
            </div>
          </div>
        </Card>

        {/* Signature */}
        <Card className="p-4 bg-black/20 border-white/10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Signature</h3>
            <div className="flex items-center gap-2">
              <Label htmlFor="signatureEnabled" className="text-white">Activer</Label>
              <Switch
                id="signatureEnabled"
                checked={signature.enabled}
                onCheckedChange={(checked) =>
                  onSignatureChange({ ...signature, enabled: checked })
                }
              />
            </div>
          </div>
          {signature.enabled && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="acceptanceText" className="text-white">Texte d'acceptation</Label>
                <Input
                  id="acceptanceText"
                  value={signature.acceptanceText}
                  onChange={(e) =>
                    onSignatureChange({ ...signature, acceptanceText: e.target.value })
                  }
                  className="bg-black/20 border-white/10 text-white"
                  placeholder="Bon pour accord"
                />
              </div>
              <div>
                <Label className="text-white">Zone de signature</Label>
                <div className="border border-white/20 rounded-lg p-4 bg-white">
                  <canvas
                    ref={canvasRef}
                    width={600}
                    height={200}
                    className="border border-gray-300 rounded cursor-crosshair"
                    onMouseDown={handleSignatureStart}
                    onMouseMove={handleSignatureMove}
                    onMouseUp={handleSignatureEnd}
                    onMouseLeave={handleSignatureEnd}
                  />
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={clearSignature}
                      className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                    >
                      Effacer
                    </button>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="signerName" className="text-white">Nom du signataire</Label>
                  <Input
                    id="signerName"
                    value={signature.signerName || ""}
                    onChange={(e) =>
                      onSignatureChange({ ...signature, signerName: e.target.value })
                    }
                    className="bg-black/20 border-white/10 text-white"
                  />
                </div>
                <div>
                  <Label htmlFor="signedPlace" className="text-white">Lieu de signature</Label>
                  <Input
                    id="signedPlace"
                    value={signature.signedPlace || ""}
                    onChange={(e) =>
                      onSignatureChange({ ...signature, signedPlace: e.target.value })
                    }
                    className="bg-black/20 border-white/10 text-white"
                  />
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Notes internes */}
        <Card className="p-4 bg-black/20 border-white/10">
          <h3 className="text-lg font-semibold text-white mb-4">Notes internes</h3>
          <Textarea
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            className="bg-black/20 border-white/10 text-white"
            rows={4}
            placeholder="Notes internes (non visibles sur le devis)"
          />
        </Card>
      </div>
    </div>
  );
}
