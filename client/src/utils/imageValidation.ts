/**
 * Validation des images avant upload
 */

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB
const MIN_RESOLUTION = 400; // 400x400px minimum

/**
 * Obtient la résolution d'une image
 */
export function getImageResolution(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.width, height: img.height });
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Impossible de charger l'image: ${file.name}`));
    };
    
    img.src = url;
  });
}

/**
 * Valide une liste d'images
 */
export async function validateImages(images: File[]): Promise<File[]> {
  if (images.length === 0) {
    throw new Error('Aucune image fournie');
  }
  
  const validImages: File[] = [];
  const errors: string[] = [];
  
  for (const image of images) {
    try {
      // Vérification du type
      if (!image.type.startsWith('image/')) {
        errors.push(`${image.name}: Format non supporté (${image.type})`);
        continue;
      }
      
      // Vérification de la taille
      if (image.size > MAX_FILE_SIZE) {
        errors.push(`${image.name}: Taille trop importante (${(image.size / 1024 / 1024).toFixed(2)}MB, max ${MAX_FILE_SIZE / 1024 / 1024}MB)`);
        continue;
      }
      
      // Vérification de la résolution minimale
      try {
        const resolution = await getImageResolution(image);
        if (resolution.width < MIN_RESOLUTION || resolution.height < MIN_RESOLUTION) {
          errors.push(`${image.name}: Résolution trop faible (${resolution.width}x${resolution.height}px, min ${MIN_RESOLUTION}x${MIN_RESOLUTION}px)`);
          continue;
        }
      } catch (resolutionError) {
        errors.push(`${image.name}: ${resolutionError instanceof Error ? resolutionError.message : 'Erreur de résolution'}`);
        continue;
      }
      
      validImages.push(image);
    } catch (error) {
      errors.push(`${image.name}: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  }
  
  if (validImages.length === 0) {
    throw new Error(`Aucune image valide trouvée. Erreurs:\n${errors.join('\n')}`);
  }
  
  if (errors.length > 0) {
    console.warn('Images invalides ignorées:', errors);
  }
  
  return validImages;
}
