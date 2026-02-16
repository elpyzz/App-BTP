"use client";

import { Company } from "@/lib/quotes/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { LEGAL_FORMS } from "@/lib/quotes/defaults";
import { useCompany } from "@/context/CompanyContext";

interface StepCompanyProps {
  company: Company | null;
  onCompanyChange: (company: Company | null) => void;
}

export function StepCompany({ company, onCompanyChange }: StepCompanyProps) {
  const { company: contextCompany } = useCompany();

  // Toujours utiliser company des props en priorité, sinon contextCompany comme valeur d'affichage
  // Mais on doit toujours créer un nouvel objet pour éviter les mutations
  const currentCompany = company || (contextCompany ? { ...contextCompany } : null);

  const handleChange = (field: keyof Company, value: any) => {
    // Toujours créer un nouvel objet basé sur company (props) ou un objet vide
    // Ne jamais utiliser contextCompany directement pour les modifications
    const baseCompany = company || {
      name: "",
      siret: "",
      address: "",
      postalCode: "",
      city: "",
      phone: "",
      email: "",
    };
    
    const newCompany = { ...baseCompany, [field]: value };
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/92008ec0-4865-46b1-a863-69afada2c59a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'StepCompany.tsx:36',message:'handleChange - Modification entreprise',data:{field:field,value:value,baseCompanyName:baseCompany.name,newCompanyName:newCompany.name,newCompanyAddress:newCompany.address,newCompanyPhone:newCompany.phone,newCompanyEmail:newCompany.email},timestamp:Date.now(),runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    onCompanyChange(newCompany);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Informations Entreprise</h2>
        <p className="text-white/70">Renseignez les informations de votre entreprise</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <Label htmlFor="name" className="text-white">
            Raison sociale / Nom commercial <span className="text-red-400">*</span>
          </Label>
          <Input
            id="name"
            value={currentCompany?.name || ""}
            onChange={(e) => handleChange("name", e.target.value)}
            className="bg-black/20 border-white/10 text-white"
            placeholder="Ex: Aos Renov"
          />
        </div>

        <div>
          <Label htmlFor="legalForm" className="text-white">Forme juridique</Label>
          <Select
            value={currentCompany?.legalForm || ""}
            onValueChange={(value) => handleChange("legalForm", value)}
          >
            <SelectTrigger className="bg-black/20 border-white/10 text-white">
              <SelectValue placeholder="Sélectionner" />
            </SelectTrigger>
            <SelectContent className="bg-black/20 border-white/10">
              {LEGAL_FORMS.map((form) => (
                <SelectItem key={form.value} value={form.value}>
                  {form.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="siret" className="text-white">
            SIRET <span className="text-red-400">*</span>
          </Label>
          <Input
            id="siret"
            value={currentCompany?.siret || ""}
            onChange={(e) => handleChange("siret", e.target.value)}
            className="bg-black/20 border-white/10 text-white"
            placeholder="14 chiffres"
            maxLength={14}
          />
        </div>

        <div className="md:col-span-2">
          <Label htmlFor="address" className="text-white">
            Adresse <span className="text-red-400">*</span>
          </Label>
          <Input
            id="address"
            value={currentCompany?.address || ""}
            onChange={(e) => handleChange("address", e.target.value)}
            className="bg-black/20 border-white/10 text-white"
            placeholder="Numéro et nom de rue"
          />
        </div>

        <div>
          <Label htmlFor="postalCode" className="text-white">
            Code postal <span className="text-red-400">*</span>
          </Label>
          <Input
            id="postalCode"
            value={currentCompany?.postalCode || ""}
            onChange={(e) => handleChange("postalCode", e.target.value)}
            className="bg-black/20 border-white/10 text-white"
            placeholder="75001"
            maxLength={5}
          />
        </div>

        <div>
          <Label htmlFor="city" className="text-white">
            Ville <span className="text-red-400">*</span>
          </Label>
          <Input
            id="city"
            value={currentCompany?.city || ""}
            onChange={(e) => handleChange("city", e.target.value)}
            className="bg-black/20 border-white/10 text-white"
            placeholder="Paris"
          />
        </div>

        <div>
          <Label htmlFor="phone" className="text-white">
            Téléphone <span className="text-red-400">*</span>
          </Label>
          <Input
            id="phone"
            value={currentCompany?.phone || ""}
            onChange={(e) => handleChange("phone", e.target.value)}
            className="bg-black/20 border-white/10 text-white"
            placeholder="+33 X XX XX XX XX"
          />
        </div>

        <div>
          <Label htmlFor="email" className="text-white">
            Email <span className="text-red-400">*</span>
          </Label>
          <Input
            id="email"
            type="email"
            value={currentCompany?.email || ""}
            onChange={(e) => handleChange("email", e.target.value)}
            className="bg-black/20 border-white/10 text-white"
            placeholder="contact@entreprise.fr"
          />
        </div>

        <div>
          <Label htmlFor="vatNumber" className="text-white">N° TVA intracommunautaire</Label>
          <Input
            id="vatNumber"
            value={currentCompany?.vatNumber || ""}
            onChange={(e) => handleChange("vatNumber", e.target.value)}
            className="bg-black/20 border-white/10 text-white"
            placeholder="FR XX XXX XXX XXX"
          />
        </div>

        <div>
          <Label htmlFor="apeCode" className="text-white">Code APE/NAF</Label>
          <Input
            id="apeCode"
            value={currentCompany?.apeCode || ""}
            onChange={(e) => handleChange("apeCode", e.target.value)}
            className="bg-black/20 border-white/10 text-white"
            placeholder="Ex: 4332Z"
          />
        </div>

        <div>
          <Label htmlFor="website" className="text-white">Site web</Label>
          <Input
            id="website"
            value={currentCompany?.website || ""}
            onChange={(e) => handleChange("website", e.target.value)}
            className="bg-black/20 border-white/10 text-white"
            placeholder="https://www.entreprise.fr"
          />
        </div>
      </div>

      {/* Assurance décennale */}
      <div className="border-t border-white/10 pt-4">
        <h3 className="text-lg font-semibold text-white mb-4">Assurance Décennale</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="insuranceCompany" className="text-white">Assureur</Label>
            <Input
              id="insuranceCompany"
              value={currentCompany?.insuranceDecennale?.company || ""}
              onChange={(e) =>
                handleChange("insuranceDecennale", {
                  ...currentCompany?.insuranceDecennale,
                  company: e.target.value,
                  policyNumber: currentCompany?.insuranceDecennale?.policyNumber || "",
                  validUntil: currentCompany?.insuranceDecennale?.validUntil || "",
                })
              }
              className="bg-black/20 border-white/10 text-white"
            />
          </div>
          <div>
            <Label htmlFor="policyNumber" className="text-white">N° Police</Label>
            <Input
              id="policyNumber"
              value={currentCompany?.insuranceDecennale?.policyNumber || ""}
              onChange={(e) =>
                handleChange("insuranceDecennale", {
                  ...currentCompany?.insuranceDecennale,
                  company: currentCompany?.insuranceDecennale?.company || "",
                  policyNumber: e.target.value,
                  validUntil: currentCompany?.insuranceDecennale?.validUntil || "",
                })
              }
              className="bg-black/20 border-white/10 text-white"
            />
          </div>
          <div>
            <Label htmlFor="validUntil" className="text-white">Valide jusqu'au</Label>
            <Input
              id="validUntil"
              type="date"
              value={currentCompany?.insuranceDecennale?.validUntil || ""}
              onChange={(e) =>
                handleChange("insuranceDecennale", {
                  ...currentCompany?.insuranceDecennale,
                  company: currentCompany?.insuranceDecennale?.company || "",
                  policyNumber: currentCompany?.insuranceDecennale?.policyNumber || "",
                  validUntil: e.target.value,
                })
              }
              className="bg-black/20 border-white/10 text-white"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
