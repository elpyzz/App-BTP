"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, ArrowRight, Save, FileText, Building2, Users, List, Calculator, FileCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Quote, QuoteLine, QuoteLot, Company, QuoteClient, ChantierInfo, Discount, Deposit, QuoteConditions, Signature, generateId, generateQuoteNumber, calculateExpirationDate } from "@/lib/quotes/types";
import { calculateQuoteTotals, calculateLineTotal } from "@/lib/quotes/calculations";
import { DEFAULT_CONDITIONS } from "@/lib/quotes/defaults";
import { useCompany } from "@/context/CompanyContext";
import { saveQuote } from "@/lib/storage/quotes";
import { StepCompany } from "./StepCompany";
import { StepClient } from "./StepClient";
import { StepLines } from "./StepLines";
import { StepTotals } from "./StepTotals";
import { StepConditions } from "./StepConditions";

interface QuoteWizardProps {
  initialQuote?: Quote;
  dossierId?: string;
  onSave?: (quote: Quote) => void;
  onCancel?: () => void;
}

const STEPS = [
  { id: 1, name: "Entreprise", icon: Building2 },
  { id: 2, name: "Client & Chantier", icon: Users },
  { id: 3, name: "Lignes & Lots", icon: List },
  { id: 4, name: "Totaux & Paiement", icon: Calculator },
  { id: 5, name: "Conditions", icon: FileCheck },
];

