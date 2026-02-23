"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, ArrowRight, Save, FileText, Building2, Users, Calendar, List, CreditCard, Scale } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Invoice, InvoiceLine, InvoiceLot, Company, InvoiceClient, ChantierInfo, Discount, generateId, generateInvoiceNumber, calculateDueDate, calculateRemainingAmount } from "@/lib/invoices/types";
import { calculateInvoiceTotals } from "@/lib/invoices/calculations";
import { DEFAULT_PAYMENT_TERMS, DEFAULT_LATE_PAYMENT_PENALTIES } from "@/lib/invoices/defaults";
import { useCompany } from "@/context/CompanyContext";
import { useAuth } from "@/context/AuthContext";
import { saveInvoice, loadInvoices } from "@/lib/storage/invoices";
import { loadQuote } from "@/lib/storage/quotes";
import { QuoteLine, QuoteLot, QuoteClient } from "@/lib/quotes/types";
import { StepCompany } from "./StepCompany";
import { StepClient } from "./StepClient";
import { StepInvoiceInfo } from "./StepInvoiceInfo";
import { StepLines } from "./StepLines";
import { StepPayment } from "./StepPayment";
import { StepLegal } from "./StepLegal";

interface InvoiceWizardProps {
  initialInvoice?: Invoice;
  quoteId?: string;
  onSave?: (invoice: Invoice) => void;
  onCancel?: () => void;
}

const STEPS = [
  { id: 1, name: "Entreprise", icon: Building2 },
  { id: 2, name: "Client & Chantier", icon: Users },
  { id: 3, name: "Informations Facture", icon: Calendar },
  { id: 4, name: "Lignes & Lots", icon: List },
  { id: 5, name: "Paiement & Acomptes", icon: CreditCard },
  { id: 6, name: "Mentions Légales", icon: Scale },
];

