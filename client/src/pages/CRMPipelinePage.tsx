import { useState } from 'react';
import { PageWrapper } from '@/components/PageWrapper';
import { CRMPipeline } from '@/components/CRMPipeline';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Plus } from 'lucide-react';
import { createProspect } from '@/lib/supabase/prospects';
import { useAuth } from '@/context/AuthContext';

export default function CRMPipelinePage() {
  const { user } = useAuth();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newProspect, setNewProspect] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    notes: ''
  });

  const handleAddProspect = async () => {
    if (!newProspect.name || !newProspect.email) {
      alert('Veuillez remplir au moins le nom et l\'email');
      return;
    }

    try {
      await createProspect({
        name: newProspect.name,
        email: newProspect.email,
        phone: newProspect.phone || undefined,
        company: newProspect.company || undefined,
        notes: newProspect.notes || undefined,
        status: 'nouveau',
        column_id: 'all'
      });

      // Réinitialiser le formulaire
      setNewProspect({ name: '', email: '', phone: '', company: '', notes: '' });
      setShowAddDialog(false);
      
      // Déclencher un événement pour recharger les prospects
      window.dispatchEvent(new Event('prospectsUpdated'));
    } catch (error) {
      console.error('Error adding prospect:', error);
      alert('Erreur lors de l\'ajout du prospect');
    }
  };

  return (
    <PageWrapper>
      <header className="bg-black/20 backdrop-blur-xl border-b border-white/10 px-6 py-4 rounded-tl-3xl ml-20">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">
              CRM Pipeline
            </h1>
            <p className="text-sm text-white/70">Gérez vos prospects et automatisez vos workflows</p>
          </div>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button className="bg-white/20 backdrop-blur-md text-white border border-white/10 hover:bg-white/30">
                <Plus className="h-4 w-4 mr-2" />
                Ajouter un prospect
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-black/20 backdrop-blur-xl border border-white/10 text-white">
              <DialogHeader>
                <DialogTitle>Nouveau Prospect</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Nom *</label>
                  <Input
                    value={newProspect.name}
                    onChange={(e) => setNewProspect({ ...newProspect, name: e.target.value })}
                    className="bg-black/20 backdrop-blur-md border-white/10 text-white"
                    placeholder="Nom du prospect"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Email *</label>
                  <Input
                    type="email"
                    value={newProspect.email}
                    onChange={(e) => setNewProspect({ ...newProspect, email: e.target.value })}
                    className="bg-black/20 backdrop-blur-md border-white/10 text-white"
                    placeholder="email@example.com"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Téléphone</label>
                  <Input
                    type="tel"
                    value={newProspect.phone}
                    onChange={(e) => setNewProspect({ ...newProspect, phone: e.target.value })}
                    className="bg-black/20 backdrop-blur-md border-white/10 text-white"
                    placeholder="06 12 34 56 78"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Entreprise</label>
                  <Input
                    value={newProspect.company}
                    onChange={(e) => setNewProspect({ ...newProspect, company: e.target.value })}
                    className="bg-black/20 backdrop-blur-md border-white/10 text-white"
                    placeholder="Nom de l'entreprise"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Notes</label>
                  <textarea
                    value={newProspect.notes}
                    onChange={(e) => setNewProspect({ ...newProspect, notes: e.target.value })}
                    className="w-full px-3 py-2 rounded-md border bg-black/20 backdrop-blur-md border-white/10 text-white placeholder:text-white/50 min-h-[100px]"
                    placeholder="Notes sur le prospect..."
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setShowAddDialog(false)}
                    className="text-white border-white/20 hover:bg-white/10"
                  >
                    Annuler
                  </Button>
                  <Button
                    onClick={handleAddProspect}
                    className="bg-white/20 backdrop-blur-md text-white border border-white/10 hover:bg-white/30"
                  >
                    Ajouter
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <main className="flex-1 p-6 space-y-6 ml-20">
        {/* CRM Pipeline */}
        <CRMPipeline />
      </main>
    </PageWrapper>
  );
}

