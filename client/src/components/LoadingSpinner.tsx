export function LoadingSpinner() {
  return (
    <div className="w-full h-full flex items-center justify-center min-h-[400px]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-4 rounded-full animate-spin" style={{ borderColor: 'rgba(245, 158, 11, 0.3)', borderTopColor: 'var(--accent-amber)' }} />
        <p className="text-white/70 text-sm">Chargement...</p>
      </div>
    </div>
  );
}