export function QuoteWizard({ initialQuote, dossierId, onSave, onCancel }: QuoteWizardProps) {
  const { company } = useCompany();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // États du devis
  // Créer une copie de company pour éviter les mutations
  const initialCompany = initialQuote?.company || (company ? { ...company } : null);
  const [quoteCompany, setQuoteCompany] = useState<Company | null>(initialCompany);
  const [client, setClient] = useState<QuoteClient | null>(initialQuote?.client || null);
  const [chantier, setChantier] = useState<ChantierInfo | null>(initialQuote?.chantier || null);
  const [lots, setLots] = useState<QuoteLot[]>(initialQuote?.lots || []);
  const [lines, setLines] = useState<QuoteLine[]>(initialQuote?.lines || []);
  const [discount, setDiscount] = useState<Discount>(initialQuote?.discount || { enabled: false, type: "percentage", value: 0 });
  const [deposit, setDeposit] = useState<Deposit>(initialQuote?.deposit || { enabled: false, type: "percentage", value: 30, base: "TTC" });
  const [travelCosts, setTravelCosts] = useState<number>(initialQuote?.travelCosts || 0);
  const [conditions, setConditions] = useState<QuoteConditions>(initialQuote?.conditions || DEFAULT_CONDITIONS);
  const [signature, setSignature] = useState<Signature>(initialQuote?.signature || { enabled: false, acceptanceText: "Bon pour accord" });
  const [validityDays, setValidityDays] = useState(initialQuote?.validityDays || 30);
  const [salesPerson, setSalesPerson] = useState(initialQuote?.salesPerson || "");
  const [notes, setNotes] = useState(initialQuote?.notes || "");

  // Charger l'entreprise depuis le contexte si disponible (créer une copie)
  useEffect(() => {
    if (company && !quoteCompany) {
      setQuoteCompany({ ...company });
    }
  }, [company, quoteCompany]);

  // Calculs automatiques
  const totals = useMemo(() => {
    return calculateQuoteTotals(lines, discount, deposit, travelCosts);
  }, [lines, discount, deposit, travelCosts]);

  // Navigation
  const canGoNext = () => {
    switch (currentStep) {
      case 1:
        return quoteCompany !== null;
      case 2:
        return client !== null && chantier !== null;
      case 3:
        return lines.length > 0;
      case 4:
        return true;
      case 5:
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (currentStep < 5 && canGoNext()) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Sauvegarde
  const handleSave = async (status: "draft" | "sent" = "draft") => {
    // Validation stricte de l'entreprise
    if (!quoteCompany || !quoteCompany.name || !quoteCompany.siret || !quoteCompany.address) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir toutes les informations obligatoires de l'entreprise (nom, SIRET, adresse)",
        variant: "destructive",
      });
      return;
    }

    if (!client || !chantier || lines.length === 0) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs obligatoires",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const issueDate = new Date().toISOString().split("T")[0];
      const expirationDate = calculateExpirationDate(issueDate, validityDays);
      
      // Créer une copie complète de quoteCompany pour éviter les mutations
      const companyToSave: Company = { ...quoteCompany };
      
      const quoteData: Quote = {
        id: initialQuote?.id || generateId(),
        quoteNumber: initialQuote?.quoteNumber || generateQuoteNumber([]),
        status,
        issueDate,
        validityDays,
        expirationDate,
        dossierId,
        salesPerson,
        company: companyToSave,
        client,
        chantier,
        lots,
        lines,
        discount,
        deposit,
        travelCosts,
        conditions,
        signature,
        notes,
        ...totals,
        createdAt: initialQuote?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const savedQuote = await saveQuote(quoteData);
      
      toast({
        title: status === "draft" ? "Brouillon enregistré" : "Devis enregistré",
        description: "Le devis a été sauvegardé avec succès",
      });

      if (onSave) {
        onSave(savedQuote);
      }
    } catch (error: any) {
      console.error("[QuoteWizard] Save error:", error);
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de la sauvegarde",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Progress bar */}
      <div className="flex items-center justify-between">
        {STEPS.map((step, index) => (
          <div
            key={step.id}
            className={`flex items-center ${index < STEPS.length - 1 ? "flex-1" : ""}`}
          >
            <button
              onClick={() => setCurrentStep(step.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                currentStep === step.id
                  ? "bg-violet-600 text-white"
                  : currentStep > step.id
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-100 text-gray-500"
              }`}
            >
              <step.icon className="h-5 w-5" />
              <span className="hidden md:inline">{step.name}</span>
            </button>
            {index < STEPS.length - 1 && (
              <div
                className={`flex-1 h-1 mx-2 ${
                  currentStep > step.id ? "bg-green-300" : "bg-gray-200"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Contenu de l'étape */}
      <Card className="p-6 bg-black/20 backdrop-blur-xl border border-white/10 text-white">
        {currentStep === 1 && (
          <StepCompany
            company={quoteCompany}
            onCompanyChange={setQuoteCompany}
          />
        )}
        {currentStep === 2 && (
          <StepClient
            client={client}
            chantier={chantier}
            onClientChange={setClient}
            onChantierChange={setChantier}
          />
        )}
        {currentStep === 3 && (
          <StepLines
            lots={lots}
            lines={lines}
            onLotsChange={setLots}
            onLinesChange={setLines}
          />
        )}
        {currentStep === 4 && (
          <StepTotals
            totals={totals}
            discount={discount}
            deposit={deposit}
            travelCosts={travelCosts}
            validityDays={validityDays}
            salesPerson={salesPerson}
            onDiscountChange={setDiscount}
            onDepositChange={setDeposit}
            onTravelCostsChange={setTravelCosts}
            onValidityDaysChange={setValidityDays}
            onSalesPersonChange={setSalesPerson}
          />
        )}
        {currentStep === 5 && (
          <StepConditions
            conditions={conditions}
            signature={signature}
            notes={notes}
            onConditionsChange={setConditions}
            onSignatureChange={setSignature}
            onNotesChange={setNotes}
          />
        )}
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <div>
          {onCancel && (
            <Button variant="outline" onClick={onCancel} disabled={saving}>
              Annuler
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 1}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Précédent
          </Button>
          <Button
            variant="outline"
            onClick={() => handleSave("draft")}
            disabled={saving}
          >
            <Save className="h-4 w-4 mr-2" />
            Enregistrer brouillon
          </Button>
          {currentStep === 5 ? (
            <Button
              onClick={() => handleSave("sent")}
              disabled={saving || !canGoNext()}
              className="bg-violet-600 hover:bg-violet-700"
            >
              <FileText className="h-4 w-4 mr-2" />
              Finaliser le devis
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              disabled={!canGoNext()}
              className="bg-violet-600 hover:bg-violet-700"
            >
              Suivant
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
