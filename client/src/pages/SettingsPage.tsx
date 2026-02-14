import { PageWrapper } from '@/components/PageWrapper';
import { useState, useEffect } from 'react';
import { useCompany } from '@/context/CompanyContext';
import { Company, CompanySchema } from '@/lib/quotes/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { LEGAL_FORMS } from '@/lib/quotes/defaults';
import { Building2, FileText, Shield, CreditCard, Package } from 'lucide-react';
import MaterialSettings from '@/components/MaterialSettings';

export default function SettingsPage() {
  const { company, setCompany, isLoading } = useCompany();
  const { toast } = useToast();
  const [formData, setFormData] = useState<Partial<Company>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (company) {
      setFormData(company);
    }
  }, [company]);

  const handleChange = (field: keyof Company, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Valider avec Zod
      const result = CompanySchema.safeParse(formData);
      if (!result.success) {
        toast({
          title: 'Erreur de validation',
          description: result.error.errors[0]?.message || 'Veuillez vérifier les champs obligatoires',
          variant: 'destructive',
        });
        return;
      }

      setCompany(result.data);
      toast({
        title: 'Informations enregistrées',
        description: 'Les informations de l\'entreprise ont été sauvegardées',
      });
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Erreur lors de la sauvegarde',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <PageWrapper>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center text-white">
            <p>Chargement...</p>
          </div>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <header className="bg-black/20 backdrop-blur-xl border-b border-white/10 px-6 py-4 rounded-tl-3xl ml-20 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <FileText className="h-6 w-6" />
              Paramètres
            </h1>
            <p className="text-sm text-white/70">Configurez les informations de votre entreprise</p>
          </div>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-violet-600 hover:bg-violet-700"
          >
            Enregistrer
          </Button>
        </div>
      </header>

      <main className="flex-1 p-6 ml-20">
        <Tabs defaultValue="materials" className="w-full">
          <TabsList className="bg-black/20 border-white/10 mb-6">
            <TabsTrigger value="materials" className="data-[state=active]:bg-violet-500/20">
              <Package className="h-4 w-4 mr-2" />
              Matériaux
            </TabsTrigger>
            <TabsTrigger value="company" className="data-[state=active]:bg-violet-500/20">
              <Building2 className="h-4 w-4 mr-2" />
              Entreprise
            </TabsTrigger>
            <TabsTrigger value="insurance" className="data-[state=active]:bg-violet-500/20">
              <Shield className="h-4 w-4 mr-2" />
              Assurances
            </TabsTrigger>
            <TabsTrigger value="payment" className="data-[state=active]:bg-violet-500/20">
              <CreditCard className="h-4 w-4 mr-2" />
              Paiement
            </TabsTrigger>
          </TabsList>

          <TabsContent value="materials">
            <MaterialSettings />
          </TabsContent>

          <TabsContent value="company">
            <Card className="bg-black/20 backdrop-blur-xl border border-white/10 text-white">
              <CardHeader>
                <CardTitle className="text-white">Informations Entreprise</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Label htmlFor="name" className="text-white">
                      Raison sociale / Nom commercial <span className="text-red-400">*</span>
                    </Label>
                    <Input
                      id="name"
                      value={formData.name || ''}
                      onChange={(e) => handleChange('name', e.target.value)}
                      className="bg-black/20 border-white/10 text-white"
                      placeholder="Ex: Aos Renov"
                    />
                  </div>

                  <div>
                    <Label htmlFor="legalForm" className="text-white">Forme juridique</Label>
                    <Select
                      value={formData.legalForm || ''}
                      onValueChange={(value) => handleChange('legalForm', value)}
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
                      value={formData.siret || ''}
                      onChange={(e) => handleChange('siret', e.target.value)}
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
                      value={formData.address || ''}
                      onChange={(e) => handleChange('address', e.target.value)}
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
                      value={formData.postalCode || ''}
                      onChange={(e) => handleChange('postalCode', e.target.value)}
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
                      value={formData.city || ''}
                      onChange={(e) => handleChange('city', e.target.value)}
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
                      value={formData.phone || ''}
                      onChange={(e) => handleChange('phone', e.target.value)}
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
                      value={formData.email || ''}
                      onChange={(e) => handleChange('email', e.target.value)}
                      className="bg-black/20 border-white/10 text-white"
                      placeholder="contact@entreprise.fr"
                    />
                  </div>

                  <div>
                    <Label htmlFor="vatNumber" className="text-white">N° TVA intracommunautaire</Label>
                    <Input
                      id="vatNumber"
                      value={formData.vatNumber || ''}
                      onChange={(e) => handleChange('vatNumber', e.target.value)}
                      className="bg-black/20 border-white/10 text-white"
                      placeholder="FR XX XXX XXX XXX"
                    />
                  </div>

                  <div>
                    <Label htmlFor="apeCode" className="text-white">Code APE/NAF</Label>
                    <Input
                      id="apeCode"
                      value={formData.apeCode || ''}
                      onChange={(e) => handleChange('apeCode', e.target.value)}
                      className="bg-black/20 border-white/10 text-white"
                      placeholder="Ex: 4332Z"
                    />
                  </div>

                  <div>
                    <Label htmlFor="website" className="text-white">Site web</Label>
                    <Input
                      id="website"
                      value={formData.website || ''}
                      onChange={(e) => handleChange('website', e.target.value)}
                      className="bg-black/20 border-white/10 text-white"
                      placeholder="https://www.entreprise.fr"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="insurance">
            <Card className="bg-black/20 backdrop-blur-xl border border-white/10 text-white">
              <CardHeader>
                <CardTitle className="text-white">Assurances</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Assurance Décennale</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="insuranceCompany" className="text-white">Assureur</Label>
                      <Input
                        id="insuranceCompany"
                        value={formData.insuranceDecennale?.company || ''}
                        onChange={(e) =>
                          handleChange('insuranceDecennale', {
                            ...formData.insuranceDecennale,
                            company: e.target.value,
                            policyNumber: formData.insuranceDecennale?.policyNumber || '',
                            validUntil: formData.insuranceDecennale?.validUntil || '',
                          })
                        }
                        className="bg-black/20 border-white/10 text-white"
                      />
                    </div>
                    <div>
                      <Label htmlFor="policyNumber" className="text-white">N° Police</Label>
                      <Input
                        id="policyNumber"
                        value={formData.insuranceDecennale?.policyNumber || ''}
                        onChange={(e) =>
                          handleChange('insuranceDecennale', {
                            ...formData.insuranceDecennale,
                            company: formData.insuranceDecennale?.company || '',
                            policyNumber: e.target.value,
                            validUntil: formData.insuranceDecennale?.validUntil || '',
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
                        value={formData.insuranceDecennale?.validUntil || ''}
                        onChange={(e) =>
                          handleChange('insuranceDecennale', {
                            ...formData.insuranceDecennale,
                            company: formData.insuranceDecennale?.company || '',
                            policyNumber: formData.insuranceDecennale?.policyNumber || '',
                            validUntil: e.target.value,
                          })
                        }
                        className="bg-black/20 border-white/10 text-white"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payment">
            <Card className="bg-black/20 backdrop-blur-xl border border-white/10 text-white">
              <CardHeader>
                <CardTitle className="text-white">Informations de Paiement</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="iban" className="text-white">IBAN / RIB</Label>
                  <Input
                    id="iban"
                    value={formData.iban || ''}
                    onChange={(e) => handleChange('iban', e.target.value)}
                    className="bg-black/20 border-white/10 text-white"
                    placeholder="FR76 XXXX XXXX XXXX XXXX XXXX XXX"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </PageWrapper>
  );
}
