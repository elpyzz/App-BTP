import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Edit2, Save, X, Plus } from 'lucide-react';

interface EstimationMaterial {
  nom: string;
  quantite: number | string;
  quantiteAvecPerte?: number;
  unite: string;
  prixUnitaire: number;
  prixTotal: number;
  coefficientPerte?: number;
  prixReel?: boolean;
  needsAdding?: boolean;
  materialId?: string;
  confidence?: number;
}

interface MaterialCardProps {
  material: EstimationMaterial;
  onUpdatePrice: (newPrice: number) => void;
  onAddToLibrary: () => void;
}

export const MaterialEstimationCard = ({ material, onUpdatePrice, onAddToLibrary }: MaterialCardProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editPrice, setEditPrice] = useState(material.prixUnitaire.toString());
  
  const handleSavePrice = () => {
    const newPrice = parseFloat(editPrice);
    if (!isNaN(newPrice) && newPrice > 0) {
      onUpdatePrice(newPrice);
      setIsEditing(false);
    }
  };
  
  const handleCancel = () => {
    setEditPrice(material.prixUnitaire.toString());
    setIsEditing(false);
  };
  
  return (
    <Card className="p-4 bg-black/20 backdrop-blur-md border border-white/10 text-white">
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-semibold text-lg text-white">{material.nom}</h4>
        <div className="flex gap-2 flex-wrap">
          {material.prixReel ? (
            <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
              Prix réel
            </Badge>
          ) : (
            <Badge className="bg-orange-500/20 text-orange-300 border-orange-500/30">
              Prix estimé
            </Badge>
          )}
          {material.confidence !== undefined && material.confidence > 0 && (
            <Badge variant="outline" className="text-white/70">
              {Math.round(material.confidence * 100)}% match
            </Badge>
          )}
        </div>
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-white/70">Quantité:</span>
          <span className="font-mono text-white">
            {typeof material.quantite === 'number' ? material.quantite : material.quantite} {material.unite}
          </span>
        </div>
        
        {material.coefficientPerte && material.coefficientPerte > 0 && (
          <div className="text-xs text-white/60">
            Perte incluse: {(material.coefficientPerte * 100).toFixed(1)}%
            {material.quantiteAvecPerte && (
              <span className="ml-2">
                (Quantité avec perte: {material.quantiteAvecPerte.toFixed(2)} {material.unite})
              </span>
            )}
          </div>
        )}
        
        <div className="flex justify-between items-center">
          <span className="text-white/70">Prix unitaire:</span>
          {isEditing ? (
            <div className="flex gap-2 items-center">
              <Input
                type="number"
                value={editPrice}
                onChange={(e) => setEditPrice(e.target.value)}
                className="w-24 h-8 bg-black/20 border-white/10 text-white"
                step="0.01"
                min="0.01"
              />
              <Button 
                size="sm" 
                onClick={handleSavePrice}
                className="h-8 w-8 p-0 bg-green-500/20 hover:bg-green-500/30 border-green-500/30"
              >
                <Save className="h-3 w-3" />
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={handleCancel}
                className="h-8 w-8 p-0 border-white/20 hover:bg-white/10"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <div className="flex gap-2 items-center">
              <span className="font-mono text-white">{material.prixUnitaire.toFixed(2)}€/{material.unite}</span>
              {material.prixReel && (
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => setIsEditing(true)}
                  className="h-6 w-6 p-0 text-white/70 hover:text-white hover:bg-white/10"
                >
                  <Edit2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          )}
        </div>
        
        <div className="flex justify-between font-semibold pt-2 border-t border-white/10">
          <span className="text-white">Prix total:</span>
          <span className="font-mono text-white">{material.prixTotal.toFixed(2)}€</span>
        </div>
      </div>
      
      {!material.prixReel && (
        <div className="mt-3 pt-3 border-t border-white/10">
          <Button 
            onClick={onAddToLibrary} 
            variant="outline" 
            size="sm"
            className="w-full bg-white/10 hover:bg-white/20 border-white/20 text-white"
          >
            <Plus className="h-3 w-3 mr-1" />
            Ajouter à ma bibliothèque
          </Button>
        </div>
      )}
    </Card>
  );
};
