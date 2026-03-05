import { PageWrapper } from '@/components/PageWrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, Wand2, Plus, Calculator, User, ArrowRight, ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react';
import { useState, useCallback, useEffect, useRef } from 'react';
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
  const imagesRef = useRef(images);
  const [isDragging, setIsDragging] = useState(false);
  
  // Nouveau flux : métier sélectionné à l'étape 1
  const [selectedMetier, setSelectedMetier] = useState<string>('');
  
  // Étape 2 : Réponses spécifiques au métier
  const [reponsesMetier, setReponsesMetier] = useState<any>({});
  
  // Étape 3 : Informations communes
  const [contexteCommun, setContexteCommun] = useState({
    acces: '',
    fournitureMateriaux: '',
    localisation: '',
    delai: '',
    precisions: ''
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
  
  // Mettre à jour la ref à chaque changement d'images
  useEffect(() => {
    imagesRef.current = images;
  }, [images]);
  
  // Nettoyer les previews d'images au démontage pour éviter les fuites mémoire
  useEffect(() => {
    return () => {
      imagesRef.current.forEach(img => {
        if (img.preview) {
          URL.revokeObjectURL(img.preview);
        }
      });
    };
  }, []); // Seulement au démontage
  
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
    if (step === 1) {
      // Vérifier photo + métier
      if (images.length === 0 || !selectedMetier) {
        toast({
          title: 'Champs manquants',
          description: 'Veuillez uploader une photo et sélectionner un métier',
          variant: 'destructive',
        });
        return;
      }
      setStep(2);
    } else if (step === 2) {
      // Validation des réponses métier (dépend du métier)
      // Pour l'instant, on passe toujours à l'étape suivante
      setStep(3);
    } else if (step === 3) {
      // Vérifier les champs obligatoires de l'étape 3
      if (!contexteCommun.acces || !contexteCommun.fournitureMateriaux || 
          !contexteCommun.localisation || !contexteCommun.delai) {
        toast({
          title: 'Champs manquants',
          description: 'Veuillez remplir tous les champs obligatoires',
          variant: 'destructive',
        });
        return;
      }
      setStep(4);
    }
  };

  const handleLaunchAnalysis = async () => {
    try {
      const imageFiles = images.map(img => img.file);
      const result = await analyzeChantier(imageFiles, selectedMetier, reponsesMetier, contexteCommun);
      if (result) {
        setStep(5);
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

  // Mapping métier → champs spécifiques
  const metierToFields: Record<string, string> = {
    'plombier': 'plombier',
    'plombier-chauffagiste': 'plombier',
    'electricien': 'electricien',
    'peintre': 'peintre',
    'peintre-decorateur': 'peintre',
    'carreleur': 'carreleur',
    'macon': 'macon',
    'couvreur': 'couvreur',
    'charpentier': 'couvreur',
    'menuisier': 'menuisier',
    'paysagiste': 'paysagiste',
  };

  // Fonction pour rendre les champs spécifiques au métier
  const renderMetierSpecificFields = () => {
    const metier = chantierInfo.metier;
    const metierType = metierToFields[metier] || null;

    if (!metierType) {
      return (
        <div className="text-center py-8 text-white/70">
          <p>Aucun champ spécifique pour ce métier.</p>
          <p className="text-sm text-white/50 mt-2">Les informations générales suffisent pour l'estimation.</p>
        </div>
      );
    }

    // Initialiser les détails métier si nécessaire
    if (!detailsMetier[metierType]) {
      setDetailsMetier({ ...detailsMetier, [metierType]: {} });
    }

    const currentDetails = detailsMetier[metierType] || {};

    const updateDetail = (key: string, value: any) => {
      setDetailsMetier({
        ...detailsMetier,
        [metierType]: { ...currentDetails, [key]: value }
      });
    };

    switch (metierType) {
      case 'plombier':
        return renderPlombierFields(currentDetails, updateDetail);
      case 'electricien':
        return renderElectricienFields(currentDetails, updateDetail);
      case 'peintre':
        return renderPeintreFields(currentDetails, updateDetail);
      case 'carreleur':
        return renderCarreleurFields(currentDetails, updateDetail);
      case 'macon':
        return renderMaconFields(currentDetails, updateDetail);
      case 'couvreur':
        return renderCouvreurFields(currentDetails, updateDetail);
      case 'menuisier':
        return renderMenuisierFields(currentDetails, updateDetail);
      case 'paysagiste':
        return renderPaysagisteFields(currentDetails, updateDetail);
      default:
        return null;
    }
  };

  // Fonction pour rendre le récapitulatif
  const renderRecap = () => {
    const getTypeTraveauxLabel = (value: string) => {
      const map: Record<string, string> = {
        'neuf': '🏗️ Travaux neufs',
        'renovation': '🔄 Rénovation',
        'reparation': '🔧 Réparation / Dépannage',
        'extension': '➕ Extension / Agrandissement'
      };
      return map[value] || value;
    };

    const getFournitureLabel = (value: string) => {
      const map: Record<string, string> = {
        'artisan': '🧑‍🔧 L\'artisan fournit tout',
        'client': '📦 Je fournis les matériaux',
        'partage': '🤝 On partage'
      };
      return map[value] || value;
    };

    const getAccesLabel = (value: string) => {
      const map: Record<string, string> = {
        'facile': '✅ Facile',
        'moyen': '⚠️ Moyen',
        'difficile': '❌ Difficile'
      };
      return map[value] || value;
    };

    const getEtatLabel = (value: string) => {
      const map: Record<string, string> = {
        'vide': '🧹 Vide / À partir de zéro',
        'existant': '🏠 Existant à conserver',
        'demolir': '💥 À démolir / Tout à refaire'
      };
      return map[value] || value;
    };

    return (
      <div className="space-y-6">
        {/* Photo */}
        {images.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-white">Photo du chantier</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep(1)}
                className="text-white/70 hover:text-white text-xs"
              >
                Modifier
              </Button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {images.slice(0, 4).map((image, index) => (
                <img
                  key={index}
                  src={image.preview}
                  alt={`Preview ${index + 1}`}
                  className="w-full h-24 object-cover rounded-lg border border-white/20"
                />
              ))}
            </div>
          </div>
        )}

        {/* Informations de base */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-white">Informations de base</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep(2)}
                className="text-white/70 hover:text-white text-xs"
              >
                Modifier
              </Button>
            </div>
            <div className="space-y-2 text-sm">
              <p><span className="text-white/70">Surface:</span> <span className="text-white">{chantierInfo.surface} m²</span></p>
              <p><span className="text-white/70">Métier:</span> <span className="text-white">{chantierInfo.metier}</span></p>
              <p><span className="text-white/70">Matériaux:</span> <span className="text-white">{chantierInfo.materiaux || 'Non spécifié'}</span></p>
              <p><span className="text-white/70">Localisation:</span> <span className="text-white">{chantierInfo.localisation}</span></p>
              <p><span className="text-white/70">Délai:</span> <span className="text-white">{chantierInfo.delai}</span></p>
            </div>
          </div>

          {/* Contexte */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-white">Contexte du chantier</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep(3)}
                className="text-white/70 hover:text-white text-xs"
              >
                Modifier
              </Button>
            </div>
            <div className="space-y-2 text-sm">
              <p><span className="text-white/70">Type:</span> <span className="text-white">{getTypeTraveauxLabel(contexteChantier.typeTraveaux)}</span></p>
              <p><span className="text-white/70">Fourniture:</span> <span className="text-white">{getFournitureLabel(contexteChantier.fournitureMateriaux)}</span></p>
              <p><span className="text-white/70">Accès:</span> <span className="text-white">{getAccesLabel(contexteChantier.acces)}</span></p>
              <p><span className="text-white/70">État:</span> <span className="text-white">{getEtatLabel(contexteChantier.etatActuel)}</span></p>
              <p><span className="text-white/70">Pièces:</span> <span className="text-white">{contexteChantier.nbPieces}</span></p>
              {contexteChantier.precisionsLibres && (
                <p><span className="text-white/70">Précisions:</span> <span className="text-white text-xs">{contexteChantier.precisionsLibres}</span></p>
              )}
            </div>
          </div>
        </div>

        {/* Détails métier */}
        {Object.keys(detailsMetier).length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-white">Détails spécifiques</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep(4)}
                className="text-white/70 hover:text-white text-xs"
              >
                Modifier
              </Button>
            </div>
            <div className="p-4 bg-black/20 backdrop-blur-md border border-white/10 rounded-lg text-sm">
              <pre className="text-white/80 whitespace-pre-wrap font-sans">
                {JSON.stringify(detailsMetier, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    );
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

  // Fonctions de rendu pour chaque métier spécifique
  const renderPlombierFields = (details: any, updateDetail: (key: string, value: any) => void) => {
    const interventions = [
      'installation-neuve',
      'remplacement-canalisations',
      'reparation-depannage',
      'remplacement-equipements',
      'installation-chauffe-eau',
      'debouchage',
      'detection-fuite'
    ];
    const interventionLabels: Record<string, string> = {
      'installation-neuve': 'Installation neuve complète',
      'remplacement-canalisations': 'Remplacement de canalisations',
      'reparation-depannage': 'Réparation / dépannage ponctuel',
      'remplacement-equipements': 'Remplacement d\'équipements sanitaires',
      'installation-chauffe-eau': 'Installation chauffe-eau',
      'debouchage': 'Débouchage',
      'detection-fuite': 'Détection / réparation de fuite'
    };

    return (
      <div className="space-y-6">
        <div>
          <Label className="text-white mb-3 block">Nature exacte des travaux</Label>
          <div className="space-y-2">
            {interventions.map((interv) => (
              <div
                key={interv}
                className={`checkbox-card ${details.typeIntervention?.includes(interv) ? 'checked' : ''}`}
                onClick={() => {
                  const current = details.typeIntervention || [];
                  const newValue = current.includes(interv)
                    ? current.filter((v: string) => v !== interv)
                    : [...current, interv];
                  updateDetail('typeIntervention', newValue);
                }}
              >
                <div className="checkbox-indicator" />
                <span>{interventionLabels[interv]}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <Label className="text-white mb-2 block">Nombre de points d'eau concernés</Label>
          <Input
            type="number"
            min="1"
            value={details.nbPointsEau || ''}
            onChange={(e) => updateDetail('nbPointsEau', e.target.value)}
            className="input-field"
            placeholder="Ex: 3 (évier, lave-vaisselle, douche)"
          />
        </div>

        <div>
          <Label className="text-white mb-2 block">Type de tuyauterie actuelle</Label>
          <Select
            value={details.typeCanalisation || ''}
            onValueChange={(value) => updateDetail('typeCanalisation', value)}
          >
            <SelectTrigger className="input-field">
              <SelectValue placeholder="Sélectionner..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cuivre">Cuivre</SelectItem>
              <SelectItem value="pvc">PVC</SelectItem>
              <SelectItem value="plomb">Plomb</SelectItem>
              <SelectItem value="multicouche">Multicouche</SelectItem>
              <SelectItem value="inconnue">Inconnue</SelectItem>
              <SelectItem value="na">N/A (neuf)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-white mb-3 block">Accessibilité des canalisations</Label>
          <div className="choices-grid-3">
            {[
              { value: 'apparentes', emoji: '✅', label: 'Apparentes (accessibles directement)' },
              { value: 'encastrees', emoji: '⚠️', label: 'Encastrées (dans les murs/cloisons)' },
              { value: 'sous-dalle', emoji: '❌', label: 'Sous dalle béton' }
            ].map((option) => (
              <div
                key={option.value}
                className={`choice-card ${details.accessibiliteCanalisations === option.value ? 'selected' : ''}`}
                onClick={() => updateDetail('accessibiliteCanalisations', option.value)}
              >
                <span className="choice-card-emoji">{option.emoji}</span>
                <span>{option.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <Label className="text-white mb-3 block">Y a-t-il un chauffe-eau à installer ou remplacer ?</Label>
          <div className="choices-grid-2">
            {[
              { value: 'non', label: 'Non' },
              { value: 'electrique', label: 'Oui — électrique' },
              { value: 'gaz', label: 'Oui — gaz' },
              { value: 'thermodynamique', label: 'Oui — thermodynamique' },
              { value: 'solaire', label: 'Oui — solaire' }
            ].map((option) => (
              <div
                key={option.value}
                className={`choice-card ${details.chauffeEau === option.value ? 'selected' : ''}`}
                onClick={() => updateDetail('chauffeEau', option.value)}
              >
                <span>{option.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <Label className="text-white mb-3 block">Présence de plomb dans les installations</Label>
          <div className="choices-grid-3">
            {[
              { value: 'non', label: 'Non' },
              { value: 'oui', label: 'Oui' },
              { value: 'inconnue', label: 'Inconnue' }
            ].map((option) => (
              <div
                key={option.value}
                className={`choice-card ${details.presencePlomb === option.value ? 'selected' : ''}`}
                onClick={() => updateDetail('presencePlomb', option.value)}
              >
                <span>{option.label}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-white/50 mt-2">Important pour l'évaluation des risques et du coût</p>
        </div>
      </div>
    );
  };

  const renderElectricienFields = (details: any, updateDetail: (key: string, value: any) => void) => {
    const interventions = [
      'installation-complete',
      'mise-aux-normes',
      'extension-reseau',
      'remplacement-tableau',
      'ajout-prises',
      'domotique',
      'vmc',
      'panneaux-solaires',
      'depannage'
    ];
    const interventionLabels: Record<string, string> = {
      'installation-complete': 'Installation électrique complète (neuf)',
      'mise-aux-normes': 'Mise aux normes NFC 15-100',
      'extension-reseau': 'Extension du réseau existant',
      'remplacement-tableau': 'Remplacement du tableau électrique',
      'ajout-prises': 'Ajout de prises / points lumineux',
      'domotique': 'Installation domotique',
      'vmc': 'Pose de VMC',
      'panneaux-solaires': 'Installation panneaux solaires / bornes de recharge',
      'depannage': 'Dépannage ponctuel'
    };

    return (
      <div className="space-y-6">
        <div>
          <Label className="text-white mb-3 block">Nature exacte des travaux</Label>
          <div className="space-y-2">
            {interventions.map((interv) => (
              <div
                key={interv}
                className={`checkbox-card ${details.typeIntervention?.includes(interv) ? 'checked' : ''}`}
                onClick={() => {
                  const current = details.typeIntervention || [];
                  const newValue = current.includes(interv)
                    ? current.filter((v: string) => v !== interv)
                    : [...current, interv];
                  updateDetail('typeIntervention', newValue);
                }}
              >
                <div className="checkbox-indicator" />
                <span>{interventionLabels[interv]}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <Label className="text-white mb-3 block">Le tableau électrique est-il à remplacer ?</Label>
          <div className="choices-grid-2">
            {[
              { value: 'non', label: 'Non' },
              { value: 'remplacement-simple', label: 'Oui — remplacement simple' },
              { value: 'mise-aux-normes', label: 'Oui — mise aux normes complète' },
              { value: 'a-evaluer', label: 'À évaluer' }
            ].map((option) => (
              <div
                key={option.value}
                className={`choice-card ${details.tableauElectrique === option.value ? 'selected' : ''}`}
                onClick={() => updateDetail('tableauElectrique', option.value)}
              >
                <span>{option.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-white mb-2 block">Nombre de points lumineux concernés</Label>
            <Input
              type="number"
              min="0"
              value={details.nbPointsLumineux || ''}
              onChange={(e) => updateDetail('nbPointsLumineux', e.target.value)}
              className="input-field"
              placeholder="Ex: 8"
            />
          </div>
          <div>
            <Label className="text-white mb-2 block">Nombre de prises concernées</Label>
            <Input
              type="number"
              min="0"
              value={details.nbPrises || ''}
              onChange={(e) => updateDetail('nbPrises', e.target.value)}
              className="input-field"
              placeholder="Ex: 12"
            />
          </div>
        </div>

        <div>
          <Label className="text-white mb-3 block">Accessibilité des gaines</Label>
          <div className="choices-grid-3">
            {[
              { value: 'apparentes', emoji: '✅', label: 'Apparentes / sous plinthes' },
              { value: 'encastrees', emoji: '⚠️', label: 'Encastrées (saignées nécessaires)' },
              { value: 'sous-dalle', emoji: '❌', label: 'Sous dalle ou combles difficiles' }
            ].map((option) => (
              <div
                key={option.value}
                className={`choice-card ${details.accessibiliteGaines === option.value ? 'selected' : ''}`}
                onClick={() => updateDetail('accessibiliteGaines', option.value)}
              >
                <span className="choice-card-emoji">{option.emoji}</span>
                <span>{option.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <Label className="text-white mb-3 block">Présence d'amiante possible dans les gaines ?</Label>
          <div className="choices-grid-3">
            {[
              { value: 'non', label: 'Non' },
              { value: 'possible', label: 'Possible' },
              { value: 'oui', label: 'Oui — diagnostic effectué' }
            ].map((option) => (
              <div
                key={option.value}
                className={`choice-card ${details.amiante === option.value ? 'selected' : ''}`}
                onClick={() => updateDetail('amiante', option.value)}
              >
                <span>{option.label}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-white/50 mt-2">Peut impacter le coût et les délais</p>
        </div>
      </div>
    );
  };

  // Fonctions simplifiées pour les autres métiers
  const renderPeintreFields = (details: any, updateDetail: (key: string, value: any) => void) => {
    const surfaces = ['murs', 'plafonds', 'boiseries', 'facade', 'portail'];
    const surfaceLabels: Record<string, string> = {
      'murs': 'Murs',
      'plafonds': 'Plafonds',
      'boiseries': 'Boiseries / menuiseries intérieures',
      'facade': 'Façade extérieure',
      'portail': 'Portail / clôture'
    };

    return (
      <div className="space-y-6">
        <div>
          <Label className="text-white mb-3 block">Surfaces concernées</Label>
          <div className="space-y-2">
            {surfaces.map((surf) => (
              <div
                key={surf}
                className={`checkbox-card ${details.surfaces?.includes(surf) ? 'checked' : ''}`}
                onClick={() => {
                  const current = details.surfaces || [];
                  const newValue = current.includes(surf) ? current.filter((v: string) => v !== surf) : [...current, surf];
                  updateDetail('surfaces', newValue);
                }}
              >
                <div className="checkbox-indicator" />
                <span>{surfaceLabels[surf]}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <Label className="text-white mb-3 block">État actuel des surfaces</Label>
          <div className="choices-grid-3">
            {[
              { value: 'bon', emoji: '✅', label: 'Bon état (juste une couche de finition)' },
              { value: 'fissures', emoji: '⚠️', label: 'Quelques fissures légères (à reboucher)' },
              { value: 'mauvais', emoji: '🔴', label: 'Mauvais état (fissures importantes, décollements)' }
            ].map((option) => (
              <div
                key={option.value}
                className={`choice-card ${details.etatSurfaces === option.value ? 'selected' : ''}`}
                onClick={() => updateDetail('etatSurfaces', option.value)}
              >
                <span className="choice-card-emoji">{option.emoji}</span>
                <span>{option.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-white mb-2 block">Nombre de couches prévues</Label>
            <Select value={details.nbCouches || ''} onValueChange={(value) => updateDetail('nbCouches', value)}>
              <SelectTrigger className="input-field">
                <SelectValue placeholder="Sélectionner..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 couche</SelectItem>
                <SelectItem value="2">2 couches</SelectItem>
                <SelectItem value="3">3 couches ou plus</SelectItem>
                <SelectItem value="a-definir">À définir avec l'artisan</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-white mb-2 block">Hauteur sous plafond</Label>
            <Select value={details.hauteurPlafond || ''} onValueChange={(value) => updateDetail('hauteurPlafond', value)}>
              <SelectTrigger className="input-field">
                <SelectValue placeholder="Sélectionner..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">Standard (moins de 2,70m)</SelectItem>
                <SelectItem value="haute">Haute (2,70m à 3,50m)</SelectItem>
                <SelectItem value="tres-haute">Très haute (plus de 3,50m)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <Label className="text-white mb-2 block">Type de finition souhaitée</Label>
          <Select value={details.typeFinition || ''} onValueChange={(value) => updateDetail('typeFinition', value)}>
            <SelectTrigger className="input-field">
              <SelectValue placeholder="Sélectionner..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mat">Mat</SelectItem>
              <SelectItem value="satin">Satin</SelectItem>
              <SelectItem value="brillant">Brillant</SelectItem>
              <SelectItem value="velours">Velours</SelectItem>
              <SelectItem value="beton-cire">Béton ciré</SelectItem>
              <SelectItem value="enduit-chaux">Enduit à la chaux</SelectItem>
              <SelectItem value="a-definir">À définir</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-white mb-3 block">Y a-t-il des meubles à protéger / déplacer ?</Label>
          <div className="choices-grid-3">
            {[
              { value: 'vide', label: 'Non — pièce vide' },
              { value: 'quelques', label: 'Oui — quelques meubles' },
              { value: 'entierement', label: 'Oui — pièce meublée entièrement' }
            ].map((option) => (
              <div
                key={option.value}
                className={`choice-card ${details.mobilier === option.value ? 'selected' : ''}`}
                onClick={() => updateDetail('mobilier', option.value)}
              >
                <span>{option.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderCarreleurFields = (details: any, updateDetail: (key: string, value: any) => void) => {
    const travaux = ['pose-sol', 'pose-mural', 'depose-ancien', 'renovation-joints', 'reparation-carreaux'];
    const travauxLabels: Record<string, string> = {
      'pose-sol': 'Pose de carrelage sol',
      'pose-mural': 'Pose de carrelage mural / faïence',
      'depose-ancien': 'Dépose de l\'ancien carrelage',
      'renovation-joints': 'Rénovation joints uniquement',
      'reparation-carreaux': 'Réparation carreaux cassés'
    };

    return (
      <div className="space-y-6">
        <div>
          <Label className="text-white mb-3 block">Type de travaux carrelage</Label>
          <div className="space-y-2">
            {travaux.map((trav) => (
              <div
                key={trav}
                className={`checkbox-card ${details.typeTravaux?.includes(trav) ? 'checked' : ''}`}
                onClick={() => {
                  const current = details.typeTravaux || [];
                  const newValue = current.includes(trav) ? current.filter((v: string) => v !== trav) : [...current, trav];
                  updateDetail('typeTravaux', newValue);
                }}
              >
                <div className="checkbox-indicator" />
                <span>{travauxLabels[trav]}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <Label className="text-white mb-3 block">Faut-il déposer l'ancien revêtement ?</Label>
          <div className="choices-grid-3">
            {[
              { value: 'non', label: 'Non — pose directe' },
              { value: 'oui', label: 'Oui — dépose + évacuation' },
              { value: 'incertain', label: 'Incertain' }
            ].map((option) => (
              <div
                key={option.value}
                className={`choice-card ${details.deposeExistant === option.value ? 'selected' : ''}`}
                onClick={() => updateDetail('deposeExistant', option.value)}
              >
                <span>{option.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <Label className="text-white mb-3 block">Le sol nécessite-t-il un ragréage ?</Label>
          <div className="choices-grid-2">
            {[
              { value: 'non', label: 'Non — sol plan' },
              { value: 'legere', label: 'Oui — légère irrégularité' },
              { value: 'irregulier', label: 'Oui — sol très irrégulier' },
              { value: 'a-evaluer', label: 'À évaluer' }
            ].map((option) => (
              <div
                key={option.value}
                className={`choice-card ${details.ragreage === option.value ? 'selected' : ''}`}
                onClick={() => updateDetail('ragreage', option.value)}
              >
                <span>{option.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <Label className="text-white mb-3 block">Complexité de la pièce</Label>
          <div className="choices-grid-3">
            {[
              { value: 'simple', emoji: '✅', label: 'Simple (rectangulaire, sans obstacle)' },
              { value: 'moyenne', emoji: '⚠️', label: 'Moyenne (quelques angles, colonnes)' },
              { value: 'complexe', emoji: '🔴', label: 'Complexe (formes arrondies, nombreuses découpes)' }
            ].map((option) => (
              <div
                key={option.value}
                className={`choice-card ${details.complexite === option.value ? 'selected' : ''}`}
                onClick={() => updateDetail('complexite', option.value)}
              >
                <span className="choice-card-emoji">{option.emoji}</span>
                <span>{option.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-white mb-2 block">Type de joint souhaité</Label>
            <Select value={details.typeJoint || ''} onValueChange={(value) => updateDetail('typeJoint', value)}>
              <SelectTrigger className="input-field">
                <SelectValue placeholder="Sélectionner..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">Joint standard (ciment)</SelectItem>
                <SelectItem value="epoxy">Joint époxy (plus résistant)</SelectItem>
                <SelectItem value="a-definir">À définir</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-white mb-2 block">Format des carreaux</Label>
            <Select value={details.formatCarreaux || ''} onValueChange={(value) => updateDetail('formatCarreaux', value)}>
              <SelectTrigger className="input-field">
                <SelectValue placeholder="Sélectionner..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="petit">Petit format (moins de 30x30)</SelectItem>
                <SelectItem value="moyen">Moyen (30x30 à 60x60)</SelectItem>
                <SelectItem value="grand">Grand format (60x60 à 120x120)</SelectItem>
                <SelectItem value="tres-grand">Très grand (plus de 120x120)</SelectItem>
                <SelectItem value="non-defini">Non défini</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    );
  };

  const renderMaconFields = (details: any, updateDetail: (key: string, value: any) => void) => {
    const travaux = [
      'construction-murs',
      'demolition',
      'creation-ouverture',
      'reprise-sous-oeuvre',
      'dallage-chape',
      'ravalement-facade',
      'reparation-fissures'
    ];
    const travauxLabels: Record<string, string> = {
      'construction-murs': 'Construction murs / cloisons',
      'demolition': 'Démolition',
      'creation-ouverture': 'Création d\'ouverture (porte, fenêtre)',
      'reprise-sous-oeuvre': 'Reprise en sous-œuvre / fondations',
      'dallage-chape': 'Dallage / chape',
      'ravalement-facade': 'Ravalement de façade',
      'reparation-fissures': 'Réparation fissures structure'
    };

    return (
      <div className="space-y-6">
        <div>
          <Label className="text-white mb-3 block">Nature des travaux</Label>
          <div className="space-y-2">
            {travaux.map((trav) => (
              <div
                key={trav}
                className={`checkbox-card ${details.typeTravaux?.includes(trav) ? 'checked' : ''}`}
                onClick={() => {
                  const current = details.typeTravaux || [];
                  const newValue = current.includes(trav) ? current.filter((v: string) => v !== trav) : [...current, trav];
                  updateDetail('typeTravaux', newValue);
                }}
              >
                <div className="checkbox-indicator" />
                <span>{travauxLabels[trav]}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <Label className="text-white mb-2 block">Matériau de construction</Label>
          <Select value={details.typeStructure || ''} onValueChange={(value) => updateDetail('typeStructure', value)}>
            <SelectTrigger className="input-field">
              <SelectValue placeholder="Sélectionner..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="parpaing">Parpaing</SelectItem>
              <SelectItem value="brique">Brique</SelectItem>
              <SelectItem value="pierre">Pierre</SelectItem>
              <SelectItem value="beton-banche">Béton banché</SelectItem>
              <SelectItem value="bois">Bois</SelectItem>
              <SelectItem value="mixte">Mixte</SelectItem>
              <SelectItem value="inconnu">Inconnu</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-white mb-3 block">Y a-t-il de la démolition ?</Label>
          <div className="choices-grid-3">
            {[
              { value: 'non', label: 'Non' },
              { value: 'legere', label: 'Oui — légère' },
              { value: 'importante', label: 'Oui — importante (évacuation gravats incluse)' }
            ].map((option) => (
              <div
                key={option.value}
                className={`choice-card ${details.demolition === option.value ? 'selected' : ''}`}
                onClick={() => updateDetail('demolition', option.value)}
              >
                <span>{option.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <Label className="text-white mb-3 block">Les fondations sont-elles concernées ?</Label>
          <div className="choices-grid-3">
            {[
              { value: 'non', label: 'Non' },
              { value: 'oui', label: 'Oui' },
              { value: 'incertain', label: 'Incertain — expertise nécessaire' }
            ].map((option) => (
              <div
                key={option.value}
                className={`choice-card ${details.fondations === option.value ? 'selected' : ''}`}
                onClick={() => updateDetail('fondations', option.value)}
              >
                <span>{option.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <Label className="text-white mb-2 block">À quel niveau se situent les travaux ?</Label>
          <Select value={details.niveau || ''} onValueChange={(value) => updateDetail('niveau', value)}>
            <SelectTrigger className="input-field">
              <SelectValue placeholder="Sélectionner..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sous-sol">Sous-sol</SelectItem>
              <SelectItem value="rdc">Rez-de-chaussée</SelectItem>
              <SelectItem value="1er-etage">1er étage</SelectItem>
              <SelectItem value="2eme-etage">2ème étage ou plus</SelectItem>
              <SelectItem value="toiture">Toiture / combles</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    );
  };

  const renderCouvreurFields = (details: any, updateDetail: (key: string, value: any) => void) => {
    const travaux = [
      'refection-complete',
      'reparation-partielle',
      'remplacement-charpente',
      'traitement-nettoyage',
      'pose-velux',
      'isolation-combles',
      'gouttieres'
    ];
    const travauxLabels: Record<string, string> = {
      'refection-complete': 'Réfection complète de toiture',
      'reparation-partielle': 'Réparation partielle (tuiles cassées, fuite)',
      'remplacement-charpente': 'Remplacement de charpente',
      'traitement-nettoyage': 'Traitement / nettoyage de toiture',
      'pose-velux': 'Pose de fenêtres de toit (Velux)',
      'isolation-combles': 'Isolation des combles par l\'intérieur',
      'gouttieres': 'Gouttières / évacuations'
    };

    return (
      <div className="space-y-6">
        <div>
          <Label className="text-white mb-3 block">Nature des travaux</Label>
          <div className="space-y-2">
            {travaux.map((trav) => (
              <div
                key={trav}
                className={`checkbox-card ${details.typeTravaux?.includes(trav) ? 'checked' : ''}`}
                onClick={() => {
                  const current = details.typeTravaux || [];
                  const newValue = current.includes(trav) ? current.filter((v: string) => v !== trav) : [...current, trav];
                  updateDetail('typeTravaux', newValue);
                }}
              >
                <div className="checkbox-indicator" />
                <span>{travauxLabels[trav]}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <Label className="text-white mb-2 block">Matériau de couverture actuel ou souhaité</Label>
          <Select value={details.typeCouverture || ''} onValueChange={(value) => updateDetail('typeCouverture', value)}>
            <SelectTrigger className="input-field">
              <SelectValue placeholder="Sélectionner..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tuiles-terre-cuite">Tuiles terre cuite</SelectItem>
              <SelectItem value="tuiles-beton">Tuiles béton</SelectItem>
              <SelectItem value="ardoises-naturelles">Ardoises naturelles</SelectItem>
              <SelectItem value="ardoises-fibrociment">Ardoises fibrociment</SelectItem>
              <SelectItem value="bac-acier">Bac acier</SelectItem>
              <SelectItem value="zinc">Zinc</SelectItem>
              <SelectItem value="shingle">Shingle</SelectItem>
              <SelectItem value="membrane-bitumineuse">Membrane bitumineuse</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-white mb-3 block">Pente approximative du toit</Label>
          <div className="choices-grid-2">
            {[
              { value: 'faible', label: 'Faible (moins de 15°)' },
              { value: 'moyenne', label: 'Moyenne (15° à 35°)' },
              { value: 'forte', label: 'Forte (plus de 35°)' },
              { value: 'plat', label: 'Toit plat' }
            ].map((option) => (
              <div
                key={option.value}
                className={`choice-card ${details.penteToit === option.value ? 'selected' : ''}`}
                onClick={() => updateDetail('penteToit', option.value)}
              >
                <span>{option.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <Label className="text-white mb-3 block">Y a-t-il des fenêtres de toit ?</Label>
          <div className="space-y-3">
            <div className="choices-grid-2">
              {[
                { value: 'non', label: 'Non' },
                { value: 'oui', label: 'Oui' }
              ].map((option) => (
                <div
                  key={option.value}
                  className={`choice-card ${details.fenetresToit === option.value ? 'selected' : ''}`}
                  onClick={() => updateDetail('fenetresToit', option.value)}
                >
                  <span>{option.label}</span>
                </div>
              ))}
            </div>
            {details.fenetresToit === 'oui' && (
              <div>
                <Label className="text-white mb-2 block">Combien ?</Label>
                <Input
                  type="number"
                  min="1"
                  value={details.nbFenetresToit || ''}
                  onChange={(e) => updateDetail('nbFenetresToit', e.target.value)}
                  className="input-field"
                  placeholder="Ex: 2"
                />
              </div>
            )}
          </div>
        </div>
        <div>
          <Label className="text-white mb-3 block">La charpente est-elle à traiter ou remplacer ?</Label>
          <div className="choices-grid-2">
            {[
              { value: 'bon-etat', label: 'Non — bon état' },
              { value: 'traitement', label: 'Traitement préventif uniquement' },
              { value: 'remplacement-partiel', label: 'Remplacement partiel' },
              { value: 'remplacement-total', label: 'Remplacement total' },
              { value: 'a-evaluer', label: 'À évaluer' }
            ].map((option) => (
              <div
                key={option.value}
                className={`choice-card ${details.charpente === option.value ? 'selected' : ''}`}
                onClick={() => updateDetail('charpente', option.value)}
              >
                <span>{option.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderMenuisierFields = (details: any, updateDetail: (key: string, value: any) => void) => {
    const elements = [
      'fenetres',
      'portes-interieures',
      'portes-exterieures',
      'volets',
      'portail',
      'garde-corps',
      'dressing',
      'cuisine'
    ];
    const elementLabels: Record<string, string> = {
      'fenetres': 'Fenêtres',
      'portes-interieures': 'Portes intérieures',
      'portes-exterieures': 'Portes extérieures / porte d\'entrée',
      'volets': 'Volets',
      'portail': 'Portail',
      'garde-corps': 'Garde-corps / escalier',
      'dressing': 'Dressing / placard sur mesure',
      'cuisine': 'Cuisine / agencement'
    };

    return (
      <div className="space-y-6">
        <div>
          <Label className="text-white mb-3 block">Type d'éléments concernés</Label>
          <div className="space-y-2">
            {elements.map((elem) => (
              <div
                key={elem}
                className={`checkbox-card ${details.elements?.includes(elem) ? 'checked' : ''}`}
                onClick={() => {
                  const current = details.elements || [];
                  const newValue = current.includes(elem) ? current.filter((v: string) => v !== elem) : [...current, elem];
                  updateDetail('elements', newValue);
                }}
              >
                <div className="checkbox-indicator" />
                <span>{elementLabels[elem]}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <Label className="text-white mb-2 block">Matériau</Label>
          <Select value={details.materiau || ''} onValueChange={(value) => updateDetail('materiau', value)}>
            <SelectTrigger className="input-field">
              <SelectValue placeholder="Sélectionner..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bois">Bois</SelectItem>
              <SelectItem value="aluminium">Aluminium</SelectItem>
              <SelectItem value="pvc">PVC</SelectItem>
              <SelectItem value="mixte">Mixte bois-alu</SelectItem>
              <SelectItem value="acier">Acier</SelectItem>
              <SelectItem value="a-definir">À définir</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-white mb-3 block">Dépose de l'existant ?</Label>
          <div className="choices-grid-3">
            {[
              { value: 'non', label: 'Non — pose neuve' },
              { value: 'oui', label: 'Oui — dépose incluse' },
              { value: 'a-evaluer', label: 'À évaluer' }
            ].map((option) => (
              <div
                key={option.value}
                className={`choice-card ${details.deposeExistant === option.value ? 'selected' : ''}`}
                onClick={() => updateDetail('deposeExistant', option.value)}
              >
                <span>{option.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <Label className="text-white mb-2 block">Nombre d'éléments à poser / remplacer</Label>
          <Input
            type="number"
            min="1"
            value={details.nbElements || ''}
            onChange={(e) => updateDetail('nbElements', e.target.value)}
            className="input-field"
            placeholder="Ex: 4 fenêtres"
          />
        </div>
        <div>
          <Label className="text-white mb-2 block">Type de vitrage (si applicable)</Label>
          <Select value={details.vitrage || ''} onValueChange={(value) => updateDetail('vitrage', value)}>
            <SelectTrigger className="input-field">
              <SelectValue placeholder="Sélectionner..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="simple">Simple vitrage</SelectItem>
              <SelectItem value="double">Double vitrage</SelectItem>
              <SelectItem value="triple">Triple vitrage</SelectItem>
              <SelectItem value="feuillete">Vitrage feuilleté</SelectItem>
              <SelectItem value="na">N/A</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    );
  };

  const renderPaysagisteFields = (details: any, updateDetail: (key: string, value: any) => void) => {
    const travaux = [
      'creation-jardin',
      'entretien-regulier',
      'elagage-abattage',
      'creation-pelouse',
      'cloture-portail',
      'terrasse-allee',
      'bassins-fontaines',
      'arrosage-automatique',
      'plantation-massifs'
    ];
    const travauxLabels: Record<string, string> = {
      'creation-jardin': 'Création d\'un jardin complet',
      'entretien-regulier': 'Entretien régulier',
      'elagage-abattage': 'Élagage / abattage',
      'creation-pelouse': 'Création pelouse / gazon',
      'cloture-portail': 'Pose de clôture / portail',
      'terrasse-allee': 'Terrasse / allée',
      'bassins-fontaines': 'Bassins / fontaines',
      'arrosage-automatique': 'Arrosage automatique',
      'plantation-massifs': 'Plantation / massifs'
    };

    return (
      <div className="space-y-6">
        <div>
          <Label className="text-white mb-3 block">Nature des travaux</Label>
          <div className="space-y-2">
            {travaux.map((trav) => (
              <div
                key={trav}
                className={`checkbox-card ${details.typeTravaux?.includes(trav) ? 'checked' : ''}`}
                onClick={() => {
                  const current = details.typeTravaux || [];
                  const newValue = current.includes(trav) ? current.filter((v: string) => v !== trav) : [...current, trav];
                  updateDetail('typeTravaux', newValue);
                }}
              >
                <div className="checkbox-indicator" />
                <span>{travauxLabels[trav]}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <Label className="text-white mb-3 block">État actuel</Label>
          <div className="choices-grid-2">
            {[
              { value: 'vierge', emoji: '🌱', label: 'Terrain vierge / propre' },
              { value: 'quelques-vegetaux', emoji: '🌿', label: 'Quelques végétaux à conserver' },
              { value: 'vegetation-dense', emoji: '🌳', label: 'Végétation dense à débroussailler' },
              { value: 'accidente', emoji: '🪨', label: 'Terrain accidenté / rocheux' }
            ].map((option) => (
              <div
                key={option.value}
                className={`choice-card ${details.etatTerrain === option.value ? 'selected' : ''}`}
                onClick={() => updateDetail('etatTerrain', option.value)}
              >
                <span className="choice-card-emoji">{option.emoji}</span>
                <span>{option.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <Label className="text-white mb-2 block">Type de sol</Label>
          <Select value={details.typeSol || ''} onValueChange={(value) => updateDetail('typeSol', value)}>
            <SelectTrigger className="input-field">
              <SelectValue placeholder="Sélectionner..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="standard">Terre standard</SelectItem>
              <SelectItem value="argileux">Argileux</SelectItem>
              <SelectItem value="sableux">Sableux</SelectItem>
              <SelectItem value="rocheux">Rocheux</SelectItem>
              <SelectItem value="remblai">Remblai</SelectItem>
              <SelectItem value="inconnu">Inconnu</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-white mb-3 block">Accès possible pour engins de chantier ?</Label>
          <div className="choices-grid-3">
            {[
              { value: 'large', label: 'Oui — large accès' },
              { value: 'limite', label: 'Oui — accès limité' },
              { value: 'manuel', label: 'Non — travail manuel uniquement' }
            ].map((option) => (
              <div
                key={option.value}
                className={`choice-card ${details.accesEngins === option.value ? 'selected' : ''}`}
                onClick={() => updateDetail('accesEngins', option.value)}
              >
                <span>{option.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Fonction pour rendre le questionnaire dynamique selon le métier
  const renderQuestionnaireMetier = () => {
    if (!selectedMetier) return null;

    const updateReponse = (key: string, value: any) => {
      setReponsesMetier({ ...reponsesMetier, [key]: value });
    };

    const getReponse = (key: string) => reponsesMetier[key] || '';

    // Mapping des métiers vers leurs questionnaires
    const metiersConfig: Record<string, any> = {
      plombier: {
        titre: 'Décrivez votre intervention plomberie',
        questions: [
          {
            id: 'sujetPhoto',
            label: 'Qu\'est-ce que montre la photo ?',
            type: 'choice',
            options: [
              { value: 'salle-bain', emoji: '🚿', label: 'Salle de bain / douche à rénover' },
              { value: 'evier', emoji: '🚰', label: 'Évier / robinetterie' },
              { value: 'canalisation', emoji: '🪠', label: 'Canalisation / tuyauterie' },
              { value: 'wc', emoji: '🚽', label: 'WC / sanitaires' },
              { value: 'chaudiere', emoji: '🌡️', label: 'Chaudière / chauffe-eau' },
              { value: 'fuite', emoji: '💧', label: 'Fuite / dégât des eaux' },
              { value: 'installation-neuve', emoji: '📦', label: 'Installation neuve (pas encore posée)' },
              { value: 'autre', emoji: '🔧', label: 'Autre' }
            ]
          },
          {
            id: 'typeIntervention',
            label: 'Type d\'intervention',
            type: 'choice',
            options: [
              { value: 'neuve', emoji: '🆕', label: 'Installation neuve' },
              { value: 'remplacement', emoji: '🔄', label: 'Remplacement / rénovation' },
              { value: 'reparation', emoji: '🔧', label: 'Réparation / dépannage' },
              { value: 'detection', emoji: '🔍', label: 'Détection de fuite' }
            ]
          },
          {
            id: 'elementsConcernes',
            label: 'Qu\'est-ce qui est concerné ? (plusieurs choix possibles)',
            type: 'checkbox',
            options: [
              { value: 'robinetterie', label: 'Robinetterie' },
              { value: 'canalisations', label: 'Canalisations / tuyaux' },
              { value: 'chauffe-eau', label: 'Chauffe-eau / ballon' },
              { value: 'wc', label: 'WC / mécanisme de chasse' },
              { value: 'douche', label: 'Douche / baignoire' },
              { value: 'evier', label: 'Évier / vasque' },
              { value: 'joints', label: 'Joints / étanchéité' },
              { value: 'compteur', label: 'Compteur / arrivée d\'eau' }
            ]
          },
          {
            id: 'accessibilite',
            label: 'Accessibilité des canalisations',
            type: 'choice',
            options: [
              { value: 'apparentes', emoji: '✅', label: 'Apparentes (visibles directement)' },
              { value: 'encastrees', emoji: '⚠️', label: 'Encastrées dans les murs' },
              { value: 'sous-dalle', emoji: '❌', label: 'Sous dalle béton' }
            ]
          },
          {
            id: 'tuyauterie',
            label: 'Tuyauterie existante',
            type: 'select',
            options: [
              { value: 'cuivre', label: 'Cuivre' },
              { value: 'pvc', label: 'PVC' },
              { value: 'plomb', label: 'Plomb' },
              { value: 'multicouche', label: 'Multicouche' },
              { value: 'inconnue', label: 'Inconnue' },
              { value: 'na', label: 'N/A — installation neuve' }
            ]
          },
          {
            id: 'nbPointsEau',
            label: 'Nombre de points d\'eau concernés',
            type: 'number',
            placeholder: 'Ex : 3'
          }
        ]
      },
      electricien: {
        titre: 'Décrivez votre intervention électrique',
        questions: [
          {
            id: 'sujetPhoto',
            label: 'Qu\'est-ce que montre la photo ?',
            type: 'choice',
            options: [
              { value: 'tableau', emoji: '🔌', label: 'Tableau électrique' },
              { value: 'points-lumineux', emoji: '💡', label: 'Points lumineux / plafonniers' },
              { value: 'prises', emoji: '🔋', label: 'Prises / interrupteurs' },
              { value: 'installation-generale', emoji: '🏠', label: 'Installation générale d\'un logement' },
              { value: 'panneaux-solaires', emoji: '☀️', label: 'Panneaux solaires / borne de recharge' },
              { value: 'alarme', emoji: '🔒', label: 'Alarme / domotique / vidéosurveillance' },
              { value: 'panne', emoji: '💥', label: 'Panne / dépannage électrique' },
              { value: 'installation-neuve', emoji: '📦', label: 'Installation neuve' }
            ]
          },
          {
            id: 'typeIntervention',
            label: 'Type d\'intervention',
            type: 'choice',
            options: [
              { value: 'neuve-complete', emoji: '🆕', label: 'Installation neuve complète' },
              { value: 'mise-aux-normes', emoji: '📋', label: 'Mise aux normes NFC 15-100' },
              { value: 'extension', emoji: '➕', label: 'Extension du réseau existant' },
              { value: 'remplacement-tableau', emoji: '🔄', label: 'Remplacement tableau' },
              { value: 'depannage', emoji: '🔧', label: 'Dépannage ponctuel' }
            ]
          },
          {
            id: 'elementsConcernes',
            label: 'Éléments concernés (plusieurs choix possibles)',
            type: 'checkbox',
            options: [
              { value: 'tableau', label: 'Tableau électrique' },
              { value: 'disjoncteurs', label: 'Disjoncteurs / protections' },
              { value: 'prises', label: 'Prises de courant' },
              { value: 'interrupteurs', label: 'Interrupteurs' },
              { value: 'points-lumineux', label: 'Points lumineux' },
              { value: 'cablage', label: 'Câblage / gaines' },
              { value: 'vmc', label: 'VMC / ventilation' },
              { value: 'borne-recharge', label: 'Borne de recharge véhicule' },
              { value: 'panneaux-photovoltaiques', label: 'Panneaux photovoltaïques' }
            ]
          },
          {
            id: 'accessibilite',
            label: 'Accessibilité des gaines',
            type: 'choice',
            options: [
              { value: 'apparentes', emoji: '✅', label: 'Apparentes / sous plinthes' },
              { value: 'encastrees', emoji: '⚠️', label: 'Encastrées (saignées nécessaires)' },
              { value: 'sous-dalle', emoji: '❌', label: 'Sous dalle / combles difficiles' }
            ]
          },
          {
            id: 'amiante',
            label: 'Présence d\'amiante possible ?',
            type: 'choice',
            options: [
              { value: 'non', emoji: '✅', label: 'Non' },
              { value: 'possible', emoji: '⚠️', label: 'Possible (bâtiment avant 1997)' },
              { value: 'oui', emoji: '🔴', label: 'Oui — diagnostic effectué' }
            ]
          },
          {
            id: 'nbPrises',
            label: 'Nombre de prises',
            type: 'number',
            placeholder: 'Ex : 12'
          },
          {
            id: 'nbPointsLumineux',
            label: 'Nombre de points lumineux',
            type: 'number',
            placeholder: 'Ex : 8'
          }
        ]
      },
      carreleur: {
        titre: 'Décrivez votre intervention carrelage',
        questions: [
          {
            id: 'sujetPhoto',
            label: 'Qu\'est-ce que montre la photo ?',
            type: 'choice',
            options: [
              { value: 'salle-bain', emoji: '🛁', label: 'Salle de bain' },
              { value: 'cuisine', emoji: '🍳', label: 'Cuisine' },
              { value: 'piece-vivre', emoji: '🏠', label: 'Pièce à vivre / couloir' },
              { value: 'terrasse', emoji: '🌿', label: 'Terrasse / extérieur' },
              { value: 'carrelage-mural', emoji: '🔲', label: 'Carrelage mural uniquement' },
              { value: 'carrelage-abime', emoji: '💥', label: 'Carrelage abîmé / cassé à réparer' }
            ]
          },
          {
            id: 'typeTravaux',
            label: 'Type de travaux',
            type: 'checkbox',
            options: [
              { value: 'pose-sol', label: 'Pose carrelage sol' },
              { value: 'pose-mural', label: 'Pose carrelage mural / faïence' },
              { value: 'depose-ancien', label: 'Dépose de l\'ancien carrelage' },
              { value: 'renovation-joints', label: 'Rénovation joints uniquement' },
              { value: 'reparation-carreaux', label: 'Réparation carreaux cassés' }
            ]
          },
          {
            id: 'deposeExistant',
            label: 'Dépose de l\'existant nécessaire ?',
            type: 'choice',
            options: [
              { value: 'non', emoji: '✅', label: 'Non — pose sur existant' },
              { value: 'oui', emoji: '🔨', label: 'Oui — dépose + évacuation' },
              { value: 'a-evaluer', emoji: '❓', label: 'À évaluer' }
            ]
          },
          {
            id: 'etatSupport',
            label: 'État du support',
            type: 'choice',
            options: [
              { value: 'plan', emoji: '✅', label: 'Plan et propre' },
              { value: 'irregularites-legeres', emoji: '⚠️', label: 'Quelques irrégularités (ragréage léger)' },
              { value: 'tres-irregulier', emoji: '🔴', label: 'Très irrégulier (ragréage important)' }
            ]
          },
          {
            id: 'complexite',
            label: 'Complexité de la pièce',
            type: 'choice',
            options: [
              { value: 'simple', emoji: '✅', label: 'Simple — rectangulaire, sans obstacle' },
              { value: 'moyenne', emoji: '⚠️', label: 'Moyenne — quelques angles, colonnes' },
              { value: 'complexe', emoji: '🔴', label: 'Complexe — formes arrondies, nombreuses découpes' }
            ]
          },
          {
            id: 'formatCarreaux',
            label: 'Format des carreaux',
            type: 'choice',
            options: [
              { value: 'petit', label: 'Petit (< 30x30)' },
              { value: 'moyen', label: 'Moyen (30–60cm)' },
              { value: 'grand', label: 'Grand (60–120cm)' },
              { value: 'tres-grand', label: 'Très grand (> 120cm)' },
              { value: 'non-defini', label: 'Non défini' }
            ]
          },
          {
            id: 'surface',
            label: 'Surface approximative',
            type: 'number',
            placeholder: 'Ex : 15',
            note: 'Estimation approximative, l\'artisan confirmera sur place'
          }
        ]
      },
      peintre: {
        titre: 'Décrivez votre chantier peinture',
        questions: [
          {
            id: 'sujetPhoto',
            label: 'Qu\'est-ce que montre la photo ?',
            type: 'choice',
            options: [
              { value: 'piece-interieure', emoji: '🏠', label: 'Pièce intérieure à peindre' },
              { value: 'boiseries', emoji: '🪟', label: 'Boiseries / menuiseries' },
              { value: 'facade', emoji: '🏚️', label: 'Façade extérieure' },
              { value: 'murs-fissures', emoji: '🧱', label: 'Murs avec fissures / dégradations' },
              { value: 'decoration', emoji: '🎨', label: 'Décoration / finition spéciale' },
              { value: 'chantier-neuf', emoji: '🏗️', label: 'Chantier neuf (murs bruts)' }
            ]
          },
          {
            id: 'surfacesConcernes',
            label: 'Surfaces concernées (plusieurs choix possibles)',
            type: 'checkbox',
            options: [
              { value: 'murs', label: 'Murs' },
              { value: 'plafonds', label: 'Plafonds' },
              { value: 'boiseries-interieures', label: 'Boiseries intérieures' },
              { value: 'facade-exterieure', label: 'Façade extérieure' },
              { value: 'portail', label: 'Portail / clôture / volets' }
            ]
          },
          {
            id: 'etatSurfaces',
            label: 'État des surfaces',
            type: 'choice',
            options: [
              { value: 'bon', emoji: '✅', label: 'Bon état — juste une couche de finition' },
              { value: 'fissures-legeres', emoji: '⚠️', label: 'Fissures légères à reboucher' },
              { value: 'mauvais', emoji: '🔴', label: 'Mauvais état — à repiquer sérieusement' }
            ]
          },
          {
            id: 'pieceMeublee',
            label: 'Pièce meublée ?',
            type: 'choice',
            options: [
              { value: 'non', emoji: '✅', label: 'Non — pièce vide' },
              { value: 'quelques', emoji: '⚠️', label: 'Quelques meubles à protéger' },
              { value: 'entiere', emoji: '🔴', label: 'Pièce entièrement meublée' }
            ]
          },
          {
            id: 'hauteurPlafond',
            label: 'Hauteur sous plafond',
            type: 'choice',
            options: [
              { value: 'standard', label: 'Standard (< 2,70m)' },
              { value: 'haute', label: 'Haute (2,70–3,50m)' },
              { value: 'tres-haute', label: 'Très haute (> 3,50m)' }
            ]
          },
          {
            id: 'finition',
            label: 'Finition souhaitée',
            type: 'select',
            options: [
              { value: 'mat', label: 'Mat' },
              { value: 'satin', label: 'Satin' },
              { value: 'brillant', label: 'Brillant' },
              { value: 'velours', label: 'Velours' },
              { value: 'beton-cire', label: 'Béton ciré' },
              { value: 'enduit-chaux', label: 'Enduit à la chaux' },
              { value: 'a-definir', label: 'À définir' }
            ]
          },
          {
            id: 'surface',
            label: 'Surface murale en m²',
            type: 'number',
            placeholder: 'Ex : 60'
          }
        ]
      },
      macon: {
        titre: 'Décrivez vos travaux de maçonnerie',
        questions: [
          {
            id: 'sujetPhoto',
            label: 'Qu\'est-ce que montre la photo ?',
            type: 'choice',
            options: [
              { value: 'mur-cloison', emoji: '🧱', label: 'Mur / cloison à construire ou démolir' },
              { value: 'ouverture', emoji: '🚪', label: 'Ouverture à créer (porte / fenêtre)' },
              { value: 'fondations', emoji: '🏗️', label: 'Fondations / sous-œuvre' },
              { value: 'dallage', emoji: '🔲', label: 'Dallage / chape' },
              { value: 'facade', emoji: '🏚️', label: 'Façade / ravalement' },
              { value: 'fissures', emoji: '💥', label: 'Fissures / désordres structurels' },
              { value: 'escalier', emoji: '🪜', label: 'Escalier béton' }
            ]
          },
          {
            id: 'typeTravaux',
            label: 'Type de travaux (plusieurs choix possibles)',
            type: 'checkbox',
            options: [
              { value: 'construction-murs', label: 'Construction murs / cloisons' },
              { value: 'demolition', label: 'Démolition' },
              { value: 'creation-ouverture', label: 'Création d\'ouverture' },
              { value: 'reprise-fondations', label: 'Reprise fondations' },
              { value: 'dallage-chape', label: 'Dallage / chape béton' },
              { value: 'ravalement-facade', label: 'Ravalement de façade' },
              { value: 'reparation-fissures', label: 'Réparation fissures' }
            ]
          },
          {
            id: 'materiau',
            label: 'Matériau de construction',
            type: 'select',
            options: [
              { value: 'parpaing', label: 'Parpaing' },
              { value: 'brique', label: 'Brique' },
              { value: 'pierre', label: 'Pierre' },
              { value: 'beton-banche', label: 'Béton banché' },
              { value: 'mixte', label: 'Mixte' },
              { value: 'inconnu', label: 'Inconnu' }
            ]
          },
          {
            id: 'demolition',
            label: 'Démolition incluse ?',
            type: 'choice',
            options: [
              { value: 'non', emoji: '✅', label: 'Non' },
              { value: 'legere', emoji: '⚠️', label: 'Oui — légère' },
              { value: 'importante', emoji: '🔴', label: 'Oui — importante (gravats à évacuer)' }
            ]
          },
          {
            id: 'fondations',
            label: 'Fondations concernées ?',
            type: 'choice',
            options: [
              { value: 'non', emoji: '✅', label: 'Non' },
              { value: 'oui', emoji: '⚠️', label: 'Oui' },
              { value: 'expertise', emoji: '❓', label: 'Expertise nécessaire' }
            ]
          },
          {
            id: 'niveau',
            label: 'Niveau des travaux',
            type: 'select',
            options: [
              { value: 'sous-sol', label: 'Sous-sol' },
              { value: 'rdc', label: 'Rez-de-chaussée' },
              { value: '1er-etage', label: '1er étage' },
              { value: '2eme-etage-plus', label: '2ème étage ou plus' },
              { value: 'toiture-combles', label: 'Toiture / combles' }
            ]
          },
          {
            id: 'surface',
            label: 'Surface en m²',
            type: 'number',
            placeholder: 'Ex : 25'
          },
          {
            id: 'lineaire',
            label: 'Linéaire en ml',
            type: 'number',
            placeholder: 'Ex : 10'
          }
        ]
      },
      charpentier: {
        titre: 'Décrivez vos travaux de charpente / couverture',
        questions: [
          {
            id: 'sujetPhoto',
            label: 'Qu\'est-ce que montre la photo ?',
            type: 'choice',
            options: [
              { value: 'toiture-complete', emoji: '🏠', label: 'Toiture complète à rénover' },
              { value: 'fuite', emoji: '💧', label: 'Fuite / tuiles cassées' },
              { value: 'charpente-bois', emoji: '🪵', label: 'Charpente bois' },
              { value: 'velux', emoji: '🪟', label: 'Fenêtre de toit (Velux)' },
              { value: 'isolation', emoji: '🌬️', label: 'Isolation combles' },
              { value: 'gouttieres', emoji: '🌧️', label: 'Gouttières / évacuations' },
              { value: 'extension', emoji: '🏗️', label: 'Extension / ossature bois' }
            ]
          },
          {
            id: 'typeTravaux',
            label: 'Type de travaux (plusieurs choix possibles)',
            type: 'checkbox',
            options: [
              { value: 'refection-complete', label: 'Réfection complète toiture' },
              { value: 'reparation-partielle', label: 'Réparation partielle' },
              { value: 'remplacement-charpente', label: 'Remplacement charpente' },
              { value: 'traitement-nettoyage', label: 'Traitement / nettoyage toiture' },
              { value: 'pose-fenetres-toit', label: 'Pose fenêtres de toit' },
              { value: 'isolation-combles', label: 'Isolation des combles' },
              { value: 'gouttieres-evacuations', label: 'Gouttières / évacuations' },
              { value: 'extension-ossature', label: 'Extension ossature bois' }
            ]
          },
          {
            id: 'typeCouverture',
            label: 'Type de couverture',
            type: 'select',
            options: [
              { value: 'tuiles-terre-cuite', label: 'Tuiles terre cuite' },
              { value: 'tuiles-beton', label: 'Tuiles béton' },
              { value: 'ardoises-naturelles', label: 'Ardoises naturelles' },
              { value: 'ardoises-fibrociment', label: 'Ardoises fibrociment' },
              { value: 'bac-acier', label: 'Bac acier' },
              { value: 'zinc', label: 'Zinc' },
              { value: 'shingle', label: 'Shingle' },
              { value: 'toiture-plate', label: 'Toiture plate' }
            ]
          },
          {
            id: 'penteToit',
            label: 'Pente du toit',
            type: 'choice',
            options: [
              { value: 'faible', label: 'Faible (< 15°)' },
              { value: 'moyenne', label: 'Moyenne (15–35°)' },
              { value: 'forte', label: 'Forte (> 35°)' },
              { value: 'plat', label: 'Toit plat' }
            ]
          },
          {
            id: 'charpente',
            label: 'Charpente à traiter ?',
            type: 'choice',
            options: [
              { value: 'bon-etat', emoji: '✅', label: 'Non — bon état' },
              { value: 'traitement', emoji: '🧪', label: 'Traitement préventif uniquement' },
              { value: 'remplacement-partiel', emoji: '🔨', label: 'Remplacement partiel' },
              { value: 'remplacement-total', emoji: '🔴', label: 'Remplacement total' },
              { value: 'a-evaluer', emoji: '❓', label: 'À évaluer' }
            ]
          },
          {
            id: 'surface',
            label: 'Surface de toiture approximative',
            type: 'number',
            placeholder: 'Ex : 120'
          }
        ]
      },
      chauffagiste: {
        titre: 'Décrivez votre intervention chauffage',
        questions: [
          {
            id: 'sujetPhoto',
            label: 'Qu\'est-ce que montre la photo ?',
            type: 'choice',
            options: [
              { value: 'chaudiere', emoji: '🌡️', label: 'Chaudière à remplacer / installer' },
              { value: 'poele', emoji: '🔥', label: 'Poêle / insert' },
              { value: 'radiateurs', emoji: '♨️', label: 'Radiateurs / plancher chauffant' },
              { value: 'pompe-chaleur', emoji: '💨', label: 'Pompe à chaleur' },
              { value: 'chauffe-eau-solaire', emoji: '☀️', label: 'Chauffe-eau solaire / thermodynamique' },
              { value: 'panne', emoji: '🔧', label: 'Panne / entretien' },
              { value: 'installation-neuve', emoji: '📦', label: 'Installation neuve complète' }
            ]
          },
          {
            id: 'typeEquipement',
            label: 'Type d\'équipement concerné',
            type: 'choice',
            options: [
              { value: 'chaudiere-gaz', label: 'Chaudière gaz' },
              { value: 'chaudiere-fioul', label: 'Chaudière fioul' },
              { value: 'pompe-chaleur', label: 'Pompe à chaleur' },
              { value: 'poele-bois', label: 'Poêle à bois/granulés' },
              { value: 'plancher-chauffant', label: 'Plancher chauffant' },
              { value: 'chauffe-eau', label: 'Chauffe-eau' },
              { value: 'climatisation', label: 'Climatisation réversible' }
            ]
          },
          {
            id: 'typeIntervention',
            label: 'Type d\'intervention',
            type: 'choice',
            options: [
              { value: 'neuve', emoji: '🆕', label: 'Installation neuve' },
              { value: 'remplacement', emoji: '🔄', label: 'Remplacement' },
              { value: 'reparation', emoji: '🔧', label: 'Réparation / dépannage' },
              { value: 'entretien', emoji: '🧹', label: 'Entretien / maintenance' }
            ]
          },
          {
            id: 'distribution',
            label: 'Distribution existante',
            type: 'choice',
            options: [
              { value: 'radiateurs-conserver', emoji: '✅', label: 'Radiateurs existants à conserver' },
              { value: 'radiateurs-remplacer', emoji: '🔄', label: 'Radiateurs à remplacer' },
              { value: 'pas-distribution', emoji: '🆕', label: 'Pas de distribution existante' },
              { value: 'plancher-chauffant', emoji: '🌡️', label: 'Plancher chauffant' }
            ]
          },
          {
            id: 'energie',
            label: 'Énergie actuelle / souhaitée',
            type: 'select',
            options: [
              { value: 'gaz-naturel', label: 'Gaz naturel' },
              { value: 'gaz-propane', label: 'Gaz propane' },
              { value: 'fioul', label: 'Fioul' },
              { value: 'electricite', label: 'Électricité' },
              { value: 'bois-granules', label: 'Bois / granulés' },
              { value: 'geothermie', label: 'Géothermie' },
              { value: 'aerothermie', label: 'Aérothermie' }
            ]
          },
          {
            id: 'surface',
            label: 'Surface à chauffer',
            type: 'number',
            placeholder: 'Ex : 90'
          },
          {
            id: 'nbPieces',
            label: 'Nombre de pièces à chauffer',
            type: 'number',
            placeholder: 'Ex : 5'
          }
        ]
      },
      serrurier: {
        titre: 'Décrivez votre intervention serrurerie',
        questions: [
          {
            id: 'sujetPhoto',
            label: 'Qu\'est-ce que montre la photo ?',
            type: 'choice',
            options: [
              { value: 'porte-securiser', emoji: '🚪', label: 'Porte à sécuriser / remplacer' },
              { value: 'serrure', emoji: '🔑', label: 'Serrure à changer / réparer' },
              { value: 'portail', emoji: '🏠', label: 'Portail / clôture / portillon' },
              { value: 'fenetre-volet', emoji: '🪟', label: 'Fenêtre / volet roulant' },
              { value: 'coffre-fort', emoji: '🔒', label: 'Coffre-fort' },
              { value: 'urgence', emoji: '🚨', label: 'Urgence — porte bloquée / clé cassée' },
              { value: 'fermetures-neuves', emoji: '🏗️', label: 'Fermetures neuves (construction)' }
            ]
          },
          {
            id: 'typeIntervention',
            label: 'Type d\'intervention',
            type: 'choice',
            options: [
              { value: 'neuve', emoji: '🆕', label: 'Installation neuve' },
              { value: 'remplacement', emoji: '🔄', label: 'Remplacement' },
              { value: 'reparation', emoji: '🔧', label: 'Réparation' },
              { value: 'urgence', emoji: '🚨', label: 'Urgence / dépannage' },
              { value: 'renforcement', emoji: '🛡️', label: 'Renforcement sécurité' }
            ]
          },
          {
            id: 'elementsConcernes',
            label: 'Éléments concernés (plusieurs choix possibles)',
            type: 'checkbox',
            options: [
              { value: 'serrure-cylindre', label: 'Serrure / cylindre' },
              { value: 'porte-blindee', label: 'Porte blindée' },
              { value: 'porte-cave', label: 'Porte de cave / service' },
              { value: 'portail-motorise', label: 'Portail motorisé' },
              { value: 'interphone', label: 'Interphone / visiophone' },
              { value: 'volets-roulants', label: 'Volets roulants' },
              { value: 'rideau-metallique', label: 'Rideau métallique' },
              { value: 'grilles-protection', label: 'Grilles de protection' }
            ]
          },
          {
            id: 'niveauSecurite',
            label: 'Niveau de sécurité souhaité',
            type: 'choice',
            options: [
              { value: 'standard', label: 'Standard' },
              { value: 'renforce-a2p1', label: 'Renforcé (A2P*)' },
              { value: 'haute-securite-a2p2', label: 'Haute sécurité (A2P**)' },
              { value: 'a-definir', label: 'À définir' }
            ]
          },
          {
            id: 'typeBatiment',
            label: 'Type de bâtiment',
            type: 'choice',
            options: [
              { value: 'maison', emoji: '🏠', label: 'Maison individuelle' },
              { value: 'appartement', emoji: '🏢', label: 'Appartement' },
              { value: 'commerce', emoji: '🏪', label: 'Commerce / local pro' },
              { value: 'chantier', emoji: '🏗️', label: 'Chantier / construction' }
            ]
          }
        ]
      }
    };

    const config = metiersConfig[selectedMetier];
    if (!config) {
      return (
        <div className="text-center py-8 text-white/70">
          <p>Questionnaire pour {selectedMetier} en cours de développement</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <span className="text-2xl">
            {selectedMetier === 'plombier' && '🔧'}
            {selectedMetier === 'electricien' && '⚡'}
            {selectedMetier === 'carreleur' && '🪣'}
            {selectedMetier === 'peintre' && '🎨'}
            {selectedMetier === 'macon' && '🧱'}
            {selectedMetier === 'charpentier' && '🪵'}
            {selectedMetier === 'chauffagiste' && '🔥'}
            {selectedMetier === 'serrurier' && '🔐'}
          </span>
          <h2 className="text-xl font-bold text-white">{config.titre}</h2>
        </div>

        {config.questions.map((q: any, index: number) => (
          <div key={q.id}>
            <Label className="text-white mb-3 block">{q.label}</Label>
            {q.type === 'choice' && (
              <div className="choices-grid-2 md:choices-grid-3">
                {q.options.map((opt: any) => (
                  <div
                    key={opt.value}
                    className={`choice-card ${getReponse(q.id) === opt.value ? 'selected' : ''}`}
                    onClick={() => updateReponse(q.id, opt.value)}
                  >
                    {opt.emoji && <span className="choice-card-emoji">{opt.emoji}</span>}
                    <span>{opt.label}</span>
                  </div>
                ))}
              </div>
            )}
            {q.type === 'checkbox' && (
              <div className="space-y-2">
                {q.options.map((opt: any) => {
                  const current = getReponse(q.id) || [];
                  const isChecked = Array.isArray(current) && current.includes(opt.value);
                  return (
                    <div
                      key={opt.value}
                      className={`checkbox-card ${isChecked ? 'checked' : ''}`}
                      onClick={() => {
                        const newValue = isChecked
                          ? current.filter((v: string) => v !== opt.value)
                          : [...current, opt.value];
                        updateReponse(q.id, newValue);
                      }}
                    >
                      <div className="checkbox-indicator" />
                      <span>{opt.label}</span>
                    </div>
                  );
                })}
              </div>
            )}
            {q.type === 'select' && (
              <Select value={getReponse(q.id)} onValueChange={(value) => updateReponse(q.id, value)}>
                <SelectTrigger className="input-field">
                  <SelectValue placeholder="Sélectionner..." />
                </SelectTrigger>
                <SelectContent>
                  {q.options.map((opt: any) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {q.type === 'number' && (
              <div>
                <Input
                  type="number"
                  min="1"
                  value={getReponse(q.id)}
                  onChange={(e) => updateReponse(q.id, e.target.value)}
                  className="input-field"
                  placeholder={q.placeholder}
                />
                {q.note && (
                  <p className="text-xs text-white/50 mt-2">{q.note}</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <PageWrapper>
      <header className="bg-black/20 backdrop-blur-md border-b border-white/10 px-4 md:px-6 py-4 rounded-tl-3xl ml-0 md:ml-20">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-white">
              Estimation Automatique des Chantiers
            </h1>
            <p className="text-xs md:text-sm text-white/70">
              Étape {step}/5 - {
                step === 1 ? 'Photo + Métier' : 
                step === 2 ? 'Questionnaire' : 
                step === 3 ? 'Informations communes' :
                step === 4 ? 'Récapitulatif' :
                'Résultats de l\'analyse'
              }
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
              className="max-w-6xl mx-auto"
            >
              <Card className="bg-black/20 backdrop-blur-md border border-white/10 text-white">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5 text-white/70" />
                    Photo du Chantier et Sélection du Métier
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Zone d'upload photo (gauche) */}
                    <div>
                      <Label className="text-white mb-3 block">Photo du chantier</Label>
                      <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                          isDragging
                            ? 'border-white/40 bg-white/10'
                            : 'border-white/20 hover:border-white/30'
                        }`}
                      >
                        <Upload className="h-10 w-10 mx-auto mb-3 text-white/70" />
                        <p className="text-sm font-medium text-white mb-1">
                          Glissez-déposez votre photo ici
                        </p>
                        <p className="text-xs text-white/60 mb-3">
                          ou cliquez pour sélectionner
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
                          size="sm"
                          className="text-white border-white/20 hover:bg-white/10"
                          onClick={() => document.getElementById('photo-upload')?.click()}
                        >
                          Sélectionner une photo
                        </Button>
                      </div>

                      {images.length > 0 && (
                        <div className="grid grid-cols-2 gap-2 mt-4">
                          {images.map((image, index) => (
                            <div key={index} className="relative group">
                              <img
                                src={image.preview}
                                alt={`Preview ${index + 1}`}
                                loading="lazy"
                                className="w-full h-24 object-cover rounded-lg border border-white/20"
                              />
                              <button
                                onClick={() => removeImage(index)}
                                className="absolute top-1 right-1 bg-red-500/80 hover:bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Sélection métier (droite) */}
                    <div>
                      <Label className="text-white mb-3 block">Quel est votre métier ?</Label>
                      <div className="metiers-grid">
                        {[
                          { value: 'plombier', emoji: '🔧', label: 'Plombier' },
                          { value: 'electricien', emoji: '⚡', label: 'Électricien' },
                          { value: 'carreleur', emoji: '🪣', label: 'Carreleur' },
                          { value: 'peintre', emoji: '🎨', label: 'Peintre' },
                          { value: 'macon', emoji: '🧱', label: 'Maçon' },
                          { value: 'charpentier', emoji: '🪵', label: 'Charpentier' },
                          { value: 'chauffagiste', emoji: '🔥', label: 'Chauffagiste' },
                          { value: 'serrurier', emoji: '🔐', label: 'Serrurier' }
                        ].map((metier) => (
                          <div
                            key={metier.value}
                            className={`metier-card ${selectedMetier === metier.value ? 'selected' : ''}`}
                            onClick={() => setSelectedMetier(metier.value)}
                          >
                            <span className="metier-card-emoji">{metier.emoji}</span>
                            <span className="metier-card-label">{metier.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end mt-6">
                    <Button
                      onClick={handleNext}
                      disabled={images.length === 0 || !selectedMetier}
                      className="btn-primary"
                    >
                      Suivant
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* ÉTAPE 2 - QUESTIONNAIRE DYNAMIQUE PAR MÉTIER */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-4xl mx-auto"
            >
              <Card className="bg-black/20 backdrop-blur-md border border-white/10 text-white">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="h-5 w-5 text-white/70" />
                    Questions pour {selectedMetier ? (
                      <>
                        <span className="text-2xl mr-2">
                          {selectedMetier === 'plombier' && '🔧'}
                          {selectedMetier === 'electricien' && '⚡'}
                          {selectedMetier === 'carreleur' && '🪣'}
                          {selectedMetier === 'peintre' && '🎨'}
                          {selectedMetier === 'macon' && '🧱'}
                          {selectedMetier === 'charpentier' && '🪵'}
                          {selectedMetier === 'chauffagiste' && '🔥'}
                          {selectedMetier === 'serrurier' && '🔐'}
                        </span>
                        {selectedMetier.charAt(0).toUpperCase() + selectedMetier.slice(1)}
                      </>
                    ) : 'Métier'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {renderQuestionnaireMetier()}
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
                      onClick={handleNext}
                      className="btn-primary"
                    >
                      Suivant
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* ÉTAPE 3 - INFORMATIONS COMMUNES */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-4xl mx-auto"
            >
              <Card className="bg-black/20 backdrop-blur-md border border-white/10 text-white">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="h-5 w-5 text-white/70" />
                    Informations Communes
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Accès au chantier */}
                  <div>
                    <Label className="text-white mb-3 block">Accès au chantier *</Label>
                    <div className="choices-grid-3">
                      {[
                        { value: 'facile', emoji: '✅', label: 'Facile (plain-pied, accès direct)' },
                        { value: 'moyen', emoji: '⚠️', label: 'Moyen (étage avec ascenseur, cour)' },
                        { value: 'difficile', emoji: '❌', label: 'Difficile (étage sans ascenseur, zone dense)' }
                      ].map((option) => (
                        <div
                          key={option.value}
                          className={`choice-card ${contexteCommun.acces === option.value ? 'selected' : ''}`}
                          onClick={() => setContexteCommun({ ...contexteCommun, acces: option.value })}
                        >
                          <span className="choice-card-emoji">{option.emoji}</span>
                          <span>{option.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Fourniture des matériaux */}
                  <div>
                    <Label className="text-white mb-3 block">Fourniture des matériaux *</Label>
                    <div className="choices-grid-3">
                      {[
                        { value: 'artisan', emoji: '🧑‍🔧', label: 'L\'artisan fournit tout' },
                        { value: 'client', emoji: '📦', label: 'Je fournis les matériaux' },
                        { value: 'partage', emoji: '🤝', label: 'On partage' }
                      ].map((option) => (
                        <div
                          key={option.value}
                          className={`choice-card ${contexteCommun.fournitureMateriaux === option.value ? 'selected' : ''}`}
                          onClick={() => setContexteCommun({ ...contexteCommun, fournitureMateriaux: option.value })}
                        >
                          <span className="choice-card-emoji">{option.emoji}</span>
                          <span>{option.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Localisation */}
                  <div>
                    <Label className="text-white mb-2 block">Ville / Code postal *</Label>
                    <Input
                      type="text"
                      value={contexteCommun.localisation}
                      onChange={(e) => setContexteCommun({ ...contexteCommun, localisation: e.target.value })}
                      className="input-field"
                      placeholder="Ex : Bordeaux, 33000"
                    />
                  </div>

                  {/* Délai souhaité */}
                  <div>
                    <Label className="text-white mb-2 block">Délai souhaité *</Label>
                    <Select
                      value={contexteCommun.delai}
                      onValueChange={(value) => setContexteCommun({ ...contexteCommun, delai: value })}
                    >
                      <SelectTrigger className="input-field">
                        <SelectValue placeholder="Sélectionner..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="urgence">⚡ Le plus tôt possible (urgence)</SelectItem>
                        <SelectItem value="semaine">📅 Dans la semaine</SelectItem>
                        <SelectItem value="mois">🗓️ Dans le mois</SelectItem>
                        <SelectItem value="3mois">📆 Dans les 3 mois</SelectItem>
                        <SelectItem value="pas-contrainte">🔮 Pas de contrainte de délai</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Précisions complémentaires */}
                  <div>
                    <Label className="text-white mb-2 block">Précisions supplémentaires (facultatif)</Label>
                    <textarea
                      value={contexteCommun.precisions}
                      onChange={(e) => {
                        if (e.target.value.length <= 500) {
                          setContexteCommun({ ...contexteCommun, precisions: e.target.value });
                        }
                      }}
                      className="input-field"
                      rows={4}
                      placeholder="Contraintes particulières, souhaits spécifiques, configuration atypique..."
                    />
                    <p className="text-xs text-white/50 mt-1">{contexteCommun.precisions.length}/500</p>
                  </div>

                  <div className="flex justify-between mt-6">
                    <Button
                      variant="outline"
                      onClick={() => setStep(2)}
                      className="text-white border-white/20 hover:bg-white/10"
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Retour
                    </Button>
                    <Button
                      onClick={handleNext}
                      className="btn-primary"
                    >
                      Suivant
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* ÉTAPE 4 - RÉCAPITULATIF */}
          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-4xl mx-auto"
            >
              <Card className="bg-black/20 backdrop-blur-md border border-white/10 text-white">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-white/70" />
                    Récapitulatif
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Photo */}
                  {images.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <Label className="text-white">Photo du chantier</Label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setStep(1)}
                          className="text-white/70 hover:text-white text-xs"
                        >
                          Modifier
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {images.slice(0, 4).map((image, index) => (
                          <img
                            key={index}
                            src={image.preview}
                            alt={`Preview ${index + 1}`}
                            className="w-full h-24 object-cover rounded-lg border border-white/20"
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Métier */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <Label className="text-white">Métier sélectionné</Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setStep(1)}
                        className="text-white/70 hover:text-white text-xs"
                      >
                        Modifier
                      </Button>
                    </div>
                    <div className="p-4 bg-black/20 backdrop-blur-md border border-white/10 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">
                          {selectedMetier === 'plombier' && '🔧'}
                          {selectedMetier === 'electricien' && '⚡'}
                          {selectedMetier === 'carreleur' && '🪣'}
                          {selectedMetier === 'peintre' && '🎨'}
                          {selectedMetier === 'macon' && '🧱'}
                          {selectedMetier === 'charpentier' && '🪵'}
                          {selectedMetier === 'chauffagiste' && '🔥'}
                          {selectedMetier === 'serrurier' && '🔐'}
                        </span>
                        <span className="text-white font-semibold">
                          {selectedMetier.charAt(0).toUpperCase() + selectedMetier.slice(1)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Réponses métier */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <Label className="text-white">Réponses au questionnaire</Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setStep(2)}
                        className="text-white/70 hover:text-white text-xs"
                      >
                        Modifier
                      </Button>
                    </div>
                    <div className="p-4 bg-black/20 backdrop-blur-md border border-white/10 rounded-lg text-sm">
                      <pre className="text-white/80 whitespace-pre-wrap font-sans">
                        {JSON.stringify(reponsesMetier, null, 2)}
                      </pre>
                    </div>
                  </div>

                  {/* Informations communes */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <Label className="text-white">Informations communes</Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setStep(3)}
                        className="text-white/70 hover:text-white text-xs"
                      >
                        Modifier
                      </Button>
                    </div>
                    <div className="p-4 bg-black/20 backdrop-blur-md border border-white/10 rounded-lg text-sm space-y-2">
                      <p><span className="text-white/70">Accès:</span> <span className="text-white">{contexteCommun.acces}</span></p>
                      <p><span className="text-white/70">Fourniture:</span> <span className="text-white">{contexteCommun.fournitureMateriaux}</span></p>
                      <p><span className="text-white/70">Localisation:</span> <span className="text-white">{contexteCommun.localisation}</span></p>
                      <p><span className="text-white/70">Délai:</span> <span className="text-white">{contexteCommun.delai}</span></p>
                      {contexteCommun.precisions && (
                        <p><span className="text-white/70">Précisions:</span> <span className="text-white text-xs">{contexteCommun.precisions}</span></p>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-between mt-6">
                    <Button
                      variant="outline"
                      onClick={() => setStep(3)}
                      className="text-white border-white/20 hover:bg-white/10"
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Retour
                    </Button>
                    <Button
                      onClick={handleLaunchAnalysis}
                      disabled={isLoadingEstimation}
                      className="btn-amber w-full max-w-md mx-auto"
                    >
                      {isLoadingEstimation ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Analyse en cours...
                        </>
                      ) : (
                        <>
                          <Wand2 className="h-4 w-4 mr-2" />
                          Lancer l'estimation IA →
                        </>
                      )}
                    </Button>
                  </div>
                  {!isLoadingEstimation && (
                    <p className="text-sm text-white/60 text-center mt-2">
                      Résultat en quelques secondes
                    </p>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* ÉTAPE 5 - RÉSULTATS */}
          {step === 5 && analysisResults && (
            <motion.div
              key="step5"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-4xl mx-auto"
            >
              <Card className="bg-black/20 backdrop-blur-md border border-white/10 text-white">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="h-5 w-5 text-white/70" />
                    Contexte du Chantier
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Type de travaux */}
                  <div>
                    <Label className="text-white mb-3 block">Quel type d'intervention ? *</Label>
                    <div className="choices-grid-2">
                      {[
                        { value: 'neuf', emoji: '🏗️', label: 'Travaux neufs' },
                        { value: 'renovation', emoji: '🔄', label: 'Rénovation' },
                        { value: 'reparation', emoji: '🔧', label: 'Réparation / Dépannage' },
                        { value: 'extension', emoji: '➕', label: 'Extension / Agrandissement' }
                      ].map((option) => (
                        <div
                          key={option.value}
                          className={`choice-card ${contexteChantier.typeTraveaux === option.value ? 'selected' : ''}`}
                          onClick={() => setContexteChantier({ ...contexteChantier, typeTraveaux: option.value })}
                        >
                          <span className="choice-card-emoji">{option.emoji}</span>
                          <span>{option.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Fourniture des matériaux */}
                  <div>
                    <Label className="text-white mb-3 block">Qui fournit les matériaux ? *</Label>
                    <div className="choices-grid-3">
                      {[
                        { value: 'artisan', emoji: '🧑‍🔧', label: 'L\'artisan fournit tout' },
                        { value: 'client', emoji: '📦', label: 'Je fournis les matériaux' },
                        { value: 'partage', emoji: '🤝', label: 'On partage' }
                      ].map((option) => (
                        <div
                          key={option.value}
                          className={`choice-card ${contexteChantier.fournitureMateriaux === option.value ? 'selected' : ''}`}
                          onClick={() => setContexteChantier({ ...contexteChantier, fournitureMateriaux: option.value })}
                        >
                          <span className="choice-card-emoji">{option.emoji}</span>
                          <span>{option.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Accès au chantier */}
                  <div>
                    <Label className="text-white mb-3 block">Accès au chantier *</Label>
                    <div className="choices-grid-3">
                      {[
                        { value: 'facile', emoji: '✅', label: 'Facile (plain-pied, accès direct)' },
                        { value: 'moyen', emoji: '⚠️', label: 'Moyen (étage avec ascenseur, cour)' },
                        { value: 'difficile', emoji: '❌', label: 'Difficile (étage sans ascenseur, zone dense)' }
                      ].map((option) => (
                        <div
                          key={option.value}
                          className={`choice-card ${contexteChantier.acces === option.value ? 'selected' : ''}`}
                          onClick={() => setContexteChantier({ ...contexteChantier, acces: option.value })}
                        >
                          <span className="choice-card-emoji">{option.emoji}</span>
                          <span>{option.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* État actuel */}
                  <div>
                    <Label className="text-white mb-3 block">État actuel *</Label>
                    <div className="choices-grid-3">
                      {[
                        { value: 'vide', emoji: '🧹', label: 'Vide / À partir de zéro' },
                        { value: 'existant', emoji: '🏠', label: 'Existant à conserver partiellement' },
                        { value: 'demolir', emoji: '💥', label: 'À démolir / Tout à refaire' }
                      ].map((option) => (
                        <div
                          key={option.value}
                          className={`choice-card ${contexteChantier.etatActuel === option.value ? 'selected' : ''}`}
                          onClick={() => setContexteChantier({ ...contexteChantier, etatActuel: option.value })}
                        >
                          <span className="choice-card-emoji">{option.emoji}</span>
                          <span>{option.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Nombre de pièces */}
                  <div>
                    <Label className="text-white mb-2 block">Combien de pièces ou zones sont concernées ? *</Label>
                    <Input
                      type="number"
                      min="1"
                      max="20"
                      value={contexteChantier.nbPieces}
                      onChange={(e) => setContexteChantier({ ...contexteChantier, nbPieces: e.target.value })}
                      className="input-field"
                      placeholder="Ex: 1"
                    />
                  </div>

                  {/* Précisions libres */}
                  <div>
                    <Label className="text-white mb-2 block">Précisions supplémentaires (facultatif)</Label>
                    <textarea
                      value={contexteChantier.precisionsLibres}
                      onChange={(e) => {
                        if (e.target.value.length <= 500) {
                          setContexteChantier({ ...contexteChantier, precisionsLibres: e.target.value });
                        }
                      }}
                      className="input-field"
                      rows={4}
                      placeholder="Décrivez toute information utile que la photo ne montre pas : contraintes particulières, souhaits spécifiques, configuration atypique..."
                    />
                    <p className="text-xs text-white/50 mt-1">{contexteChantier.precisionsLibres.length}/500</p>
                  </div>

                  <div className="flex justify-between mt-6">
                    <Button
                      variant="outline"
                      onClick={() => setStep(2)}
                      className="text-white border-white/20 hover:bg-white/10"
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Retour
                    </Button>
                    <Button
                      onClick={handleNext}
                      className="btn-primary"
                    >
                      Suivant
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* ÉTAPE 4 - DÉTAILS SPÉCIFIQUES AU MÉTIER */}
          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-4xl mx-auto"
            >
              <Card className="bg-black/20 backdrop-blur-md border border-white/10 text-white">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="h-5 w-5 text-white/70" />
                    Détails Spécifiques - {chantierInfo.metier ? chantierInfo.metier.charAt(0).toUpperCase() + chantierInfo.metier.slice(1) : 'Métier'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {renderMetierSpecificFields()}
                  
                  <div className="flex justify-between mt-6">
                    <Button
                      variant="outline"
                      onClick={() => setStep(3)}
                      className="text-white border-white/20 hover:bg-white/10"
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Retour
                    </Button>
                    <Button
                      onClick={handleNext}
                      className="btn-primary"
                    >
                      Suivant
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* ÉTAPE 5 - RÉCAPITULATIF */}
          {step === 5 && (
            <motion.div
              key="step5"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-4xl mx-auto"
            >
              <Card className="bg-black/20 backdrop-blur-md border border-white/10 text-white">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-white/70" />
                    Récapitulatif
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {renderRecap()}
                  
                  <div className="flex justify-between mt-6">
                    <Button
                      variant="outline"
                      onClick={() => setStep(4)}
                      className="text-white border-white/20 hover:bg-white/10"
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Retour
                    </Button>
                    <Button
                      onClick={handleLaunchAnalysis}
                      disabled={isLoadingEstimation}
                      className="btn-amber"
                    >
                      {isLoadingEstimation ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Analyse en cours...
                        </>
                      ) : (
                        <>
                          <Wand2 className="h-4 w-4 mr-2" />
                          Lancer l'estimation IA →
                        </>
                      )}
                    </Button>
                  </div>
                  {!isLoadingEstimation && (
                    <p className="text-sm text-white/60 text-center mt-2">
                      L'estimation sera générée en quelques secondes
                    </p>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* ÉTAPE 5 - RÉSULTATS */}
          {step === 5 && analysisResults && (
            <motion.div
              key="step5"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-6xl mx-auto space-y-6"
            >
              <Card className="bg-black/20 backdrop-blur-md border border-white/10 text-white">
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
                        setContexteChantier({ typeTraveaux: '', fournitureMateriaux: '', acces: '', etatActuel: '', nbPieces: '', precisionsLibres: '' });
                        setDetailsMetier({});
                        setAnalysisResults(null);
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
          <DialogContent className="bg-black/20 backdrop-blur-md border border-white/10 text-white rounded-2xl">
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
