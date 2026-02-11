import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Edit2, Trash2, Package } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  getMaterials,
  addMaterial,
  updateMaterial,
  deleteMaterial,
  getMaterialsByCategory,
  searchMaterials,
  type Material,
  MATERIAL_CATEGORIES,
  MATERIAL_UNITS
} from '@/lib/materials';

export default function MaterialSettings() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [materialToDelete, setMaterialToDelete] = useState<Material | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    unitPrice: '',
    unit: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    loadMaterials();
  }, []);

  useEffect(() => {
    filterMaterials();
  }, [searchQuery, selectedCategory]);

  const loadMaterials = async () => {
    setLoading(true);
    try {
      const data = await getMaterials();
      setMaterials(data);
    } catch (error) {
      console.error('Error loading materials:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les matériaux",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filterMaterials = async () => {
    setLoading(true);
    try {
      let filtered: Material[] = [];
      
      if (searchQuery.trim()) {
        filtered = await searchMaterials(searchQuery);
      } else {
        filtered = await getMaterialsByCategory(selectedCategory);
      }
      
      setMaterials(filtered);
    } catch (error) {
      console.error('Error filtering materials:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (material?: Material) => {
    if (material) {
      setEditingMaterial(material);
      setFormData({
        name: material.name,
        category: material.category,
        unitPrice: material.unitPrice.toString(),
        unit: material.unit
      });
    } else {
      setEditingMaterial(null);
      setFormData({
        name: '',
        category: '',
        unitPrice: '',
        unit: ''
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingMaterial(null);
    setFormData({
      name: '',
      category: '',
      unitPrice: '',
      unit: ''
    });
  };

  const handleSave = async () => {
    // Validation
    if (!formData.name.trim() || formData.name.length < 2) {
      toast({
        title: "Erreur de validation",
        description: "Le nom doit contenir au moins 2 caractères",
        variant: "destructive"
      });
      return;
    }

    if (!formData.category) {
      toast({
        title: "Erreur de validation",
        description: "Veuillez sélectionner une catégorie",
        variant: "destructive"
      });
      return;
    }

    const price = parseFloat(formData.unitPrice);
    if (isNaN(price) || price <= 0) {
      toast({
        title: "Erreur de validation",
        description: "Le prix doit être un nombre supérieur à 0",
        variant: "destructive"
      });
      return;
    }

    if (!formData.unit) {
      toast({
        title: "Erreur de validation",
        description: "Veuillez sélectionner une unité",
        variant: "destructive"
      });
      return;
    }

    try {
      if (editingMaterial) {
        const result = await updateMaterial(editingMaterial.id, {
          name: formData.name.trim(),
          category: formData.category,
          unitPrice: price,
          unit: formData.unit
        });

        if (result) {
          toast({
            title: "Succès",
            description: "Matériau mis à jour avec succès",
          });
          await loadMaterials();
          handleCloseDialog();
        } else {
          throw new Error('Update failed');
        }
      } else {
        const result = await addMaterial({
          name: formData.name.trim(),
          category: formData.category,
          unitPrice: price,
          unit: formData.unit
        });

        if (result) {
          toast({
            title: "Succès",
            description: "Matériau ajouté avec succès",
          });
          await loadMaterials();
          handleCloseDialog();
        } else {
          throw new Error('Add failed');
        }
      }
    } catch (error) {
      console.error('Error saving material:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder le matériau",
        variant: "destructive"
      });
    }
  };

  const handleDeleteClick = (material: Material) => {
    setMaterialToDelete(material);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!materialToDelete) return;

    try {
      const success = await deleteMaterial(materialToDelete.id);
      if (success) {
        toast({
          title: "Succès",
          description: "Matériau supprimé avec succès",
        });
        await loadMaterials();
      } else {
        throw new Error('Delete failed');
      }
    } catch (error) {
      console.error('Error deleting material:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le matériau",
        variant: "destructive"
      });
    } finally {
      setIsDeleteDialogOpen(false);
      setMaterialToDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-black/20 backdrop-blur-xl border border-white/10 text-white">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-white/70" />
                Gestion des Matériaux
              </CardTitle>
              <p className="text-sm text-white/70 mt-1">
                Gérez vos prix de matériaux pour améliorer la précision des estimations
              </p>
            </div>
            <Button
              onClick={() => handleOpenDialog()}
              className="bg-white/20 backdrop-blur-md text-white border border-white/10 hover:bg-white/30"
            >
              <Plus className="h-4 w-4 mr-2" />
              Ajouter un matériau
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Filtres et recherche */}
      <Card className="bg-black/20 backdrop-blur-xl border border-white/10 text-white">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/50" />
                <Input
                  placeholder="Rechercher un matériau..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-black/20 border-white/10 text-white pl-10"
                />
              </div>
            </div>
            <div className="w-full md:w-64">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="bg-black/20 border-white/10 text-white">
                  <SelectValue placeholder="Toutes les catégories" />
                </SelectTrigger>
                <SelectContent className="bg-black/30 backdrop-blur-lg border-white/10 text-white">
                  <SelectItem value="all">Toutes les catégories</SelectItem>
                  {MATERIAL_CATEGORIES.map(category => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Liste des matériaux */}
      <Card className="bg-black/20 backdrop-blur-xl border border-white/10 text-white">
        <CardContent className="pt-6">
          {loading ? (
            <div className="text-center py-8">
              <p className="text-white/70">Chargement...</p>
            </div>
          ) : materials.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 mx-auto mb-4 text-white/50" />
              <p className="text-white/70">Aucun matériau enregistré</p>
              <p className="text-sm text-white/50 mt-2">Ajoutez votre premier matériau pour commencer</p>
            </div>
          ) : (
            <div className="space-y-2">
              {materials.map((material) => (
                <div
                  key={material.id}
                  className="flex items-center justify-between p-4 bg-black/20 backdrop-blur-md border border-white/10 rounded-lg hover:bg-black/30 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <p className="font-medium text-white">{material.name}</p>
                      <Badge className="bg-violet-500/20 text-violet-300 border-violet-500/30">
                        {material.category}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-sm text-white/70">
                      <span>Prix unitaire: <span className="font-semibold text-white">{material.unitPrice.toFixed(2)} €</span></span>
                      <span>Unité: <span className="font-semibold text-white">{material.unit}</span></span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenDialog(material)}
                      className="text-white/70 hover:bg-white/10 hover:text-white"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteClick(material)}
                      className="text-white/70 hover:bg-white/10 hover:text-white"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog d'ajout/modification */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-black/20 backdrop-blur-xl border border-white/10 text-white rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingMaterial ? 'Modifier le matériau' : 'Ajouter un nouveau matériau'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-white">Nom du matériau *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-black/20 border-white/10 text-white"
                placeholder="Ex: Carrelage céramique"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category" className="text-white">Catégorie *</Label>
              <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
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
                <Label htmlFor="unitPrice" className="text-white">Prix unitaire (€) *</Label>
                <Input
                  id="unitPrice"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={formData.unitPrice}
                  onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
                  className="bg-black/20 border-white/10 text-white"
                  placeholder="0.00"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit" className="text-white">Unité *</Label>
                <Select value={formData.unit} onValueChange={(value) => setFormData({ ...formData, unit: value })}>
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog} className="text-white border-white/20 hover:bg-white/10">
              Annuler
            </Button>
            <Button onClick={handleSave}>
              {editingMaterial ? 'Enregistrer' : 'Ajouter'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmation de suppression */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="bg-black/20 backdrop-blur-xl border border-white/10 text-white rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription className="text-white/70">
              Êtes-vous sûr de vouloir supprimer le matériau "{materialToDelete?.name}" ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-white border-white/20 hover:bg-white/10">
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
