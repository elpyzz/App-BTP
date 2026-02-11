import { PageWrapper } from '@/components/PageWrapper';
import MaterialSettings from '@/components/MaterialSettings';

export default function SettingsPage() {
  return (
    <PageWrapper>
      <header className="bg-black/20 backdrop-blur-xl border-b border-white/10 px-6 py-4 rounded-tl-3xl ml-20">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">
              Paramètres
            </h1>
            <p className="text-sm text-white/70">Gérez vos prix de matériaux pour améliorer la précision des estimations</p>
          </div>
        </div>
      </header>

      <main className="flex-1 p-6 space-y-6 ml-20">
        <MaterialSettings />
      </main>
    </PageWrapper>
  );
}
