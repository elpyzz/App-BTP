import { useState, useMemo } from 'react';
import { PageWrapper } from '@/components/PageWrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, 
  Plus, 
  Trash2, 
  Download,
  Calculator,
  User,
  Building,
  Euro,
  ArrowLeft,
  ArrowRight,
  Search,
  Wand2,
  Mail,
  CheckCircle2,
  Calendar,
  Clock
} from 'lucide-react';
import { useChantiers, Client, Chantier } from '@/context/ChantiersContext';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';

interface QuoteItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export default function QuotesPage() {
  const { clients, chantiers, addClient, addChantier, updateChantier } = useChantiers();
  const { toast } = useToast();
  
  // États de navigation
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedChantier, setSelectedChantier] = useState<Chantier | null>(null);
  const [clientChantiers, setClientChantiers] = useState<Chantier[]>([]);
  
  // États de recherche et dialogs
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [chantierSearchQuery, setChantierSearchQuery] = useState('');
  const [isClientDialogOpen, setIsClientDialogOpen] = useState(false);
  const [isChantierDialogOpen, setIsChantierDialogOpen] = useState(false);
  const [isSelectChantierDialogOpen, setIsSelectChantierDialogOpen] = useState(false);
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  
  // États pour les formulaires
  const [newClient, setNewClient] = useState({ name: '', email: '', phone: '', address: '' });
  const [newChantier, setNewChantier] = useState({
    nom: '',
    dateDebut: '',
    duree: '',
    images: [] as string[]
  });
  
  // États pour le devis
  const [validityDays, setValidityDays] = useState('30');
  const [items, setItems] = useState<QuoteItem[]>([
    { id: '1', description: '', quantity: 1, unitPrice: 0, total: 0 }
  ]);

  // Filtrer les clients par recherche
  const filteredClients = useMemo(() => {
    if (!clientSearchQuery) return clients;
    const query = clientSearchQuery.toLowerCase();
    return clients.filter(c => 
      c.name.toLowerCase().includes(query) || 
      c.email.toLowerCase().includes(query)
    );
  }, [clients, clientSearchQuery]);

  // Filtrer les chantiers par recherche
  const filteredChantiers = useMemo(() => {
    if (!chantierSearchQuery) return chantiers;
    const query = chantierSearchQuery.toLowerCase();
    return chantiers.filter(c => 
      c.nom.toLowerCase().includes(query) ||
      c.clientName.toLowerCase().includes(query)
    );
  }, [chantiers, chantierSearchQuery]);

  // Détecter les chantiers du client sélectionné
  const getClientChantiers = useMemo(() => {
    if (!selectedClient) return [];
    return chantiers.filter(c => c.clientId === selectedClient.id);
  }, [selectedClient, chantiers]);

  // Gestion des clients
  const handleCreateClient = () => {
    if (!newClient.name || !newClient.email || !newClient.phone) return;
    
    const client: Client = {
      id: Date.now().toString(),
      name: newClient.name,
      email: newClient.email,
      phone: newClient.phone
    };
    
    addClient(client);
    setSelectedClient(client);
    setNewClient({ name: '', email: '', phone: '', address: '' });
    setIsClientDialogOpen(false);
    setClientChantiers(getClientChantiers);
    setCurrentStep(2);
  };

  const handleSelectClient = (client: Client) => {
    setSelectedClient(client);
    setClientChantiers(chantiers.filter(c => c.clientId === client.id));
    setCurrentStep(2);
  };

  // Gestion des chantiers
  const handleCreateChantier = () => {
    if (!newChantier.nom || !newChantier.dateDebut || !newChantier.duree || !selectedClient) return;
    
    const chantier: Chantier = {
      id: Date.now().toString(),
      nom: newChantier.nom,
      clientId: selectedClient.id,
      clientName: selectedClient.name,
      dateDebut: newChantier.dateDebut,
      duree: newChantier.duree,
      images: newChantier.images,
      statut: 'planifié'
    };
    
    addChantier(chantier);
    setSelectedChantier(chantier);
    setNewChantier({ nom: '', dateDebut: '', duree: '', images: [] });
    setIsChantierDialogOpen(false);
    setCurrentStep(3);
  };

  const handleSelectExistingChantier = (chantier: Chantier) => {
    if (!selectedClient) return;
    
    // Lier le chantier au client sélectionné
    updateChantier(chantier.id, {
      clientId: selectedClient.id,
      clientName: selectedClient.name
    });
    
    setSelectedChantier({ ...chantier, clientId: selectedClient.id, clientName: selectedClient.name });
    setIsSelectChantierDialogOpen(false);
    setCurrentStep(3);
  };

  const handleSelectClientChantier = (chantier: Chantier) => {
    setSelectedChantier(chantier);
    setCurrentStep(3);
  };

  // Gestion des lignes de devis
  const addItem = () => {
    const newItem: QuoteItem = {
      id: Date.now().toString(),
      description: '',
      quantity: 1,
      unitPrice: 0,
      total: 0
    };
    setItems([...items, newItem]);
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const updateItem = (id: string, field: keyof QuoteItem, value: string | number) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };
        if (field === 'quantity' || field === 'unitPrice') {
          updatedItem.total = updatedItem.quantity * updatedItem.unitPrice;
        }
        return updatedItem;
      }
      return item;
    }));
  };

  // Calculs
  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const tva = subtotal * 0.2;
  const total = subtotal + tva;

  // Navigation
  const handleNext = () => {
    if (currentStep === 1 && selectedClient) {
      setCurrentStep(2);
    } else if (currentStep === 2 && selectedChantier) {
      setCurrentStep(3);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Actions du devis
  const handleGenerateWithAI = () => {
    toast({
      title: 'Fonctionnalité en développement',
      description: 'La génération automatique avec IA sera disponible prochainement',
    });
  };

  const handleSaveQuote = () => {
    // Validations
    if (!selectedClient || !selectedChantier) {
      toast({
        title: 'Erreur',
        description: 'Veuillez sélectionner un client et un chantier',
        variant: 'destructive',
      });
      return;
    }
    
    // Vérifier qu'il y a au moins une ligne avec des informations
    const validItems = items.filter(item => 
      item.description.trim() !== '' && 
      item.quantity > 0 && 
      item.unitPrice > 0
    );
    
    if (validItems.length === 0) {
      toast({
        title: 'Erreur',
        description: 'Veuillez ajouter au moins une prestation au devis',
        variant: 'destructive',
      });
      return;
    }
    
    // Vérifier la validité
    if (!validityDays || parseInt(validityDays) <= 0) {
      toast({
        title: 'Erreur',
        description: 'Veuillez indiquer une validité en jours valide',
        variant: 'destructive',
      });
      return;
    }
    
    // Calculer les totaux avec les items valides uniquement
    const validSubtotal = validItems.reduce((sum, item) => sum + item.total, 0);
    const validTva = validSubtotal * 0.2;
    const validTotal = validSubtotal + validTva;
    
    const quote = {
      id: Date.now().toString(),
      clientId: selectedClient.id,
      clientName: selectedClient.name,
      chantierId: selectedChantier.id,
      chantierName: selectedChantier.nom,
      items: validItems,
      subtotal: validSubtotal,
      tva: validTva,
      total: validTotal,
      validityDays: parseInt(validityDays),
      createdAt: new Date().toISOString(),
      isSigned: false
    };
    
    // Sauvegarder dans localStorage
    const quotes = JSON.parse(localStorage.getItem('quotes_data') || '[]');
    quotes.push(quote);
    localStorage.setItem('quotes_data', JSON.stringify(quotes));
    
    // Déclencher un événement personnalisé pour notifier les autres composants
    window.dispatchEvent(new Event('quotesUpdated'));
    
    toast({
      title: 'Devis enregistré',
      description: `Le devis pour ${selectedClient.name} a été enregistré avec succès`,
    });
  };

  const handleDownloadPDF = () => {
    // Validations
    if (!selectedClient || !selectedChantier) {
      toast({
        title: 'Erreur',
        description: 'Veuillez compléter toutes les informations du devis',
        variant: 'destructive',
      });
      return;
    }
    
    // Filtrer les items valides
    const validItems = items.filter(item => 
      item.description.trim() !== '' && 
      item.quantity > 0 && 
      item.unitPrice > 0
    );
    
    if (validItems.length === 0) {
      toast({
        title: 'Erreur',
        description: 'Veuillez ajouter au moins une prestation au devis',
        variant: 'destructive',
      });
      return;
    }
    
    // Calculer les totaux
    const validSubtotal = validItems.reduce((sum, item) => sum + item.total, 0);
    const validTva = validSubtotal * 0.2;
    const validTotal = validSubtotal + validTva;
    
    // Créer le document PDF
    const doc = new jsPDF();
    
    // En-tête
    doc.setFontSize(20);
    doc.text('DEVIS', 105, 20, { align: 'center' });
    
    // Informations entreprise
    doc.setFontSize(12);
    doc.text('Aos Renov', 20, 35);
    doc.setFontSize(10);
    doc.text('Construire pour durer', 20, 42);
    doc.text('contact@aosrenov.fr', 20, 49);
    doc.text('+33 X XX XX XX XX', 20, 56);
    
    // Informations client
    doc.setFontSize(14);
    doc.text('Client:', 20, 70);
    doc.setFontSize(12);
    doc.text(selectedClient.name, 20, 77);
    doc.text(selectedClient.email, 20, 84);
    if (selectedClient.phone) {
      doc.text(selectedClient.phone, 20, 91);
    }
    if (newClient.address) {
      doc.text(newClient.address, 20, 98);
    }
    
    // Informations chantier
    doc.setFontSize(14);
    doc.text('Chantier:', 120, 70);
    doc.setFontSize(12);
    doc.text(selectedChantier.nom, 120, 77);
    doc.text(`Date de début: ${new Date(selectedChantier.dateDebut).toLocaleDateString('fr-FR')}`, 120, 84);
    doc.text(`Durée: ${selectedChantier.duree}`, 120, 91);
    
    // Date du devis et validité
    doc.setFontSize(10);
    doc.text(`Date: ${new Date().toLocaleDateString('fr-FR')}`, 20, 105);
    doc.text(`Validité: ${validityDays} jours`, 20, 112);
    doc.text(`N° ${Date.now().toString().slice(-6)}`, 170, 105, { align: 'right' });
    
    // Tableau des prestations
    let yPos = 125;
    doc.setFontSize(12);
    doc.text('Description', 20, yPos);
    doc.text('Qté', 120, yPos);
    doc.text('Prix U.', 140, yPos);
    doc.text('Total', 170, yPos);
    
    // Ligne de séparation
    doc.line(20, yPos + 2, 190, yPos + 2);
    
    yPos += 10;
    doc.setFontSize(10);
    validItems.forEach((item) => {
      // Description (tronquée si trop longue)
      const description = item.description.length > 50 
        ? item.description.substring(0, 47) + '...' 
        : item.description;
      doc.text(description, 20, yPos);
      doc.text(item.quantity.toString(), 120, yPos);
      doc.text(`${item.unitPrice.toFixed(2)} €`, 140, yPos);
      doc.text(`${item.total.toFixed(2)} €`, 170, yPos);
      yPos += 7;
      
      // Nouvelle page si nécessaire
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }
    });
    
    // Totaux
    yPos += 10;
    doc.setFontSize(10);
    doc.text('Sous-total HT:', 140, yPos);
    doc.text(`${validSubtotal.toFixed(2)} €`, 170, yPos);
    yPos += 7;
    doc.text('TVA (20%):', 140, yPos);
    doc.text(`${validTva.toFixed(2)} €`, 170, yPos);
    yPos += 7;
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('Total TTC:', 140, yPos);
    doc.text(`${validTotal.toFixed(2)} €`, 170, yPos);
    
    // Footer avec conditions
    yPos = 280;
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.text(
      `Ce devis est valable ${validityDays} jours à compter de sa date d'émission. Les prix sont exprimés en euros TTC.`,
      20,
      yPos,
      { maxWidth: 170, align: 'justify' }
    );
    
    // Télécharger le PDF
    const fileName = `Devis_${selectedClient.name.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.pdf`;
    doc.save(fileName);
    
    toast({
      title: 'Succès',
      description: 'Le devis a été téléchargé en PDF',
    });
  };

  const handleSendEmail = () => {
    toast({
      title: 'Fonctionnalité en développement',
      description: 'L\'envoi par email sera disponible prochainement',
    });
  };

  return (
    <PageWrapper>
      <header className="bg-black/20 backdrop-blur-xl border-b border-white/10 px-6 py-4 rounded-tl-3xl ml-20">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">
              Générateur de Devis
            </h1>
            <p className="text-sm text-white/70">Créez des devis professionnels en quelques clics</p>
          </div>
        </div>
      </header>

      <main className="flex-1 p-6 ml-20">
        {/* Progress Stepper */}
        <div className="mb-8">
          <div className="flex items-center justify-center gap-4">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all ${
                  currentStep >= step
                    ? 'bg-violet-500 border-violet-500 text-white'
                    : 'bg-transparent border-white/20 text-white/50'
                }`}>
                  {currentStep > step ? <CheckCircle2 className="h-5 w-5" /> : step}
                </div>
                {step < 3 && (
                  <div className={`w-16 h-1 mx-2 transition-all ${
                    currentStep > step ? 'bg-violet-500' : 'bg-white/20'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-center gap-16 mt-2">
            <span className={`text-sm ${currentStep >= 1 ? 'text-white' : 'text-white/50'}`}>Client</span>
            <span className={`text-sm ${currentStep >= 2 ? 'text-white' : 'text-white/50'}`}>Chantier</span>
            <span className={`text-sm ${currentStep >= 3 ? 'text-white' : 'text-white/50'}`}>Devis</span>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {/* ÉTAPE 1 : Sélection du client */}
          {currentStep === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-4xl mx-auto"
            >
              <Card className="bg-black/20 backdrop-blur-xl border border-white/10 text-white">
                <CardHeader>
                  <CardTitle className="text-white">Étape 1/3 - Sélection du Client</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Bouton créer nouveau client */}
                  <Dialog open={isClientDialogOpen} onOpenChange={setIsClientDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="w-full bg-violet-500/20 hover:bg-violet-500/30 text-white border border-violet-500/50">
                        <Plus className="h-4 w-4 mr-2" />
                        Créer un nouveau client
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-black/20 backdrop-blur-xl border border-white/10 text-white">
                      <DialogHeader>
                        <DialogTitle className="text-white">Nouveau Client</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label className="text-white">Nom</Label>
                          <Input
                            value={newClient.name}
                            onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                            placeholder="Nom du client"
                            className="bg-black/20 backdrop-blur-md border-white/10 text-white placeholder:text-white/50"
                          />
                        </div>
                        <div>
                          <Label className="text-white">Email</Label>
                          <Input
                            type="email"
                            value={newClient.email}
                            onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                            placeholder="email@example.com"
                            className="bg-black/20 backdrop-blur-md border-white/10 text-white placeholder:text-white/50"
                          />
                        </div>
                        <div>
                          <Label className="text-white">Téléphone</Label>
                          <Input
                            type="tel"
                            value={newClient.phone}
                            onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                            placeholder="06 12 34 56 78"
                            className="bg-black/20 backdrop-blur-md border-white/10 text-white placeholder:text-white/50"
                          />
                        </div>
                        <div>
                          <Label className="text-white">Adresse (optionnel)</Label>
                          <Input
                            value={newClient.address}
                            onChange={(e) => setNewClient({ ...newClient, address: e.target.value })}
                            placeholder="Adresse complète"
                            className="bg-black/20 backdrop-blur-md border-white/10 text-white placeholder:text-white/50"
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            onClick={() => setIsClientDialogOpen(false)}
                            className="text-white border-white/20 hover:bg-white/10"
                          >
                            Annuler
                          </Button>
                          <Button
                            onClick={handleCreateClient}
                            disabled={!newClient.name || !newClient.email || !newClient.phone}
                            className="bg-violet-500 hover:bg-violet-600 text-white"
                          >
                            Créer
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>

                  {/* Section sélection client existant */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Search className="h-5 w-5 text-white/70" />
                      <h3 className="text-lg font-semibold text-white">Sélectionner un client existant</h3>
                    </div>
                    
                    {/* Recherche */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/50" />
                      <Input
                        value={clientSearchQuery}
                        onChange={(e) => setClientSearchQuery(e.target.value)}
                        placeholder="Rechercher par nom ou email..."
                        className="pl-10 bg-black/20 backdrop-blur-md border-white/10 text-white placeholder:text-white/50"
                      />
                    </div>

                    {/* Liste des clients */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                      {filteredClients.map((client) => (
                        <Card
                          key={client.id}
                          onClick={() => handleSelectClient(client)}
                          className={`p-4 cursor-pointer transition-all hover:scale-105 ${
                            selectedClient?.id === client.id
                              ? 'bg-violet-500/20 border-violet-500/50'
                              : 'bg-black/20 border-white/10 hover:border-white/30'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-full bg-violet-500/20 flex items-center justify-center">
                              <User className="h-5 w-5 text-violet-400" />
                            </div>
                            <div className="flex-1">
                              <h4 className="font-semibold text-white">{client.name}</h4>
                              <p className="text-sm text-white/70">{client.email}</p>
                              <p className="text-sm text-white/70">{client.phone}</p>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>

                    {filteredClients.length === 0 && (
                      <div className="text-center py-8 text-white/50">
                        Aucun client trouvé
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* ÉTAPE 2 : Sélection du chantier */}
          {currentStep === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-4xl mx-auto"
            >
              <Card className="bg-black/20 backdrop-blur-xl border border-white/10 text-white">
                <CardHeader>
                  <CardTitle className="text-white">Étape 2/3 - Sélection du Chantier</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Récapitulatif client */}
                  {selectedClient && (
                    <Card className="bg-violet-500/10 border-violet-500/30">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <User className="h-5 w-5 text-violet-400" />
                          <div>
                            <p className="font-semibold text-white">{selectedClient.name}</p>
                            <p className="text-sm text-white/70">{selectedClient.email}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Chantiers du client */}
                  {getClientChantiers.length > 0 && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-white">Chantiers du client</h3>
                      <div className="grid grid-cols-1 gap-3">
                        {getClientChantiers.map((chantier) => (
                          <Card
                            key={chantier.id}
                            className="p-4 bg-black/20 border-white/10 hover:border-white/30 transition-all cursor-pointer"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <h4 className="font-semibold text-white">{chantier.nom}</h4>
                                <div className="flex items-center gap-4 mt-2 text-sm text-white/70">
                                  <div className="flex items-center gap-1">
                                    <Calendar className="h-4 w-4" />
                                    {new Date(chantier.dateDebut).toLocaleDateString('fr-FR')}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Clock className="h-4 w-4" />
                                    {chantier.duree}
                                  </div>
                                  <span className={`px-2 py-0.5 rounded text-xs ${
                                    chantier.statut === 'planifié' ? 'bg-blue-500/20 text-blue-300' :
                                    chantier.statut === 'en cours' ? 'bg-yellow-500/20 text-yellow-300' :
                                    'bg-green-500/20 text-green-300'
                                  }`}>
                                    {chantier.statut}
                                  </span>
                                </div>
                              </div>
                              <Button
                                onClick={() => handleSelectClientChantier(chantier)}
                                className="bg-violet-500 hover:bg-violet-600 text-white"
                              >
                                Sélectionner
                              </Button>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Boutons d'action */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Dialog open={isChantierDialogOpen} onOpenChange={setIsChantierDialogOpen}>
                      <DialogTrigger asChild>
                        <Button className="w-full bg-violet-500/20 hover:bg-violet-500/30 text-white border border-violet-500/50">
                          <Plus className="h-4 w-4 mr-2" />
                          Créer un nouveau chantier
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-black/20 backdrop-blur-xl border border-white/10 text-white max-w-2xl">
                        <DialogHeader>
                          <DialogTitle className="text-white">Nouveau Chantier</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label className="text-white">Nom du chantier</Label>
                            <Input
                              value={newChantier.nom}
                              onChange={(e) => setNewChantier({ ...newChantier, nom: e.target.value })}
                              placeholder="Ex: Rénovation salle de bain"
                              className="bg-black/20 backdrop-blur-md border-white/10 text-white placeholder:text-white/50"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label className="text-white">Date de début</Label>
                              <Input
                                type="date"
                                value={newChantier.dateDebut}
                                onChange={(e) => setNewChantier({ ...newChantier, dateDebut: e.target.value })}
                                className="bg-black/20 backdrop-blur-md border-white/10 text-white"
                              />
                            </div>
                            <div>
                              <Label className="text-white">Durée</Label>
                              <Input
                                value={newChantier.duree}
                                onChange={(e) => setNewChantier({ ...newChantier, duree: e.target.value })}
                                placeholder="Ex: 2 semaines"
                                className="bg-black/20 backdrop-blur-md border-white/10 text-white placeholder:text-white/50"
                              />
                            </div>
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              onClick={() => setIsChantierDialogOpen(false)}
                              className="text-white border-white/20 hover:bg-white/10"
                            >
                              Annuler
                            </Button>
                            <Button
                              onClick={handleCreateChantier}
                              disabled={!newChantier.nom || !newChantier.dateDebut || !newChantier.duree}
                              className="bg-violet-500 hover:bg-violet-600 text-white"
                            >
                              Créer
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>

                    <Dialog open={isSelectChantierDialogOpen} onOpenChange={setIsSelectChantierDialogOpen}>
                      <DialogTrigger asChild>
                        <Button className="w-full bg-violet-500/20 hover:bg-violet-500/30 text-white border border-violet-500/50">
                          <Search className="h-4 w-4 mr-2" />
                          Sélectionner un chantier existant
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-black/20 backdrop-blur-xl border border-white/10 text-white max-w-2xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle className="text-white">Sélectionner un Chantier</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/50" />
                            <Input
                              value={chantierSearchQuery}
                              onChange={(e) => setChantierSearchQuery(e.target.value)}
                              placeholder="Rechercher un chantier..."
                              className="pl-10 bg-black/20 backdrop-blur-md border-white/10 text-white placeholder:text-white/50"
                            />
                          </div>
                          <div className="space-y-2">
                            {filteredChantiers.map((chantier) => (
                              <Card
                                key={chantier.id}
                                className="p-4 bg-black/20 border-white/10 hover:border-white/30 cursor-pointer"
                                onClick={() => handleSelectExistingChantier(chantier)}
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <h4 className="font-semibold text-white">{chantier.nom}</h4>
                                    <p className="text-sm text-white/70">Client: {chantier.clientName}</p>
                                    <p className="text-sm text-white/70">
                                      {new Date(chantier.dateDebut).toLocaleDateString('fr-FR')}
                                    </p>
                                  </div>
                                  <Button className="bg-violet-500 hover:bg-violet-600 text-white">
                                    Sélectionner
                                  </Button>
                                </div>
                              </Card>
                            ))}
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>

                  {/* Navigation */}
                  <div className="flex justify-between">
                    <Button
                      variant="outline"
                      onClick={handleBack}
                      className="text-white border-white/20 hover:bg-white/10"
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Retour
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* ÉTAPE 3 : Création du devis */}
          {currentStep === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-6xl mx-auto space-y-6"
            >
              {/* Récapitulatif */}
              <Card className="bg-black/20 backdrop-blur-xl border border-white/10 text-white">
                <CardHeader>
                  <CardTitle className="text-white">Étape 3/3 - Création du Devis</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-black/20 rounded-lg">
                      <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Client
                      </h4>
                      <p className="text-white">{selectedClient?.name}</p>
                      <p className="text-sm text-white/70">{selectedClient?.email}</p>
                      <p className="text-sm text-white/70">{selectedClient?.phone}</p>
                    </div>
                    <div className="p-4 bg-black/20 rounded-lg">
                      <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
                        <Building className="h-4 w-4" />
                        Chantier
                      </h4>
                      <p className="text-white">{selectedChantier?.nom}</p>
                      <p className="text-sm text-white/70">
                        {selectedChantier && new Date(selectedChantier.dateDebut).toLocaleDateString('fr-FR')}
                      </p>
                      <p className="text-sm text-white/70">{selectedChantier?.duree}</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleBack}
                    className="text-white border-white/20 hover:bg-white/10"
                  >
                    Modifier
                  </Button>
                </CardContent>
              </Card>

              {/* Détail du devis */}
              <Card className="bg-black/20 backdrop-blur-xl border border-white/10 text-white">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Calculator className="h-5 w-5" />
                    Détail du Devis
                  </CardTitle>
                  <Button
                    onClick={addItem}
                    className="bg-violet-500 hover:bg-violet-600 text-white"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Ajouter ligne
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  {items.map((item, index) => (
                    <div
                      key={item.id}
                      className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 bg-black/20 border border-white/10 rounded-lg"
                    >
                      <div className="md:col-span-5 space-y-2">
                        <Label className="text-white">Description</Label>
                        <Input
                          value={item.description}
                          onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                          placeholder="Description de la prestation"
                          className="bg-black/20 backdrop-blur-md border-white/10 text-white placeholder:text-white/50"
                        />
                      </div>
                      <div className="md:col-span-2 space-y-2">
                        <Label className="text-white">Quantité</Label>
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                          min="0"
                          step="0.1"
                          className="bg-black/20 backdrop-blur-md border-white/10 text-white"
                        />
                      </div>
                      <div className="md:col-span-2 space-y-2">
                        <Label className="text-white">Prix unitaire</Label>
                        <Input
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) => updateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                          min="0"
                          step="0.01"
                          className="bg-black/20 backdrop-blur-md border-white/10 text-white"
                        />
                      </div>
                      <div className="md:col-span-2 space-y-2">
                        <Label className="text-white">Total</Label>
                        <div className="h-10 px-3 py-2 bg-black/20 border border-white/10 rounded-lg flex items-center text-sm font-medium text-white">
                          {item.total.toFixed(2)} €
                        </div>
                      </div>
                      <div className="md:col-span-1 flex items-end">
                        {items.length > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeItem(item.id)}
                            className="text-red-400 hover:text-red-300"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}

                  <Separator className="bg-white/10" />

                  {/* Totals */}
                  <div className="space-y-2 bg-black/20 border border-white/10 p-4 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-white/70">Sous-total HT</span>
                      <span className="font-medium text-white">{subtotal.toFixed(2)} €</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-white/70">TVA (20%)</span>
                      <span className="font-medium text-white">{tva.toFixed(2)} €</span>
                    </div>
                    <Separator className="bg-white/10" />
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-white">Total TTC</span>
                      <Badge className="bg-violet-500 text-white px-4 py-2">
                        <Euro className="h-3 w-3 mr-1" />
                        {total.toFixed(2)} €
                      </Badge>
                    </div>
                  </div>

                  {/* Validité */}
                  <div className="space-y-2">
                    <Label className="text-white">Validité du devis (jours)</Label>
                    <Input
                      type="number"
                      value={validityDays}
                      onChange={(e) => setValidityDays(e.target.value)}
                      placeholder="30"
                      className="bg-black/20 backdrop-blur-md border-white/10 text-white"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Boutons d'action */}
              <div className="flex flex-wrap gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={handleGenerateWithAI}
                  className="text-white border-white/20 hover:bg-white/10"
                >
                  <Wand2 className="h-4 w-4 mr-2" />
                  Générer avec l'IA
                </Button>
                <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="text-white border-white/20 hover:bg-white/10"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Prévisualiser
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 backdrop-blur-xl border border-white/10 text-white max-w-5xl max-h-[95vh] overflow-y-auto p-0">
                    {/* En-tête avec gradient */}
                    <div className="relative bg-gradient-to-r from-violet-600/30 via-purple-600/30 to-violet-500/30 border-b border-white/10">
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-violet-500/20 via-transparent to-transparent"></div>
                      <div className="relative p-8">
                        <div className="flex items-center justify-between mb-6">
                          <div>
                            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-white to-violet-200 bg-clip-text text-transparent">
                              DEVIS
                            </h1>
                            <div className="flex items-center gap-4 text-sm text-white/80">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                <span>{new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                              </div>
                              <div className="w-1 h-1 rounded-full bg-white/40"></div>
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                <span>Validité: {validityDays} jours</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500/30 to-purple-600/30 border border-white/20 backdrop-blur-sm flex items-center justify-center mb-2">
                              <Building className="h-10 w-10 text-violet-200" />
                            </div>
                            <p className="text-xs text-white/60">N° {Date.now().toString().slice(-6)}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-8 space-y-8">
                      {/* Informations entreprise et client */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Entreprise */}
                        <div className="p-6 rounded-xl bg-gradient-to-br from-black/40 via-black/20 to-black/40 border border-white/10 backdrop-blur-sm">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center">
                              <Building className="h-5 w-5 text-violet-300" />
                            </div>
                            <h3 className="text-lg font-semibold text-white">Votre Entreprise</h3>
                          </div>
                          <div className="space-y-1 text-sm text-white/70">
                            <p>Aos Renov</p>
                            <p>Construire pour durer</p>
                            <p className="pt-2 text-white/50">contact@aosrenov.fr</p>
                            <p className="text-white/50">+33 X XX XX XX XX</p>
                          </div>
                        </div>

                        {/* Client */}
                        <div className="p-6 rounded-xl bg-gradient-to-br from-black/40 via-black/20 to-black/40 border border-white/10 backdrop-blur-sm">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                              <User className="h-5 w-5 text-purple-300" />
                            </div>
                            <h3 className="text-lg font-semibold text-white">Client</h3>
                          </div>
                          <div className="space-y-1 text-sm text-white/70">
                            <p className="font-medium text-white">{selectedClient?.name}</p>
                            <p>{selectedClient?.email}</p>
                            <p>{selectedClient?.phone}</p>
                            {newClient.address && (
                              <p className="pt-2 text-white/60">{newClient.address}</p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Informations chantier */}
                      <div className="p-6 rounded-xl bg-gradient-to-br from-violet-500/10 via-purple-500/5 to-violet-500/10 border border-violet-500/20">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 rounded-lg bg-violet-500/30 flex items-center justify-center">
                            <FileText className="h-5 w-5 text-violet-200" />
                          </div>
                          <h3 className="text-lg font-semibold text-white">Projet</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <p className="text-xs text-white/50 mb-1">Nom du chantier</p>
                            <p className="text-white font-medium">{selectedChantier?.nom}</p>
                          </div>
                          <div>
                            <p className="text-xs text-white/50 mb-1">Date de début</p>
                            <p className="text-white font-medium">
                              {selectedChantier && new Date(selectedChantier.dateDebut).toLocaleDateString('fr-FR', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric'
                              })}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-white/50 mb-1">Durée estimée</p>
                            <p className="text-white font-medium">{selectedChantier?.duree}</p>
                          </div>
                        </div>
                      </div>

                      {/* Tableau des prestations */}
                      <div className="rounded-xl overflow-hidden border border-white/10 bg-black/20 backdrop-blur-sm">
                        <div className="bg-gradient-to-r from-violet-600/20 to-purple-600/20 border-b border-white/10 p-4">
                          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                            <Calculator className="h-5 w-5" />
                            Détail des prestations
                          </h3>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="bg-black/30 border-b border-white/10">
                                <th className="text-left p-4 text-sm font-semibold text-white/90">Description</th>
                                <th className="text-center p-4 text-sm font-semibold text-white/90">Quantité</th>
                                <th className="text-right p-4 text-sm font-semibold text-white/90">Prix unitaire</th>
                                <th className="text-right p-4 text-sm font-semibold text-white/90">Total HT</th>
                              </tr>
                            </thead>
                            <tbody>
                              {items.filter(item => item.description.trim() !== '').map((item, index) => (
                                <tr 
                                  key={item.id || index} 
                                  className="border-b border-white/5 hover:bg-white/5 transition-colors"
                                >
                                  <td className="p-4 text-white/80">{item.description}</td>
                                  <td className="p-4 text-center text-white/70">{item.quantity}</td>
                                  <td className="p-4 text-right text-white/70">{item.unitPrice.toFixed(2)} €</td>
                                  <td className="p-4 text-right text-white font-medium">{item.total.toFixed(2)} €</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Totaux */}
                      <div className="flex justify-end">
                        <div className="w-full md:w-96 space-y-3">
                          <div className="p-6 rounded-xl bg-gradient-to-br from-black/40 to-black/20 border border-white/10 backdrop-blur-sm">
                            <div className="space-y-3">
                              <div className="flex justify-between items-center text-white/80">
                                <span className="text-sm">Sous-total HT</span>
                                <span className="font-medium">{subtotal.toFixed(2)} €</span>
                              </div>
                              <div className="flex justify-between items-center text-white/80">
                                <span className="text-sm">TVA (20%)</span>
                                <span className="font-medium">{tva.toFixed(2)} €</span>
                              </div>
                              <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent my-2"></div>
                              <div className="flex justify-between items-center pt-2">
                                <span className="text-lg font-bold text-white">Total TTC</span>
                                <span className="text-2xl font-bold bg-gradient-to-r from-violet-300 to-purple-300 bg-clip-text text-transparent">
                                  {total.toFixed(2)} €
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Footer avec conditions */}
                      <div className="pt-6 border-t border-white/10">
                        <div className="p-4 rounded-lg bg-black/20 border border-white/5">
                          <p className="text-xs text-white/50 leading-relaxed">
                            Ce devis est valable {validityDays} jours à compter de sa date d'émission. 
                            Les prix sont exprimés en euros TTC. Les conditions générales de vente s'appliquent.
                          </p>
                        </div>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
                <Button
                  variant="outline"
                  onClick={handleDownloadPDF}
                  className="text-white border-white/20 hover:bg-white/10"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Télécharger PDF
                </Button>
                <Button
                  onClick={handleSaveQuote}
                  className="bg-violet-500 hover:bg-violet-600 text-white"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Valider et enregistrer
                </Button>
                <Button
                  variant="outline"
                  onClick={handleSendEmail}
                  className="text-white border-white/20 hover:bg-white/10"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Envoyer par email
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </PageWrapper>
  );
}
