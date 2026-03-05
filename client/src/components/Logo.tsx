import React from 'react';

interface LogoProps {
  size?: number;
  className?: string;
  showDots?: boolean;
}

// Le logo peut être placé soit dans :
// 1. client/public/logo.jpg (recommandé - accessible via /logo.jpg)
// 2. client/src/assets/logo.jpg (nécessite un import)
export function Logo({ size = 48, className = '', showDots = false }: LogoProps) {
  // Essayer d'utiliser le logo depuis le dossier public (recommandé)
  // Si l'image n'existe pas, un placeholder sera affiché
  const logoSrc = '/logo.jpg';
  
  return (
    <div className={`inline-flex flex-col items-center ${className}`}>
      <img
        src={logoSrc}
        alt="Aos Renov Logo"
        width={size}
        height={size * 1.15}
        className="drop-shadow-lg object-contain"
        style={{ maxWidth: `${size}px`, height: 'auto' }}
        onError={(e) => {
          // Si l'image n'est pas trouvée, on cache l'élément
          (e.target as HTMLImageElement).style.display = 'none';
        }}
      />
    </div>
  );
}
