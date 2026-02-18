import { useState, useMemo, useEffect, useRef } from 'react';
import { PageWrapper } from '@/components/PageWrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';
import { 
  Folder, 
  Search, 
  FileText, 
  Download,
  Eye,
  Calendar,
  Euro,
  User,
  Building,
  ArrowUpDown,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { downloadQuotePDF } from '@/lib/quotes/pdf-generator';
import { loadQuote, loadQuotes, saveQuote, deleteQuote } from '@/lib/storage/quotes';
import { Quote as NewQuote, generateId, generateQuoteNumber, calculateExpirationDate } from '@/lib/quotes/types';
import { calculateQuoteTotals } from '@/lib/quotes/calculations';

interface QuoteItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface Quote {
  id: string;
  clientId: string;
  clientName: string;
  chantierId: string;
  chantierName: string;
  items: QuoteItem[];
  subtotal: number;
  tva: number;
  total: number;
  validityDays: number;
  createdAt: string;
  isSigned?: boolean;
}

export default function DossiersPage() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [location] = useLocation();
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [quoteToDelete, setQuoteToDelete] = useState<Quote | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const { toast } = useToast();
  const previousQuotesLengthRef = useRef(0);


  // Charger les devis depuis Supabase avec rafraîchissement automatique
  useEffect(() => {
    loadQuotesFromSupabase();
    
    // Écouter les événements personnalisés de mise à jour
    const handleQuotesUpdate = () => {
      loadQuotesFromSupabase();
    };
    
    window.addEventListener('quotesUpdated', handleQuotesUpdate);
    
    return () => {
      window.removeEventListener('quotesUpdated', handleQuotesUpdate);
    };
  }, []);

  const loadQuotesFromSupabase = async () => {
    try {
      const quotesFromSupabase = await loadQuotes();
      
      // Adapter le nouveau format (NewQuote) vers l'ancien format (Quote) pour DossiersPage
      const adaptedQuotes: Quote[] = quotesFromSupabase.map(quote => ({
        id: quote.id,
        clientId: quote.client?.id || '',
        clientName: quote.client?.name || '',
        chantierId: quote.chantier?.id || '',
        chantierName: quote.chantier?.name || '',
        items: quote.lines?.map(line => ({
          id: line.id,
          description: line.description,
          quantity: line.quantity,
          unitPrice: line.unitPriceHT || 0,
          total: line.totalTTC || 0
        })) || [],
        subtotal: quote.totalHT || 0,
        tva: quote.totalTVA || 0,
        total: quote.totalTTC || 0,
        validityDays: quote.validityDays || 30,
        createdAt: quote.createdAt || quote.issueDate || new Date().toISOString(),
        isSigned: quote.isSigned ?? false
      }));
      
      setQuotes(adaptedQuotes);
      previousQuotesLengthRef.current = adaptedQuotes.length;
    } catch (error) {
      console.error('Erreur lors du chargement des devis:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les devis',
        variant: 'destructive',
      });
    }
  };

  // Filtrer les devis selon l'onglet actif
  const filteredByTab = useMemo(() => {
    return quotes;
  }, [quotes]);

  // Recherche et tri
  const filteredAndSortedQuotes = useMemo(() => {
    let filtered = filteredByTab;

    // Recherche
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(quote =>
        quote.clientName.toLowerCase().includes(query) ||
        quote.chantierName.toLowerCase().includes(query) ||
        (quote.total ?? 0).toString().includes(query)
      );
    }

    // Tri
    const sorted = [...filtered].sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'amount':
          comparison = (a.total ?? 0) - (b.total ?? 0);
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }, [filteredByTab, searchQuery, sortBy, sortOrder]);

  // Statistiques
  const stats = useMemo(() => {
    const total = quotes.length;
    return { total };
  }, [quotes]);

  // Ouvrir les détails d'un devis
  const handleViewDetails = (quote: Quote) => {
    setSelectedQuote(quote);
    setIsDetailDialogOpen(true);
  };

  // Exporter un devis en PDF
  const handleExportQuote = async (quote: Quote) => {
    try {
      // Afficher un toast de chargement
      toast({
        title: 'Export en cours',
        description: `Génération du PDF pour le devis ${quote.id}...`,
      });

      // Charger le devis depuis Supabase
      const rawQuote = await loadQuote(quote.id);
      
      if (!rawQuote) {
        toast({
          title: 'Erreur',
          description: 'Devis introuvable',
          variant: 'destructive',
        });
        return;
      }

      // Le devis est déjà au nouveau format depuis Supabase
      const fullQuote: NewQuote = rawQuote;

      // Générer et télécharger le PDF
      downloadQuotePDF(fullQuote);
      
      toast({
        title: 'Export réussi',
        description: 'Le PDF a été téléchargé avec succès',
      });
    } catch (error) {
      console.error('Erreur lors de l\'export:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible d\'exporter le devis',
        variant: 'destructive',
      });
    }
  };

  // Supprimer un devis
  const handleDeleteQuote = (quote: Quote) => {
    setQuoteToDelete(quote);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteQuote = async () => {
    if (!quoteToDelete) return;

    try {
      // Supprimer depuis Supabase
      await deleteQuote(quoteToDelete.id);
      
      // Mettre à jour l'affichage
      const updatedQuotes = quotes.filter(q => q.id !== quoteToDelete.id);
      setQuotes(updatedQuotes);
      previousQuotesLengthRef.current = updatedQuotes.length;
      
      toast({
        title: 'Devis supprimé',
        description: `Le devis "${quoteToDelete.chantierName}" a été supprimé avec succès`,
      });
      
      setIsDeleteDialogOpen(false);
      setQuoteToDelete(null);
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer le devis',
        variant: 'destructive',
      });
    }
  };

  return (
    <PageWrapper>
      <header className="bg-black/20 backdrop-blur-xl border-b border-white/10 px-6 py-4 rounded-tl-3xl ml-20 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Folder className="h-6 w-6" />
              Dossiers
            </h1>
            <p className="text-sm text-white/70">Gérez tous vos devis et suivez leur statut</p>
          </div>
        </div>
      </header>

      <main className="flex-1 p-6 ml-20">
        {/* Statistiques */}
        <div className="grid grid-cols-1 gap-4 mb-6">
          <Card className="bg-black/20 backdrop-blur-xl border border-white/10 text-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white/70">Total des devis</p>
                  <p className="text-2xl font-bold text-white">{stats.total}</p>
                </div>
                <FileText className="h-8 w-8 text-violet-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Barre de recherche et tri */}
        <Card className="bg-black/20 backdrop-blur-xl border border-white/10 text-white mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/50" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher par client, chantier ou montant..."
                  className="pl-10 bg-black/20 backdrop-blur-md border-white/10 text-white placeholder:text-white/50"
                />
              </div>
              <div className="flex gap-2">
                <Select value={sortBy} onValueChange={(value: 'date' | 'amount') => setSortBy(value)}>
                  <SelectTrigger className="w-[180px] bg-black/20 backdrop-blur-md border-white/10 text-white">
                    <ArrowUpDown className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Trier par" />
                  </SelectTrigger>
                  <SelectContent className="bg-black/20 backdrop-blur-xl border-white/10">
                    <SelectItem value="date">Date</SelectItem>
                    <SelectItem value="amount">Montant</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="text-white border-white/20 hover:bg-white/10"
                >
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Onglets */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-black/20 backdrop-blur-xl border border-white/10 mb-6">
            <TabsTrigger 
              value="all" 
              className="data-[state=active]:bg-violet-500/20 data-[state=active]:text-violet-300 text-white/70"
            >
              Tous les devis ({quotes.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-0">
            <AnimatePresence mode="wait">
              {filteredAndSortedQuotes.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="text-center py-12"
                >
                  <Folder className="h-16 w-16 text-white/20 mx-auto mb-4" />
                  <p className="text-white/70 text-lg">Aucun devis trouvé</p>
                  <p className="text-white/50 text-sm mt-2">
                    {searchQuery ? 'Essayez une autre recherche' : 'Créez votre premier devis'}
                  </p>
                </motion.div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredAndSortedQuotes.map((quote) => (
                    <motion.div
                      key={quote.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                    >
                      <Card className="bg-black/20 backdrop-blur-xl border border-white/10 text-white hover:border-violet-500/50 transition-all">
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <CardTitle className="text-white text-lg mb-2">{quote.chantierName}</CardTitle>
                              <div className="flex items-center gap-2 text-sm text-white/70 mb-2">
                                <User className="h-4 w-4" />
                                <span>{quote.clientName}</span>
                              </div>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2 text-white/70">
                              <Calendar className="h-4 w-4" />
                              <span>
                                {new Date(quote.createdAt).toLocaleDateString('fr-FR', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric'
                                })}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 text-white font-semibold">
                              <Euro className="h-4 w-4" />
                              <span>{(quote.total ?? 0).toFixed(2)}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 text-sm text-white/70">
                            <Building className="h-4 w-4" />
                            <span>Validité: {quote.validityDays} jours</span>
                          </div>

                          <div className="flex gap-2 pt-2 border-t border-white/10">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewDetails(quote)}
                              className="text-white border-white/20 hover:bg-white/10"
                              title="Voir les détails"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleExportQuote(quote)}
                              className="text-white border-white/20 hover:bg-white/10"
                              title="Télécharger le devis"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteQuote(quote)}
                              className="text-white border-red-500/50 hover:bg-red-500/20 hover:border-red-500"
                              title="Supprimer le devis"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </AnimatePresence>
          </TabsContent>
        </Tabs>

        {/* Dialog de détails */}
        <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
          <DialogContent className="bg-black/20 backdrop-blur-xl border border-white/10 text-white max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-white">Détails du Devis</DialogTitle>
            </DialogHeader>
            {selectedQuote && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-black/20 rounded-lg">
                    <h3 className="font-semibold text-white mb-2 flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Client
                    </h3>
                    <p className="text-white">{selectedQuote.clientName}</p>
                  </div>
                  <div className="p-4 bg-black/20 rounded-lg">
                    <h3 className="font-semibold text-white mb-2 flex items-center gap-2">
                      <Building className="h-4 w-4" />
                      Chantier
                    </h3>
                    <p className="text-white">{selectedQuote.chantierName}</p>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-white mb-3">Détail des prestations</h3>
                  <div className="space-y-2">
                    {selectedQuote.items.map((item, index) => (
                      <div
                        key={item.id || index}
                        className="flex justify-between items-center p-3 bg-black/20 rounded-lg"
                      >
                        <div className="flex-1">
                          <p className="text-white">{item.description || 'Prestation'}</p>
                          <p className="text-sm text-white/70">
                            {item.quantity} × {item.unitPrice.toFixed(2)} €
                          </p>
                        </div>
                        <p className="text-white font-semibold">{item.total.toFixed(2)} €</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-white/10 pt-4 space-y-2">
                  <div className="flex justify-between text-white/70">
                    <span>Sous-total HT</span>
                    <span>{(selectedQuote.subtotal ?? 0).toFixed(2)} €</span>
                  </div>
                  <div className="flex justify-between text-white/70">
                    <span>TVA (20%)</span>
                    <span>{(selectedQuote.tva ?? 0).toFixed(2)} €</span>
                  </div>
                  <div className="flex justify-between text-white font-bold text-lg pt-2 border-t border-white/10">
                    <span>Total TTC</span>
                    <span className="text-violet-300">{(selectedQuote.total ?? 0).toFixed(2)} €</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/10">
                  <div>
                    <p className="text-sm text-white/70">Date de création</p>
                    <p className="text-white">
                      {new Date(selectedQuote.createdAt).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Dialog de confirmation de suppression */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent className="bg-black/20 backdrop-blur-xl border border-red-500/50 text-white">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-400" />
                Confirmer la suppression
              </DialogTitle>
            </DialogHeader>
            {quoteToDelete && (
              <div className="space-y-4">
                <p className="text-white/90">
                  Êtes-vous sûr de vouloir supprimer le devis <strong>"{quoteToDelete.chantierName}"</strong> ?
                </p>
                <div className="p-4 bg-black/20 rounded-lg space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-white/70">Client:</span>
                    <span className="text-white">{quoteToDelete.clientName}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-white/70">Montant:</span>
                    <span className="text-white font-semibold">{(quoteToDelete.total ?? 0).toFixed(2)} €</span>
                  </div>
                </div>
                <p className="text-red-300 text-sm">
                  ⚠️ Cette action est irréversible. Le devis sera définitivement supprimé.
                </p>
                <div className="flex gap-3 justify-end pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsDeleteDialogOpen(false);
                      setQuoteToDelete(null);
                    }}
                    className="text-white border-white/20 hover:bg-white/10"
                  >
                    Annuler
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={confirmDeleteQuote}
                    className="bg-red-500/20 hover:bg-red-500/30 text-red-300 border-red-500/50"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Supprimer définitivement
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </PageWrapper>
  );
}
