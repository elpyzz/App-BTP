import { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface SignatureCanvasProps {
  initialSignature?: string | null;
  onSave: (signatureData: string) => Promise<void>;
}

export function SignatureCanvas({ initialSignature, onSave }: SignatureCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  // Charger la signature existante au montage
  useEffect(() => {
    if (initialSignature && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const img = new Image();
        img.onload = () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          setHasSignature(true);
        };
        img.src = initialSignature;
      }
    }
  }, [initialSignature]);

  // Initialiser le canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Style du trait
    ctx.strokeStyle = '#1a1a2e';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    let drawing = false;
    let lastX = 0;
    let lastY = 0;

    // Fonction pour obtenir les coordonnées
    const getCoordinates = (e: MouseEvent | TouchEvent): { x: number; y: number } => {
      if ('touches' in e) {
        const touch = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        return {
          x: touch.clientX - rect.left,
          y: touch.clientY - rect.top,
        };
      } else {
        return {
          x: e.offsetX,
          y: e.offsetY,
        };
      }
    };

    // Desktop - Mouse events
    const handleMouseDown = (e: MouseEvent) => {
      drawing = true;
      setIsDrawing(true);
      const coords = getCoordinates(e);
      lastX = coords.x;
      lastY = coords.y;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!drawing) return;
      const coords = getCoordinates(e);
      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
      lastX = coords.x;
      lastY = coords.y;
      setHasSignature(true);
    };

    const handleMouseUp = () => {
      drawing = false;
      setIsDrawing(false);
    };

    const handleMouseOut = () => {
      drawing = false;
      setIsDrawing(false);
    };

    // Mobile - Touch events
    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      drawing = true;
      setIsDrawing(true);
      const coords = getCoordinates(e);
      lastX = coords.x;
      lastY = coords.y;
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (!drawing) return;
      const coords = getCoordinates(e);
      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
      lastX = coords.x;
      lastY = coords.y;
      setHasSignature(true);
    };

    const handleTouchEnd = () => {
      drawing = false;
      setIsDrawing(false);
    };

    // Ajouter les event listeners
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mouseout', handleMouseOut);
    canvas.addEventListener('touchstart', handleTouchStart);
    canvas.addEventListener('touchmove', handleTouchMove);
    canvas.addEventListener('touchend', handleTouchEnd);

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('mouseout', handleMouseOut);
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setHasSignature(false);
    }
  };

  const handleSave = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (!hasSignature) {
      toast({
        title: 'Aucune signature',
        description: 'Veuillez dessiner votre signature avant de l\'enregistrer',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      const signatureData = canvas.toDataURL('image/png');
      await onSave(signatureData);
      toast({
        title: 'Signature enregistrée',
        description: 'Votre signature apparaîtra sur vos prochains devis',
      });
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Erreur lors de l\'enregistrement de la signature',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="signature-section">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white mb-1">Votre signature</h3>
        <p className="text-sm text-white/70">Votre signature apparaîtra automatiquement sur tous vos devis.</p>
      </div>

      <div className="signature-canvas-wrapper">
        <canvas
          ref={canvasRef}
          width={500}
          height={180}
          className="signature-canvas"
        />
        {!hasSignature && (
          <div className="signature-placeholder">
            Dessinez votre signature ici
          </div>
        )}
      </div>

      <div className="signature-actions">
        <Button
          onClick={handleClear}
          variant="outline"
          className="btn-secondary"
        >
          ✏️ Effacer
        </Button>
        <Button
          onClick={handleSave}
          disabled={isSaving || !hasSignature}
          className="btn-amber"
        >
          {isSaving ? 'Enregistrement...' : '💾 Enregistrer ma signature'}
        </Button>
      </div>

      {initialSignature && (
        <div className="signature-preview">
          <p className="signature-preview-label">Signature actuelle</p>
          <img src={initialSignature} alt="Signature actuelle" className="signature-preview-img" />
        </div>
      )}
    </div>
  );
}
