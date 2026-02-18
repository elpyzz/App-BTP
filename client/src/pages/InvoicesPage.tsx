import { useState } from 'react';
import { PageWrapper } from '@/components/PageWrapper';
import { InvoiceWizard } from '@/components/invoices/InvoiceWizard';
import { Invoice } from '@/lib/invoices/types';
import { useLocation } from 'wouter';

export default function InvoicesPage() {
  const [, setLocation] = useLocation();

  const handleSave = (invoice: Invoice) => {
    // Rediriger vers la page des factures après sauvegarde
    setLocation('/dashboard/invoices');
  };

  const handleCancel = () => {
    setLocation('/dashboard');
  };

  return (
    <PageWrapper>
      <header className="bg-black/20 backdrop-blur-xl border-b border-white/10 px-6 py-4 rounded-tl-3xl ml-20">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">
              Générateur de Facturation
            </h1>
            <p className="text-sm text-white/70">Créez des factures professionnelles conformes BTP</p>
          </div>
        </div>
      </header>

      <main className="flex-1 p-6 ml-20">
        <InvoiceWizard onSave={handleSave} onCancel={handleCancel} />
      </main>
    </PageWrapper>
  );
}
