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
import { Building2, FileText, Package } from 'lucide-react';
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
      <header className="bg-black/20 backdrop-blur-xl border-b border-white/10 px-4 md:px-6 py-4 rounded-tl-3xl ml-0 md:ml-20 mb-4 md:mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 md:gap-6">
          <div className="flex-shrink-0 min-w-0">
            <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
              <FileText className="h-5 w-5 md:h-6 md:w-6" />
              Paramètres
            </h1>
            <p className="text-xs md:text-sm text-white/70">Configurez les informations de votre entreprise</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 flex-shrink-0 ml-auto lg:ml-0 w-full lg:w-auto mr-0 lg:mr-40">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-violet-600 hover:bg-violet-700 whitespace-nowrap flex-shrink-0"
            >
              Enregistrer
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-6 ml-0 md:ml-20">
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
                    <Label htmlFor="rcsCity" className="text-white">
                      Ville RCS/RM <span className="text-yellow-400">⚠️ Recommandé</span>
                    </Label>
                    <Input
                      id="rcsCity"
                      value={formData.rcsCity || ''}
                      onChange={(e) => handleChange('rcsCity', e.target.value)}
                      className="bg-black/20 border-white/10 text-white"
                      placeholder="Ex: Nantes, Paris, Lyon"
                    />
                    <p className="text-xs text-yellow-400/70 mt-1">
                      Obligatoire pour les factures B2B
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="capital" className="text-white">Capital social (€)</Label>
                    <Input
                      id="capital"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.capital || ''}
                      onChange={(e) => handleChange('capital', e.target.value ? parseFloat(e.target.value) : undefined)}
                      className="bg-black/20 border-white/10 text-white"
                      placeholder="0"
                    />
                    <p className="text-xs text-white/50 mt-1">
                      Laisser vide si micro-entreprise
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="country" className="text-white">Pays</Label>
                    <Input
                      id="country"
                      value={formData.country || 'France'}
                      onChange={(e) => handleChange('country', e.target.value)}
                      className="bg-black/20 border-white/10 text-white"
                      placeholder="France"
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
        </Tabs>
      </main>
    </PageWrapper>
  );
}
