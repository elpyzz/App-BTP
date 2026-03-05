export function GlobalBackground() {
  // Fond statique avec texture subtile - plus de MeshGradient animé
  return (
    <div 
      className="fixed inset-0 w-screen h-screen z-0 pointer-events-none"
      style={{
        backgroundColor: 'var(--bg-primary)',
        backgroundImage: `
          radial-gradient(ellipse at 20% 50%, rgba(37, 99, 235, 0.06) 0%, transparent 60%),
          radial-gradient(ellipse at 80% 20%, rgba(245, 158, 11, 0.04) 0%, transparent 50%)
        `
      }}
    />
  )
}

