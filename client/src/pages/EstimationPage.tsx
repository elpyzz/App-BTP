import { PageWrapper } from '@/components/PageWrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, Wand2, Plus, Calculator, User, ArrowRight, ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react';
import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChantiers, type Client } from '@/context/ChantiersContext';
import { getMaterials, addMaterial, updateMaterial, type Material, MATERIAL_CATEGORIES, MATERIAL_UNITS } from '@/lib/materials';
import { useEstimation } from '@/hooks/useEstimation';
import { MaterialEstimationCard } from '@/components/MaterialEstimationCard';
import { useToast } from '@/hooks/use-toast';

interface UploadedImage {
  file: File;
  preview: string;
}

export default function EstimationPage() {
  const { clients, addClient } = useChantiers();
  const { toast } = useToast();
  const { analyzeChantier, isLoading: isLoadingEstimation, result: estimationResult } = useEstimation();
  const [step, setStep] = useState(1);
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientMode, setClientMode] = useState<'select' | 'create'>('select');
  const [newClient, setNewClient] = useState({ name: '', email: '', phone: '' });
  const [chantierInfo, setChantierInfo] = useState({
    surface: '',
    materiaux: '',
    localisation: '',
    delai: '',
    metier: ''
  });
  const [analysisResults, setAnalysisResults] = useState<any>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [isAddMaterialDialogOpen, setIsAddMaterialDialogOpen] = useState(false);
  const [materialToAdd, setMaterialToAdd] = useState<{
    nom: string;
    quantite: number;
    prixUnitaire: number;
    unite: string;
    category: string;
  } | null>(null);
  
  // Charger les matériaux au montage
  useEffect(() => {
    loadMaterials();
  }, []);
  
  // Mettre à jour analysisResults quand estimationResult change
  useEffect(() => {
    if (estimationResult) {
      setAnalysisResults(estimationResult);
    }
  }, [estimationResult]);
  
  const loadMaterials = async () => {
    try {
      const mats = await getMaterials();
      setMaterials(mats);
    } catch (error) {
      console.error('Error loading materials:', error);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
    handleFiles(files);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      handleFiles(files);
    }
  }, []);

  const handleFiles = (files: File[]) => {
    const newImages = files.map(file => ({
      file,
      preview: URL.createObjectURL(file)
    }));
    setImages(prev => [...prev, ...newImages]);
  };

  const removeImage = (index: number) => {
    setImages(prev => {
      const newImages = prev.filter((_, i) => i !== index);
      prev[index].preview && URL.revokeObjectURL(prev[index].preview);
      return newImages;
    });
  };

  const handleNext = () => {
    if (step === 1 && images.length > 0) {
      setStep(2);
    }
  };

  const handleLaunchAnalysis = async () => {
    try {
      const imageFiles = images.map(img => img.file);
      const result = await analyzeChantier(imageFiles, chantierInfo);
      if (result) {
        setStep(3);
      }
    } catch (error) {
      console.error('Error in analysis:', error);
    }
  };
  
  // Recalculer l'estimation après modification
  const recalculateEstimation = () => {
    if (!analysisResults) return;
    
    // Recalculer le coût total des matériaux
    const totalMateriaux = analysisResults.materiaux.reduce((sum: number, mat: any) => sum + (mat.prixTotal || 0), 0);
    
    // Recalculer le coût total
    const detailsCouts = analysisResults.detailsCouts || {
      mainOeuvre: 0,
      transport: 0,
      outillage: 0,
      gestionDechets: 0
    };
    
    const newCoutTotal = detailsCouts.mainOeuvre + 
                         totalMateriaux + 
                         detailsCouts.transport + 
                         detailsCouts.outillage + 
                         detailsCouts.gestionDechets;
    
    const marge = analysisResults.marge || 0;
    const benefice = newCoutTotal - (newCoutTotal - marge);
    
    setAnalysisResults({
      ...analysisResults,
      detailsCouts: {
        ...detailsCouts,
        materiaux: totalMateriaux
      },
      coutTotal: newCoutTotal,
      benefice: benefice
    });
  };
  
  // Ajouter un matériau depuis l'estimation
  const handleAddMaterialFromEstimation = async (materialIndex: number) => {
    if (!analysisResults || !analysisResults.materiaux[materialIndex]) return;
    
    const mat = analysisResults.materiaux[materialIndex];
    const quantite = typeof mat.quantite === 'number' ? mat.quantite : parseFloat(mat.quantite.toString().replace(',', '.')) || 0;
    const prixUnitaire = mat.prixTotal / quantite || mat.prixUnitaire || 0;
    
    setMaterialToAdd({
      nom: mat.nom,
      quantite: quantite,
      prixUnitaire: prixUnitaire,
      unite: mat.unite || 'unité',
      category: ''
    });
    setIsAddMaterialDialogOpen(true);
  };
  
  // Sauvegarder le matériau depuis le dialog
  const handleSaveMaterialFromDialog = async () => {
    if (!materialToAdd || !materialToAdd.nom || !materialToAdd.category || !materialToAdd.unite) {
      toast({
        title: 'Erreur',
        description: 'Veuillez remplir tous les champs obligatoires',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      const newMaterial = await addMaterial({
        name: materialToAdd.nom,
        category: materialToAdd.category,
        unitPrice: materialToAdd.prixUnitaire,
        unit: materialToAdd.unite
      });
      
      if (newMaterial) {
        await loadMaterials();
        
        // Mettre à jour le matériau dans l'estimation
        if (analysisResults) {
          const updatedMateriaux = analysisResults.materiaux.map((mat: any, index: number) => {
            if (mat.nom === materialToAdd.nom) {
              return {
                ...mat,
                prixReel: true,
                materialId: newMaterial.id,
                prixUnitaire: newMaterial.unitPrice,
                prixTotal: materialToAdd.quantite * newMaterial.unitPrice
              };
            }
            return mat;
          });
          
          setAnalysisResults({
            ...analysisResults,
            materiaux: updatedMateriaux
          });
          
          recalculateEstimation();
        }
        
        toast({
          title: 'Succès',
          description: 'Matériau ajouté avec succès',
        });
        
        setIsAddMaterialDialogOpen(false);
        setMaterialToAdd(null);
      }
    } catch (error) {
      console.error('Error adding material:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible d\'ajouter le matériau',
        variant: 'destructive',
      });
    }
  };
  
  // Modifier le prix d'un matériau
  const handleUpdateMaterialPrice = async (materialIndex: number, newPrice: number) => {
    if (!analysisResults || !analysisResults.materiaux[materialIndex]) return;
    
    const mat = analysisResults.materiaux[materialIndex];
    
    try {
      if (mat.materialId) {
        // Matériau existe, mettre à jour
        const quantite = typeof mat.quantite === 'number' ? mat.quantite : parseFloat(mat.quantite.toString().replace(',', '.')) || 0;
        await updateMaterial(mat.materialId, {
          unitPrice: newPrice
        });
        
        await loadMaterials();
        
        // Mettre à jour dans l'estimation
        const updatedMateriaux = [...analysisResults.materiaux];
        updatedMateriaux[materialIndex] = {
          ...mat,
          prixUnitaire: newPrice,
          prixTotal: quantite * newPrice
        };
        
        setAnalysisResults({
          ...analysisResults,
          materiaux: updatedMateriaux
        });
        
        recalculateEstimation();
        
        toast({
          title: 'Succès',
          description: 'Prix mis à jour avec succès',
        });
      } else {
        // Matériau n'existe pas, proposer de l'ajouter
        handleAddMaterialFromEstimation(materialIndex);
      }
    } catch (error) {
      console.error('Error updating material:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour le prix',
        variant: 'destructive',
      });
    }
  };

  const handleCreateClient = async () => {
    try {
      await addClient(newClient);
      // Le client sera ajouté avec un ID généré par Supabase
      // On doit attendre qu'il soit ajouté pour obtenir son ID
      // Pour l'instant, on utilise un ID temporaire
      const tempClient: Client = {
        id: Date.now().toString(),
        ...newClient
      };
      setSelectedClient(tempClient);
      setNewClient({ name: '', email: '', phone: '' });
      setClientMode('select');
    } catch (error) {
      console.error('Error adding client:', error);
      alert('Erreur lors de l\'ajout du client');
    }
  };

  const handleSelectClient = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    if (client) {
      setSelectedClient(client);
    }
  };

  return (
    <PageWrapper>
      <header className="bg-black/20 backdrop-blur-xl border-b border-white/10 px-4 md:px-6 py-4 rounded-tl-3xl ml-0 md:ml-20">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-white">
              Estimation Automatique des Chantiers
            </h1>
            <p className="text-xs md:text-sm text-white/70">
              Étape {step}/3 - {step === 1 ? 'Import des photos' : step === 2 ? 'Informations du chantier' : 'Résultats de l\'analyse'}
            </p>
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-6 ml-0 md:ml-20">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-4xl mx-auto"
            >
              <Card className="bg-black/20 backdrop-blur-xl border border-white/10 text-white">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5 text-white/70" />
                    Import des Photos du Chantier
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                      isDragging
                        ? 'border-white/40 bg-white/10'
                        : 'border-white/20 hover:border-white/30'
                    }`}
                  >
                    <Upload className="h-12 w-12 mx-auto mb-4 text-white/70" />
                    <p className="text-lg font-medium text-white mb-2">
                      Glissez-déposez vos photos ici
                    </p>
                    <p className="text-sm text-white/60 mb-4">
                      ou cliquez pour sélectionner des fichiers
                    </p>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleFileInput}
                      className="hidden"
                      id="photo-upload"
                    />
                    <Button
                      variant="outline"
                      className="text-white border-white/20 hover:bg-white/10"
                      onClick={() => document.getElementById('photo-upload')?.click()}
                    >
                      Sélectionner des photos
                    </Button>
                  </div>

                  {images.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                      {images.map((image, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={image.preview}
                            alt={`Preview ${index + 1}`}
                            className="w-full h-32 object-cover rounded-lg border border-white/20"
                          />
                          <button
                            onClick={() => removeImage(index)}
                            className="absolute top-2 right-2 bg-red-500/80 hover:bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex justify-end mt-6">
                    <Button
                      onClick={handleNext}
                      disabled={images.length === 0}
                      className="bg-white/20 backdrop-blur-md text-white border border-white/10 hover:bg-white/30 disabled:opacity-50"
                    >
                      Suivant
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-4xl mx-auto"
            >
              <Card className="bg-black/20 backdrop-blur-xl border border-white/10 text-white">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5 text-white/70" />
                    Informations du Chantier
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Client Section */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white">Client</h3>
                    {selectedClient ? (
                      <div className="p-4 bg-black/20 backdrop-blur-md border border-white/10 rounded-lg">
                        <p className="text-white font-medium">{selectedClient.name}</p>
                        <p className="text-sm text-white/70">{selectedClient.email}</p>
                        <p className="text-sm text-white/70">{selectedClient.phone}</p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2 text-white border-white/20 hover:bg-white/10"
                          onClick={() => {
                            setSelectedClient(null);
                            setClientMode('select');
                          }}
                        >
                          Changer de client
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4 p-4 bg-black/20 backdrop-blur-md border border-white/10 rounded-lg">
                        {/* Mode Selection */}
                        <div className="flex gap-2 mb-4">
                          <Button
                            type="button"
                            variant={clientMode === 'select' ? 'default' : 'outline'}
                            onClick={() => setClientMode('select')}
                            className={`flex-1 ${
                              clientMode === 'select'
                                ? 'bg-violet-500 text-white'
                                : 'bg-transparent border-white/20 text-white hover:bg-white/10'
                            }`}
                          >
                            Sélectionner un client existant
                          </Button>
                          <Button
                            type="button"
                            variant={clientMode === 'create' ? 'default' : 'outline'}
                            onClick={() => setClientMode('create')}
                            className={`flex-1 ${
                              clientMode === 'create'
                                ? 'bg-violet-500 text-white'
                                : 'bg-transparent border-white/20 text-white hover:bg-white/10'
                            }`}
                          >
                            Créer un nouveau client
                          </Button>
                        </div>

                        {clientMode === 'select' ? (
                          <div className="space-y-4">
                            {clients.length > 0 ? (
                              <div>
                                <label className="text-sm font-medium text-white block mb-2">Sélectionner un client</label>
                                <Select onValueChange={handleSelectClient}>
                                  <SelectTrigger className="w-full bg-black/20 backdrop-blur-md border-white/10 text-white">
                                    <SelectValue placeholder="Choisir un client..." />
                                  </SelectTrigger>
                                  <SelectContent className="bg-black/30 backdrop-blur-lg border-white/10 text-white">
                                    {clients.map((client) => (
                                      <SelectItem key={client.id} value={client.id} className="text-white">
                                        {client.name} - {client.email}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            ) : (
                              <div className="p-4 bg-black/10 rounded-lg border border-white/5 text-center">
                                <p className="text-white/70 text-sm mb-2">Aucun client enregistré</p>
                                <p className="text-white/50 text-xs mb-3">Créez votre premier client pour commencer</p>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setClientMode('create')}
                                  className="text-white border-white/20 hover:bg-white/10"
                                >
                                  Créer un client
                                </Button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div>
                                <label className="text-sm font-medium text-white block mb-2">Nom</label>
                                <input
                                  type="text"
                                  value={newClient.name}
                                  onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                                  className="w-full px-3 py-2 rounded-md border bg-black/20 backdrop-blur-md border-white/10 text-white placeholder:text-white/50"
                                  placeholder="Nom du client"
                                />
                              </div>
                              <div>
                                <label className="text-sm font-medium text-white block mb-2">Email</label>
                                <input
                                  type="email"
                                  value={newClient.email}
                                  onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                                  className="w-full px-3 py-2 rounded-md border bg-black/20 backdrop-blur-md border-white/10 text-white placeholder:text-white/50"
                                  placeholder="email@example.com"
                                />
                              </div>
                              <div>
                                <label className="text-sm font-medium text-white block mb-2">Téléphone</label>
                                <input
                                  type="tel"
                                  value={newClient.phone}
                                  onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                                  className="w-full px-3 py-2 rounded-md border bg-black/20 backdrop-blur-md border-white/10 text-white placeholder:text-white/50"
                                  placeholder="06 12 34 56 78"
                                />
                              </div>
                            </div>
                            <Button
                              onClick={handleCreateClient}
                              disabled={!newClient.name || !newClient.email || !newClient.phone}
                              className="bg-white/20 backdrop-blur-md text-white border border-white/10 hover:bg-white/30 disabled:opacity-50"
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Ajouter le client
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Chantier Info */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white">Informations du Chantier</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-white block mb-2">Surface (m²)</label>
                        <input
                          type="number"
                          value={chantierInfo.surface}
                          onChange={(e) => setChantierInfo({ ...chantierInfo, surface: e.target.value })}
                          className="w-full px-3 py-2 rounded-md border bg-black/20 backdrop-blur-md border-white/10 text-white placeholder:text-white/50"
                          placeholder="Ex: 50"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-white block mb-2">Métier</label>
                        <select
                          value={chantierInfo.metier}
                          onChange={(e) => setChantierInfo({ ...chantierInfo, metier: e.target.value })}
                          className="w-full px-3 py-2 rounded-md border bg-black/20 backdrop-blur-md border-white/10 text-white"
                        >
                          <option value="">Sélectionner un métier</option>
                          <option value="plombier">Plombier</option>
                          <option value="carreleur">Carreleur</option>
                          <option value="electricien">Électricien</option>
                          <option value="peintre">Peintre</option>
                          <option value="maçon">Maçon</option>
                          <option value="charpentier">Charpentier</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-white block mb-2">Matériaux</label>
                        <input
                          type="text"
                          value={chantierInfo.materiaux}
                          onChange={(e) => setChantierInfo({ ...chantierInfo, materiaux: e.target.value })}
                          className="w-full px-3 py-2 rounded-md border bg-black/20 backdrop-blur-md border-white/10 text-white placeholder:text-white/50"
                          placeholder="Ex: Carrelage, Peinture"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-white block mb-2">Localisation</label>
                        <input
                          type="text"
                          value={chantierInfo.localisation}
                          onChange={(e) => setChantierInfo({ ...chantierInfo, localisation: e.target.value })}
                          className="w-full px-3 py-2 rounded-md border bg-black/20 backdrop-blur-md border-white/10 text-white placeholder:text-white/50"
                          placeholder="Ex: Paris 75001"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="text-sm font-medium text-white block mb-2">Délai souhaité</label>
                        <input
                          type="text"
                          value={chantierInfo.delai}
                          onChange={(e) => setChantierInfo({ ...chantierInfo, delai: e.target.value })}
                          className="w-full px-3 py-2 rounded-md border bg-black/20 backdrop-blur-md border-white/10 text-white placeholder:text-white/50"
                          placeholder="Ex: 2 semaines"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between mt-6">
                    <Button
                      variant="outline"
                      onClick={() => setStep(1)}
                      className="text-white border-white/20 hover:bg-white/10"
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Retour
                    </Button>
                    <Button
                      onClick={handleLaunchAnalysis}
                      disabled={!selectedClient || !chantierInfo.surface || !chantierInfo.metier || isLoadingEstimation || images.length === 0}
                      className="bg-white/20 backdrop-blur-md text-white border border-white/10 hover:bg-white/30 disabled:opacity-50"
                    >
                      {isLoadingEstimation ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Analyse en cours...
                        </>
                      ) : (
                        <>
                          <Wand2 className="h-4 w-4 mr-2" />
                          Lancer l'analyse
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {step === 3 && analysisResults && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-6xl mx-auto space-y-6"
            >
              <Card className="bg-black/20 backdrop-blur-xl border border-white/10 text-white">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-400" />
                    Résultats de l'Analyse IA
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Estimation du temps */}
                  <div className="p-4 bg-black/20 backdrop-blur-md border border-white/10 rounded-lg">
                    <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-400" />
                      Estimation du temps de réalisation
                    </h3>
                    <p className="text-2xl font-bold text-white">{analysisResults.tempsRealisation}</p>
                  </div>

                  {/* Liste des matériaux */}
                  <div className="p-4 bg-black/20 backdrop-blur-md border border-white/10 rounded-lg">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-400" />
                      Liste des matériaux nécessaires
                    </h3>
                    <div className="space-y-3">
                      {analysisResults.materiaux.map((mat: any, index: number) => (
                        <MaterialEstimationCard
                          key={index}
                          material={{
                            nom: mat.nom,
                            quantite: mat.quantite,
                            quantiteAvecPerte: mat.quantiteAvecPerte,
                            unite: mat.unite || 'unité',
                            prixUnitaire: mat.prixUnitaire || (mat.prixTotal / (typeof mat.quantite === 'number' ? mat.quantite : parseFloat(mat.quantite.toString().replace(',', '.')) || 1)) || 0,
                            prixTotal: mat.prixTotal || mat.prix || 0,
                            coefficientPerte: mat.coefficientPerte,
                            prixReel: mat.prixReel,
                            needsAdding: mat.needsAdding,
                            materialId: mat.materialId,
                            confidence: mat.confidence
                          }}
                          onUpdatePrice={(newPrice) => handleUpdateMaterialPrice(index, newPrice)}
                          onAddToLibrary={() => handleAddMaterialFromEstimation(index)}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Nombre d'ouvriers */}
                  <div className="p-4 bg-black/20 backdrop-blur-md border border-white/10 rounded-lg">
                    <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-400" />
                      Estimation du nombre d'ouvriers requis
                    </h3>
                    <p className="text-2xl font-bold text-white">{analysisResults.nombreOuvriers} ouvrier(s)</p>
                  </div>

                  {/* Coût total */}
                  <div className="p-4 bg-black/20 backdrop-blur-md border border-white/10 rounded-lg">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-400" />
                      Coût total prévisionnel
                    </h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-white/70">Coût de base</span>
                        <span className="text-white font-semibold">{typeof analysisResults.coutTotal === 'number' ? analysisResults.coutTotal.toFixed(2) : analysisResults.coutTotal} €</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/70">Marge</span>
                        <span className="text-white font-semibold">{typeof analysisResults.marge === 'number' ? analysisResults.marge.toFixed(2) : analysisResults.marge} €</span>
                      </div>
                      <div className="flex justify-between border-t border-white/10 pt-2">
                        <span className="text-white font-semibold">Bénéfice estimé</span>
                        <span className="text-green-400 font-bold text-xl">{typeof analysisResults.benefice === 'number' ? analysisResults.benefice.toFixed(2) : analysisResults.benefice} €</span>
                      </div>
                    </div>
                  </div>

                  {/* Graphique de répartition */}
                  <div className="p-4 bg-black/20 backdrop-blur-md border border-white/10 rounded-lg">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-400" />
                      Répartition des coûts
                    </h3>
                    <div className="space-y-3">
                      {analysisResults.detailsCouts ? Object.entries(analysisResults.detailsCouts).map(([key, value]: [string, any]) => (
                        <div key={key} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="text-white/70 capitalize">
                              {key === 'mainOeuvre' ? 'Main-d\'œuvre' : 
                               key === 'gestionDechets' ? 'Gestion déchets' : key}
                            </span>
                            <span className="text-white font-semibold">{typeof value === 'number' ? value.toFixed(2) : value} €</span>
                          </div>
                          <div className="w-full bg-black/20 rounded-full h-2">
                            <div
                              className="bg-white/30 h-2 rounded-full"
                              style={{ width: `${analysisResults.coutTotal > 0 ? ((value / analysisResults.coutTotal) * 100) : 0}%` }}
                            />
                          </div>
                        </div>
                      )) : analysisResults.repartitionCouts ? Object.entries(analysisResults.repartitionCouts).map(([key, value]: [string, any]) => (
                        <div key={key} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="text-white/70 capitalize">{key === 'mainOeuvre' ? 'Main-d\'œuvre' : key}</span>
                            <span className="text-white font-semibold">{typeof value === 'number' ? value.toFixed(2) : value} €</span>
                          </div>
                          <div className="w-full bg-black/20 rounded-full h-2">
                            <div
                              className="bg-white/30 h-2 rounded-full"
                              style={{ width: `${analysisResults.coutTotal > 0 ? ((value / analysisResults.coutTotal) * 100) : 0}%` }}
                            />
                          </div>
                        </div>
                      )) : null}
                    </div>
                  </div>

                  {/* Recommandations */}
                  <div className="p-4 bg-black/20 backdrop-blur-md border border-white/10 rounded-lg">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-400" />
                      Recommandations automatiques
                    </h3>
                    <ul className="space-y-2">
                      {analysisResults.recommandations.map((rec: string, index: number) => (
                        <li key={index} className="flex items-start gap-2 text-white/90">
                          <span className="text-green-400 mt-1">•</span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex justify-end mt-6">
                    <Button
                      onClick={() => {
                        setStep(1);
                        setImages([]);
                        setSelectedClient(null);
                        setChantierInfo({ surface: '', materiaux: '', localisation: '', delai: '', metier: '' });
                        setAnalysisResults(null);
                      }}
                      className="bg-white/20 backdrop-blur-md text-white border border-white/10 hover:bg-white/30"
                    >
                      Nouvelle estimation
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Dialog pour ajouter un matériau */}
        <Dialog open={isAddMaterialDialogOpen} onOpenChange={setIsAddMaterialDialogOpen}>
          <DialogContent className="bg-black/20 backdrop-blur-xl border border-white/10 text-white rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-white">Ajouter un matériau à ma bibliothèque</DialogTitle>
            </DialogHeader>
            {materialToAdd && (
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="material-name" className="text-white">Nom du matériau *</Label>
                  <Input
                    id="material-name"
                    value={materialToAdd.nom}
                    onChange={(e) => setMaterialToAdd({ ...materialToAdd, nom: e.target.value })}
                    className="bg-black/20 border-white/10 text-white"
                    placeholder="Ex: Carrelage céramique"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="material-category" className="text-white">Catégorie *</Label>
                  <Select 
                    value={materialToAdd.category} 
                    onValueChange={(value) => setMaterialToAdd({ ...materialToAdd, category: value })}
                  >
                    <SelectTrigger className="bg-black/20 border-white/10 text-white">
                      <SelectValue placeholder="Sélectionner une catégorie" />
                    </SelectTrigger>
                    <SelectContent className="bg-black/30 backdrop-blur-lg border-white/10 text-white">
                      {MATERIAL_CATEGORIES.map(category => (
                        <SelectItem key={category} value={category}>{category}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="material-price" className="text-white">Prix unitaire (€) *</Label>
                    <Input
                      id="material-price"
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={materialToAdd.prixUnitaire}
                      onChange={(e) => setMaterialToAdd({ ...materialToAdd, prixUnitaire: parseFloat(e.target.value) || 0 })}
                      className="bg-black/20 border-white/10 text-white"
                      placeholder="0.00"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="material-unit" className="text-white">Unité *</Label>
                    <Select 
                      value={materialToAdd.unite} 
                      onValueChange={(value) => setMaterialToAdd({ ...materialToAdd, unite: value })}
                    >
                      <SelectTrigger className="bg-black/20 border-white/10 text-white">
                        <SelectValue placeholder="Sélectionner une unité" />
                      </SelectTrigger>
                      <SelectContent className="bg-black/30 backdrop-blur-lg border-white/10 text-white">
                        {MATERIAL_UNITS.map(unit => (
                          <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-white/70 text-sm">Quantité estimée: {materialToAdd.quantite} {materialToAdd.unite}</Label>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsAddMaterialDialogOpen(false);
                  setMaterialToAdd(null);
                }} 
                className="text-white border-white/20 hover:bg-white/10"
              >
                Annuler
              </Button>
              <Button 
                onClick={handleSaveMaterialFromDialog}
                className="bg-white/20 backdrop-blur-md text-white border border-white/10 hover:bg-white/30"
              >
                Ajouter
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </PageWrapper>
  );
}
