import { useState, useEffect } from 'react';
import { PageWrapper } from '@/components/PageWrapper';
import { QuoteWizard } from '@/components/quotes/QuoteWizard';
import { Quote } from '@/lib/quotes/types';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { migrateAllQuotes, isMigrationDone } from '@/lib/migration/quotes';
import { useCompany } from '@/context/CompanyContext';

export default function QuotesPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { company } = useCompany();
  const [migrating, setMigrating] = useState(false);

  // Migration automatique des devis existants
  useEffect(() => {
    const performMigration = async () => {
      if (!isMigrationDone() && company) {
        setMigrating(true);
        try {
          const result = await migrateAllQuotes(company);
          if (result.migrated > 0) {
            toast({
              title: 'Migration effectuée',
              description: `${result.migrated} devis migrés vers le nouveau format`,
            });
          }
          if (result.failed > 0) {
            toast({
              title: 'Migration partielle',
              description: `${result.failed} devis n'ont pas pu être migrés`,
              variant: 'destructive',
            });
          }
        } catch (error) {
          console.error('Erreur lors de la migration:', error);
        } finally {
          setMigrating(false);
        }
      }
    };

    performMigration();
  }, [company, toast]);

  const handleSave = (quote: Quote) => {
    // Rediriger vers la page des dossiers après sauvegarde
    setLocation('/dashboard/dossiers');
  };

  const handleCancel = () => {
    setLocation('/dashboard/dossiers');
  };

  if (migrating) {
    return (
      <PageWrapper>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center text-white">
            <p>Migration des devis en cours...</p>
          </div>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <header className="bg-black/20 backdrop-blur-xl border-b border-white/10 px-4 md:px-6 py-4 rounded-tl-3xl ml-0 md:ml-20">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-white">
              Générateur de Devis
            </h1>
            <p className="text-xs md:text-sm text-white/70">Créez des devis professionnels conformes BTP</p>
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-6 ml-0 md:ml-20">
        <QuoteWizard onSave={handleSave} onCancel={handleCancel} />
      </main>
    </PageWrapper>
  );
}