export function InvoiceWizard({ initialInvoice, quoteId, onSave, onCancel }: InvoiceWizardProps) {
  const { company } = useCompany();
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // États de la facture
  const initialCompany = initialInvoice?.company || (company ? { ...company } : null);
  const [invoiceCompany, setInvoiceCompany] = useState<Company | null>(initialCompany);
  const [client, setClient] = useState<InvoiceClient | null>(initialInvoice?.client || null);
  const [chantier, setChantier] = useState<ChantierInfo | null>(initialInvoice?.chantier || null);
  const [lots, setLots] = useState<InvoiceLot[]>(initialInvoice?.lots || []);
  const [lines, setLines] = useState<InvoiceLine[]>(initialInvoice?.lines || []);
  const [discount, setDiscount] = useState<Discount>(initialInvoice?.discount || { enabled: false, type: "percentage", value: 0 });
  const [travelCosts, setTravelCosts] = useState<number>(initialInvoice?.travelCosts || 0);
  const [depositsPaid, setDepositsPaid] = useState<number>(initialInvoice?.depositsPaid || 0);
  const [paymentTerms, setPaymentTerms] = useState<string>(initialInvoice?.paymentTerms || DEFAULT_PAYMENT_TERMS);
  const [paymentMethods, setPaymentMethods] = useState<string[]>(initialInvoice?.paymentMethods || []);
  const [latePaymentPenalties, setLatePaymentPenalties] = useState<string>(initialInvoice?.latePaymentPenalties || DEFAULT_LATE_PAYMENT_PENALTIES);
  const [recoveryFee, setRecoveryFee] = useState<number>(initialInvoice?.recoveryFee || 40);
  const [specialVatMention, setSpecialVatMention] = useState<string>(initialInvoice?.specialVatMention || "");
  const [notes, setNotes] = useState<string>(initialInvoice?.notes || "");

  // Informations facture
  const [issueDate, setIssueDate] = useState<string>(initialInvoice?.issueDate || new Date().toISOString().split("T")[0]);
  const [saleDate, setSaleDate] = useState<string | undefined>(initialInvoice?.saleDate);
  const [executionPeriodStart, setExecutionPeriodStart] = useState<string | undefined>(initialInvoice?.executionPeriodStart);
  const [executionPeriodEnd, setExecutionPeriodEnd] = useState<string | undefined>(initialInvoice?.executionPeriodEnd);
  const [paymentDelayDays, setPaymentDelayDays] = useState<number>(initialInvoice?.paymentDelayDays || 30);
  const [dueDate, setDueDate] = useState<string>(initialInvoice?.dueDate || calculateDueDate(issueDate, paymentDelayDays));
  const [selectedQuoteId, setSelectedQuoteId] = useState<string>(initialInvoice?.quoteId || quoteId || "");
  const [quoteNumber, setQuoteNumber] = useState<string | undefined>(initialInvoice?.quoteNumber);
  const [purchaseOrderNumber, setPurchaseOrderNumber] = useState<string | undefined>(initialInvoice?.purchaseOrderNumber);
  const [internalReference, setInternalReference] = useState<string | undefined>(initialInvoice?.internalReference);

  // Charger l'entreprise depuis le contexte si disponible
  useEffect(() => {
    if (company && !invoiceCompany) {
      setInvoiceCompany({ ...company });
    }
  }, [company, invoiceCompany]);

  // Calculer la date d'échéance quand nécessaire
  useEffect(() => {
    if (issueDate && paymentDelayDays) {
      const calculated = calculateDueDate(issueDate, paymentDelayDays);
      setDueDate(calculated);
    }
  }, [issueDate, paymentDelayDays]);

  // Pré-remplir depuis un devis sélectionné
  useEffect(() => {
    const loadQuoteData = async () => {
      if (selectedQuoteId && !initialInvoice) {
        try {
          const quote = await loadQuote(selectedQuoteId);
          if (quote) {
            // Pré-remplir le client
            const invoiceClient: InvoiceClient = {
              id: quote.client.id,
              type: quote.client.type,
              name: quote.client.name,
              contactName: quote.client.contactName,
              billingAddress: quote.client.billingAddress,
              billingPostalCode: quote.client.billingPostalCode,
              billingCity: quote.client.billingCity,
              siteAddress: quote.client.siteAddress,
              sitePostalCode: quote.client.sitePostalCode,
              siteCity: quote.client.siteCity,
              phone: quote.client.phone,
              email: quote.client.email,
              vatNumber: quote.client.vatNumber,
            };
            setClient(invoiceClient);

            // Pré-remplir le chantier
            setChantier(quote.chantier);

            // Pré-remplir les lots
            const invoiceLots: InvoiceLot[] = quote.lots.map(lot => ({
              id: lot.id,
              name: lot.name,
              description: lot.description,
              order: lot.order,
            }));
            setLots(invoiceLots);

            // Pré-remplir les lignes
            const invoiceLines: InvoiceLine[] = quote.lines.map(line => ({
              id: line.id,
              lotId: line.lotId,
              lotName: line.lotName,
              description: line.description,
              quantity: line.quantity,
              unit: line.unit,
              unitPriceHT: line.unitPriceHT,
              vatRate: line.vatRate,
              totalHT: line.totalHT,
              totalTVA: line.totalTVA,
              totalTTC: line.totalTTC,
              reference: line.reference,
              brand: line.brand,
              notes: line.notes,
              order: line.order,
            }));
            setLines(invoiceLines);

            // Pré-remplir la remise
            if (quote.discount) {
              setDiscount(quote.discount);
            }

            // Pré-remplir les frais de déplacement
            if (quote.travelCosts) {
              setTravelCosts(quote.travelCosts);
            }

            // Pré-remplir le numéro de devis
            setQuoteNumber(quote.quoteNumber);

            toast({
              title: "Devis chargé",
              description: `Les données du devis ${quote.quoteNumber} ont été pré-remplies`,
            });
          }
        } catch (error) {
          console.error("Erreur lors du chargement du devis:", error);
        }
      }
    };

    loadQuoteData();
  }, [selectedQuoteId, initialInvoice, toast]);

  // Calculs automatiques
  const totals = useMemo(() => {
    return calculateInvoiceTotals(lines, discount, travelCosts, depositsPaid);
  }, [lines, discount, travelCosts, depositsPaid]);

  // Navigation
  const canGoNext = () => {
    switch (currentStep) {
      case 1:
        return invoiceCompany !== null;
      case 2:
        return client !== null && chantier !== null;
      case 3:
        return issueDate && dueDate;
      case 4:
        return lines.length > 0;
      case 5:
        return true;
      case 6:
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (currentStep < 6 && canGoNext()) {
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
    if (!user?.id) {
      toast({
        title: "Erreur",
        description: "Vous devez être connecté pour sauvegarder une facture",
        variant: "destructive",
      });
      return;
    }

    // Validation SIRET et RCS pour factures
    if (!invoiceCompany || !invoiceCompany.name || !invoiceCompany.siret || !invoiceCompany.address) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir toutes les informations obligatoires de l'entreprise",
        variant: "destructive",
      });
      return;
    }

    if (!invoiceCompany.siret || invoiceCompany.siret.length !== 14) {
      toast({
        title: "Champ obligatoire manquant",
        description: "Le SIRET (14 chiffres) est obligatoire sur les factures",
        variant: "destructive",
      });
      return;
    }

    if (!invoiceCompany.rcsCity || invoiceCompany.rcsCity.trim() === "") {
      toast({
        title: "Champ obligatoire manquant",
        description: "La ville RCS est obligatoire sur les factures B2B",
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

    if (!issueDate || !dueDate) {
      toast({
        title: "Erreur",
        description: "Veuillez renseigner les dates obligatoires",
        variant: "destructive",
      });
      return;
    }

    // Validation date de prestation ou période d'exécution
    if (!saleDate && (!executionPeriodStart || !executionPeriodEnd)) {
      toast({
        title: "Champ obligatoire manquant",
        description: "La date de prestation ou la période d'exécution est obligatoire",
        variant: "destructive",
      });
      return;
    }

    // Validation conditions de paiement - utiliser la valeur par défaut si vide
    const paymentTermsToCheck = paymentTerms || DEFAULT_PAYMENT_TERMS;
    if (!paymentTermsToCheck.trim()) {
      toast({
        title: "Champ obligatoire manquant",
        description: "Les conditions de paiement sont obligatoires",
        variant: "destructive",
      });
      return;
    }

    // Validation pénalités de retard - utiliser la valeur par défaut si vide
    const latePaymentPenaltiesToCheck = latePaymentPenalties || DEFAULT_LATE_PAYMENT_PENALTIES;
    if (!latePaymentPenaltiesToCheck.trim()) {
      toast({
        title: "Champ obligatoire manquant",
        description: "Les pénalités de retard sont obligatoires en B2B",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      // Générer le numéro de facture si nécessaire
      let invoiceNumber = initialInvoice?.invoiceNumber;
      if (!invoiceNumber) {
        const existingInvoices = await loadInvoices();
        invoiceNumber = generateInvoiceNumber(existingInvoices);
      }

      const companyToSave: Company = { ...invoiceCompany };
      
      const invoiceData: Invoice = {
        id: initialInvoice?.id || generateId(),
        userId: user.id,
        invoiceNumber,
        status,
        issueDate,
        saleDate,
        executionPeriodStart,
        executionPeriodEnd,
        dueDate,
        paymentDelayDays,
        quoteId: selectedQuoteId || undefined,
        quoteNumber,
        purchaseOrderNumber,
        internalReference,
        company: companyToSave,
        client,
        chantier,
        lots,
        lines,
        discount,
        travelCosts,
        depositsPaid,
        paymentTerms: paymentTermsToCheck,
        paymentMethods,
        latePaymentPenalties: latePaymentPenaltiesToCheck,
        recoveryFee,
        specialVatMention,
        notes,
        ...totals,
        createdAt: initialInvoice?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const savedInvoice = await saveInvoice(invoiceData);
      
      toast({
        title: status === "draft" ? "Brouillon enregistré" : "Facture enregistrée",
        description: "La facture a été sauvegardée avec succès",
      });

      if (onSave) {
        onSave(savedInvoice);
      }
    } catch (error: any) {
      console.error("[InvoiceWizard] Save error:", error);
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de la sauvegarde",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Objet invoice partiel pour les étapes
  const invoicePartial: Partial<Invoice> = {
    issueDate,
    saleDate,
    executionPeriodStart,
    executionPeriodEnd,
    dueDate,
    paymentDelayDays,
    quoteId: selectedQuoteId || undefined,
    quoteNumber,
    purchaseOrderNumber,
    internalReference,
    depositsPaid,
    remainingAmount: totals.remainingAmount,
    paymentTerms,
    paymentMethods,
    latePaymentPenalties,
    recoveryFee,
    specialVatMention,
  };
  // #region agent log
  if (currentStep === 5) {
    fetch('http://127.0.0.1:7245/ingest/92008ec0-4865-46b1-a863-69afada2c59a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'InvoiceWizard.tsx:386',message:'invoicePartial depositsPaid value',data:{depositsPaid,invoicePartialDepositsPaid:invoicePartial.depositsPaid,totalTTC:totals.totalTTC},timestamp:Date.now(),runId:'debug1',hypothesisId:'E'})}).catch(()=>{});
  }
  // #endregion

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
            company={invoiceCompany}
            onCompanyChange={setInvoiceCompany}
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
          <StepInvoiceInfo
            invoice={{ ...invoicePartial, quoteId: selectedQuoteId }}
            onInvoiceChange={(updates) => {
              if (updates.issueDate) setIssueDate(updates.issueDate);
              if (updates.saleDate !== undefined) setSaleDate(updates.saleDate);
              if (updates.executionPeriodStart !== undefined) setExecutionPeriodStart(updates.executionPeriodStart);
              if (updates.executionPeriodEnd !== undefined) setExecutionPeriodEnd(updates.executionPeriodEnd);
              if (updates.paymentDelayDays !== undefined) setPaymentDelayDays(updates.paymentDelayDays);
              if (updates.dueDate) setDueDate(updates.dueDate);
              if (updates.quoteId !== undefined) {
                setSelectedQuoteId(updates.quoteId || "");
              }
              if (updates.quoteNumber !== undefined) setQuoteNumber(updates.quoteNumber);
              if (updates.purchaseOrderNumber !== undefined) setPurchaseOrderNumber(updates.purchaseOrderNumber);
              if (updates.internalReference !== undefined) setInternalReference(updates.internalReference);
            }}
          />
        )}
        {currentStep === 4 && (
          <StepLines
            lots={lots}
            lines={lines}
            onLotsChange={setLots}
            onLinesChange={setLines}
          />
        )}
        {currentStep === 5 && (
          <StepPayment
            invoice={invoicePartial}
            totalTTC={totals.totalTTC}
            onInvoiceChange={(updates) => {
              // #region agent log
              fetch('http://127.0.0.1:7245/ingest/92008ec0-4865-46b1-a863-69afada2c59a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'InvoiceWizard.tsx:468',message:'StepPayment onInvoiceChange',data:{updates,currentDepositsPaid:depositsPaid,hasDepositsPaid:updates.depositsPaid!==undefined},timestamp:Date.now(),runId:'debug1',hypothesisId:'E,F'})}).catch(()=>{});
              // #endregion
              if (updates.depositsPaid !== undefined) {
                // #region agent log
                fetch('http://127.0.0.1:7245/ingest/92008ec0-4865-46b1-a863-69afada2c59a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'InvoiceWizard.tsx:470',message:'Setting depositsPaid',data:{newValue:updates.depositsPaid,oldValue:depositsPaid},timestamp:Date.now(),runId:'debug1',hypothesisId:'F'})}).catch(()=>{});
                // #endregion
                setDepositsPaid(updates.depositsPaid);
              }
              if (updates.remainingAmount !== undefined) {
                // Calculé automatiquement
              }
              if (updates.paymentTerms !== undefined) setPaymentTerms(updates.paymentTerms || DEFAULT_PAYMENT_TERMS);
              if (updates.paymentMethods !== undefined) setPaymentMethods(updates.paymentMethods || []);
            }}
          />
        )}
        {currentStep === 6 && (
          <StepLegal
            invoice={invoicePartial}
            onInvoiceChange={(updates) => {
              if (updates.latePaymentPenalties !== undefined) setLatePaymentPenalties(updates.latePaymentPenalties || DEFAULT_LATE_PAYMENT_PENALTIES);
              if (updates.recoveryFee !== undefined) setRecoveryFee(updates.recoveryFee);
              if (updates.specialVatMention !== undefined) setSpecialVatMention(updates.specialVatMention || "");
            }}
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
          {currentStep === 6 ? (
            <Button
              onClick={() => handleSave("sent")}
              disabled={saving || !canGoNext()}
              className="bg-violet-600 hover:bg-violet-700"
            >
              <FileText className="h-4 w-4 mr-2" />
              Finaliser la facture
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
