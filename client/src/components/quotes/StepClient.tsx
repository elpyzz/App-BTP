"use client";

import { QuoteClient, ChantierInfo } from "@/lib/quotes/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useChantiers } from "@/context/ChantiersContext";
import { useState } from "react";

interface StepClientProps {
  client: QuoteClient | null;
  chantier: ChantierInfo | null;
  onClientChange: (client: QuoteClient | null) => void;
  onChantierChange: (chantier: ChantierInfo | null) => void;
}

export function StepClient({ client, chantier, onClientChange, onChantierChange }: StepClientProps) {
  const { clients, chantiers } = useChantiers();
  const [selectedClientId, setSelectedClientId] = useState<string>("");

  const handleClientSelect = (clientId: string) => {
    const selected = clients.find(c => c.id === clientId);
    if (selected) {
      setSelectedClientId(clientId);
      onClientChange({
        id: selected.id,
        type: "particulier",
        name: selected.name,
        email: selected.email || "",
        phone: selected.phone || "",
        billingAddress: "",
        billingPostalCode: "",
        billingCity: "",
      });
    }
  };

  const handleClientChange = (field: keyof QuoteClient, value: any) => {
    if (!client) {
      onClientChange({
        type: "particulier",
        name: "",
        billingAddress: "",
        billingPostalCode: "",
        billingCity: "",
        [field]: value,
      });
    } else {
      onClientChange({ ...client, [field]: value });
    }
  };

  const handleChantierChange = (field: keyof ChantierInfo, value: any) => {
    if (!chantier) {
      onChantierChange({
        name: "",
        [field]: value,
      });
    } else {
      onChantierChange({ ...chantier, [field]: value });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Client & Chantier</h2>
        <p className="text-white/70">Sélectionnez ou créez un client et un chantier</p>
      </div>

      {/* Client */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white">Client</h3>
        
        {clients.length > 0 && (
          <div>
            <Label className="text-white">Sélectionner un client existant</Label>
            <Select value={selectedClientId} onValueChange={handleClientSelect}>
              <SelectTrigger className="bg-black/20 border-white/10 text-white">
                <SelectValue placeholder="Choisir un client" />
              </SelectTrigger>
              <SelectContent className="bg-black/20 border-white/10">
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Label htmlFor="clientName" className="text-white">
              Nom / Raison sociale <span className="text-red-400">*</span>
            </Label>
            <Input
              id="clientName"
              value={client?.name || ""}
              onChange={(e) => handleClientChange("name", e.target.value)}
              className="bg-black/20 border-white/10 text-white"
              placeholder="Nom du client"
            />
          </div>

          <div>
            <Label htmlFor="clientEmail" className="text-white">Email</Label>
            <Input
              id="clientEmail"
              type="email"
              value={client?.email || ""}
              onChange={(e) => handleClientChange("email", e.target.value)}
              className="bg-black/20 border-white/10 text-white"
              placeholder="client@email.com"
            />
          </div>

          <div>
            <Label htmlFor="clientPhone" className="text-white">Téléphone</Label>
            <Input
              id="clientPhone"
              value={client?.phone || ""}
              onChange={(e) => handleClientChange("phone", e.target.value)}
              className="bg-black/20 border-white/10 text-white"
              placeholder="+33 X XX XX XX XX"
            />
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="billingAddress" className="text-white">
              Adresse de facturation <span className="text-red-400">*</span>
            </Label>
            <Input
              id="billingAddress"
              value={client?.billingAddress || ""}
              onChange={(e) => handleClientChange("billingAddress", e.target.value)}
              className="bg-black/20 border-white/10 text-white"
              placeholder="Numéro et nom de rue"
            />
          </div>

          <div>
            <Label htmlFor="billingPostalCode" className="text-white">
              Code postal <span className="text-red-400">*</span>
            </Label>
            <Input
              id="billingPostalCode"
              value={client?.billingPostalCode || ""}
              onChange={(e) => handleClientChange("billingPostalCode", e.target.value)}
              className="bg-black/20 border-white/10 text-white"
              placeholder="75001"
              maxLength={5}
            />
          </div>

          <div>
            <Label htmlFor="billingCity" className="text-white">
              Ville <span className="text-red-400">*</span>
            </Label>
            <Input
              id="billingCity"
              value={client?.billingCity || ""}
              onChange={(e) => handleClientChange("billingCity", e.target.value)}
              className="bg-black/20 border-white/10 text-white"
              placeholder="Paris"
            />
          </div>
        </div>
      </div>

      {/* Chantier */}
      <div className="space-y-4 border-t border-white/10 pt-4">
        <h3 className="text-lg font-semibold text-white">Chantier</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Label htmlFor="chantierName" className="text-white">
              Intitulé du chantier <span className="text-red-400">*</span>
            </Label>
            <Input
              id="chantierName"
              value={chantier?.name || ""}
              onChange={(e) => handleChantierChange("name", e.target.value)}
              className="bg-black/20 border-white/10 text-white"
              placeholder="Ex: Rénovation salle de bain"
            />
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="chantierDescription" className="text-white">Description</Label>
            <Textarea
              id="chantierDescription"
              value={chantier?.description || ""}
              onChange={(e) => handleChantierChange("description", e.target.value)}
              className="bg-black/20 border-white/10 text-white"
              placeholder="Description courte du besoin"
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="chantierAddress" className="text-white">Adresse du chantier</Label>
            <Input
              id="chantierAddress"
              value={chantier?.address || ""}
              onChange={(e) => handleChantierChange("address", e.target.value)}
              className="bg-black/20 border-white/10 text-white"
              placeholder="Si différente de l'adresse de facturation"
            />
          </div>

          <div>
            <Label htmlFor="estimatedStartDate" className="text-white">Date de début estimée</Label>
            <Input
              id="estimatedStartDate"
              type="date"
              value={chantier?.estimatedStartDate || ""}
              onChange={(e) => handleChantierChange("estimatedStartDate", e.target.value)}
              className="bg-black/20 border-white/10 text-white"
            />
          </div>

          <div>
            <Label htmlFor="estimatedDuration" className="text-white">Durée estimée</Label>
            <Input
              id="estimatedDuration"
              value={chantier?.estimatedDuration || ""}
              onChange={(e) => handleChantierChange("estimatedDuration", e.target.value)}
              className="bg-black/20 border-white/10 text-white"
              placeholder="Ex: 3 semaines"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
