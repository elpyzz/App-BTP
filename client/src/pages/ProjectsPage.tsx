import { PageWrapper } from '@/components/PageWrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building, Plus, Calendar, Clock, User, Image as ImageIcon, X, Edit2, Trash2, Search, MoreVertical } from 'lucide-react';
import { useState, useCallback, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { useChantiers, Chantier, Client } from '@/context/ChantiersContext';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

export default function ProjectsPage() {
  const { chantiers, clients, addChantier, addClient, updateChantier, deleteChantier } = useChantiers();
  const [location] = useLocation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingChantier, setEditingChantier] = useState<Chantier | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [chantierToDelete, setChantierToDelete] = useState<string | null>(null);
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [newChantier, setNewChantier] = useState({
    nom: '',
    clientId: '',
    dateDebut: '',
    duree: '',
    images: [] as string[]
  });
  const [uploadedImages, setUploadedImages] = useState<File[]>([]);

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setUploadedImages(prev => [...prev, ...files]);
      files.forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) {
            setNewChantier(prev => ({
              ...prev,
              images: [...prev.images, e.target.result as string]
            }));
          }
        };
        reader.readAsDataURL(file);
      });
    }
  }, []);

  const removeImage = (index: number) => {
    setNewChantier(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddChantier = async () => {
    if (!newChantier.nom || !newChantier.clientId || !newChantier.dateDebut || !newChantier.duree) {
      return;
    }

    const client = clients.find(c => c.id === newChantier.clientId);
    const chantier = {
      nom: newChantier.nom,
      clientId: newChantier.clientId,
      clientName: client?.name || 'Client inconnu',
      dateDebut: newChantier.dateDebut,
      duree: newChantier.duree,
      images: newChantier.images,
      statut: 'planifié' as const
    };

    try {
      await addChantier(chantier);
      setNewChantier({ nom: '', clientId: '', dateDebut: '', duree: '', images: [] });
      setUploadedImages([]);
      setClientSearchQuery('');
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error adding chantier:', error);
      alert('Erreur lors de l\'ajout du chantier');
    }
  };

  const handleEditChantier = (chantier: Chantier) => {
    setEditingChantier(chantier);
    setNewChantier({
      nom: chantier.nom,
      clientId: chantier.clientId,
      dateDebut: chantier.dateDebut,
      duree: chantier.duree,
      images: chantier.images
    });
    setUploadedImages([]);
    setClientSearchQuery('');
    setIsEditDialogOpen(true);
  };

  const handleUpdateChantier = async () => {
    if (!editingChantier || !newChantier.nom || !newChantier.clientId || !newChantier.dateDebut || !newChantier.duree) {
      return;
    }

    const client = clients.find(c => c.id === newChantier.clientId);
    try {
      await updateChantier(editingChantier.id, {
        nom: newChantier.nom,
        clientId: newChantier.clientId,
        clientName: client?.name || 'Client inconnu',
        dateDebut: newChantier.dateDebut,
        duree: newChantier.duree,
        images: newChantier.images
      });

      setEditingChantier(null);
      setNewChantier({ nom: '', clientId: '', dateDebut: '', duree: '', images: [] });
      setUploadedImages([]);
      setClientSearchQuery('');
      setIsEditDialogOpen(false);
    } catch (error) {
      console.error('Error updating chantier:', error);
      alert('Erreur lors de la mise à jour du chantier');
    }
  };

  const handleDeleteClick = (chantierId: string) => {
    setChantierToDelete(chantierId);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (chantierToDelete) {
      try {
        await deleteChantier(chantierToDelete);
        setChantierToDelete(null);
        setDeleteConfirmOpen(false);
      } catch (error) {
        console.error('Error deleting chantier:', error);
        alert('Erreur lors de la suppression du chantier');
      }
    }
  };

  const filteredClients = clientSearchQuery
    ? clients.filter(c => 
        c.name.toLowerCase().includes(clientSearchQuery.toLowerCase()) || 
        c.email.toLowerCase().includes(clientSearchQuery.toLowerCase())
      )
    : clients;

  const handleAddClient = async () => {
    const newClient = {
      name: `Client ${clients.length + 1}`,
      email: '',
      phone: ''
    };
    try {
      await addClient(newClient);
      // Le client sera ajouté avec un ID généré par Supabase
      // On doit attendre qu'il soit ajouté pour obtenir son ID
      // Pour l'instant, on utilise un ID temporaire
      const tempId = Date.now().toString();
      setNewChantier(prev => ({ ...prev, clientId: tempId }));
    } catch (error) {
      console.error('Error adding client:', error);
      alert('Erreur lors de l\'ajout du client');
    }
  };

  // Ouvrir la popup si le paramètre openDialog est présent dans l'URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('openDialog') === 'true') {
      setIsDialogOpen(true);
      // Nettoyer l'URL
      window.history.replaceState({}, '', '/dashboard/projects');
    }
  }, [location]);

  return (
    <PageWrapper>
      <header className="bg-black/20 backdrop-blur-xl border-b border-white/10 px-6 py-4 rounded-tl-3xl ml-20">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="flex-shrink-0 min-w-0">
            <h1 className="text-2xl font-bold text-white">
              Mes Chantiers
            </h1>
            <p className="text-sm text-white/70">Gérez tous vos projets en cours et terminés</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 flex-shrink-0 ml-auto lg:ml-0 w-full lg:w-auto mr-0 lg:mr-40">
            <Link href="/dashboard/clients">
              <Button variant="outline" className="text-white border-white/20 hover:bg-white/10 whitespace-nowrap flex-shrink-0">
                <User className="h-4 w-4 mr-2" />
                Clients
              </Button>
            </Link>
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) {
                setNewChantier({ nom: '', clientId: '', dateDebut: '', duree: '', images: [] });
                setUploadedImages([]);
                setClientSearchQuery('');
              }
            }}>
              <DialogTrigger asChild>
                <Button className="bg-white/20 backdrop-blur-md text-white border border-white/10 hover:bg-white/30 whitespace-nowrap flex-shrink-0">
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter un Chantier
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

                  <div>
                    <Label className="text-white">Client</Label>
                    {clients.length > 5 && (
                      <div className="mb-2 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/50" />
                        <Input
                          value={clientSearchQuery}
                          onChange={(e) => setClientSearchQuery(e.target.value)}
                          placeholder="Rechercher un client..."
                          className="pl-10 bg-black/20 backdrop-blur-md border-white/10 text-white placeholder:text-white/50"
                        />
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Select
                        value={newChantier.clientId}
                        onValueChange={(value) => setNewChantier({ ...newChantier, clientId: value })}
                      >
                        <SelectTrigger className="bg-black/20 backdrop-blur-md border-white/10 text-white">
                          <SelectValue placeholder="Sélectionner un client" />
                        </SelectTrigger>
                        <SelectContent className="bg-black/20 backdrop-blur-xl border-white/10">
                          {filteredClients.length > 0 ? (
                            filteredClients.map((client) => (
                              <SelectItem key={client.id} value={client.id} className="text-white">
                                {client.name}
                              </SelectItem>
                            ))
                          ) : (
                            <div className="px-2 py-1.5 text-sm text-white/70">Aucun client trouvé</div>
                          )}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleAddClient}
                        className="text-white border-white/20 hover:bg-white/10"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
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

                  <div>
                    <Label className="text-white">Images</Label>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      id="chantier-images"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('chantier-images')?.click()}
                      className="w-full text-white border-white/20 hover:bg-white/10"
                    >
                      <ImageIcon className="h-4 w-4 mr-2" />
                      Ajouter des images
                    </Button>
                    {newChantier.images.length > 0 && (
                      <div className="grid grid-cols-4 gap-2 mt-2">
                        {newChantier.images.map((img, index) => (
                          <div key={index} className="relative group">
                            <img
                              src={img}
                              alt={`Preview ${index + 1}`}
                              className="w-full h-20 object-cover rounded-lg border border-white/20"
                            />
                            <button
                              onClick={() => removeImage(index)}
                              className="absolute top-1 right-1 bg-red-500/80 hover:bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                      className="text-white border-white/20 hover:bg-white/10"
                    >
                      Annuler
                    </Button>
                    <Button
                      onClick={handleAddChantier}
                      disabled={!newChantier.nom || !newChantier.clientId || !newChantier.dateDebut || !newChantier.duree}
                      className="bg-white/20 backdrop-blur-md text-white border border-white/10 hover:bg-white/30 disabled:opacity-50"
                    >
                      Ajouter
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
        setIsEditDialogOpen(open);
        if (!open) {
          setEditingChantier(null);
          setNewChantier({ nom: '', clientId: '', dateDebut: '', duree: '', images: [] });
          setUploadedImages([]);
          setClientSearchQuery('');
        }
      }}>
        <DialogContent className="bg-black/20 backdrop-blur-xl border border-white/10 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">Modifier le Chantier</DialogTitle>
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

            <div>
              <Label className="text-white">Client</Label>
              {clients.length > 5 && (
                <div className="mb-2 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/50" />
                  <Input
                    value={clientSearchQuery}
                    onChange={(e) => setClientSearchQuery(e.target.value)}
                    placeholder="Rechercher un client..."
                    className="pl-10 bg-black/20 backdrop-blur-md border-white/10 text-white placeholder:text-white/50"
                  />
                </div>
              )}
              <div className="flex gap-2">
                <Select
                  value={newChantier.clientId}
                  onValueChange={(value) => setNewChantier({ ...newChantier, clientId: value })}
                >
                  <SelectTrigger className="bg-black/20 backdrop-blur-md border-white/10 text-white">
                    <SelectValue placeholder="Sélectionner un client" />
                  </SelectTrigger>
                  <SelectContent className="bg-black/20 backdrop-blur-xl border-white/10">
                    {filteredClients.length > 0 ? (
                      filteredClients.map((client) => (
                        <SelectItem key={client.id} value={client.id} className="text-white">
                          {client.name}
                        </SelectItem>
                      ))
                    ) : (
                      <div className="px-2 py-1.5 text-sm text-white/70">Aucun client trouvé</div>
                    )}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddClient}
                  className="text-white border-white/20 hover:bg-white/10"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
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

            {editingChantier && (
              <div>
                <Label className="text-white">Statut</Label>
                <Select
                  value={editingChantier.statut}
                  onValueChange={(value) => {
                    if (editingChantier) {
                      updateChantier(editingChantier.id, { statut: value as 'planifié' | 'en cours' | 'terminé' });
                      setEditingChantier({ ...editingChantier, statut: value as 'planifié' | 'en cours' | 'terminé' });
                    }
                  }}
                >
                  <SelectTrigger className="bg-black/20 backdrop-blur-md border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-black/20 backdrop-blur-xl border-white/10">
                    <SelectItem value="planifié" className="text-white">Planifié</SelectItem>
                    <SelectItem value="en cours" className="text-white">En cours</SelectItem>
                    <SelectItem value="terminé" className="text-white">Terminé</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label className="text-white">Images</Label>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                id="chantier-images-edit"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById('chantier-images-edit')?.click()}
                className="w-full text-white border-white/20 hover:bg-white/10"
              >
                <ImageIcon className="h-4 w-4 mr-2" />
                Ajouter des images
              </Button>
              {newChantier.images.length > 0 && (
                <div className="grid grid-cols-4 gap-2 mt-2">
                  {newChantier.images.map((img, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={img}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-20 object-cover rounded-lg border border-white/20"
                      />
                      <button
                        onClick={() => removeImage(index)}
                        className="absolute top-1 right-1 bg-red-500/80 hover:bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditDialogOpen(false);
                  setEditingChantier(null);
                  setNewChantier({ nom: '', clientId: '', dateDebut: '', duree: '', images: [] });
                  setClientSearchQuery('');
                }}
                className="text-white border-white/20 hover:bg-white/10"
              >
                Annuler
              </Button>
              <Button
                onClick={handleUpdateChantier}
                disabled={!newChantier.nom || !newChantier.clientId || !newChantier.dateDebut || !newChantier.duree}
                className="bg-white/20 backdrop-blur-md text-white border border-white/10 hover:bg-white/30 disabled:opacity-50"
              >
                Enregistrer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent className="bg-black/20 backdrop-blur-xl border border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Supprimer le chantier</AlertDialogTitle>
            <AlertDialogDescription className="text-white/70">
              Êtes-vous sûr de vouloir supprimer ce chantier ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-white border-white/20 hover:bg-white/10">
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-500/20 text-red-300 border border-red-500/50 hover:bg-red-500/30"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <main className="flex-1 p-6 ml-20">
        {chantiers.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <Card className="w-full max-w-md text-center bg-black/20 backdrop-blur-xl border border-white/10 text-white">
              <CardHeader className="pb-4">
                <div className="w-16 h-16 mx-auto rounded-xl bg-black/20 backdrop-blur-md border border-white/10 flex items-center justify-center mb-4">
                  <Building className="h-8 w-8 text-white/70" />
                </div>
                <CardTitle className="text-xl text-white">Aucun chantier</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-white/70 mb-4">
                  Commencez par ajouter votre premier chantier
                </p>
                <Button
                  onClick={() => setIsDialogOpen(true)}
                  className="bg-white/20 backdrop-blur-md text-white border border-white/10 hover:bg-white/30"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter un chantier
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {chantiers.map((chantier) => (
              <Card
                key={chantier.id}
                className="bg-black/20 backdrop-blur-xl border border-white/10 text-white hover:shadow-lg transition-shadow relative group"
              >
                <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 bg-black/60 backdrop-blur-sm border border-white/20 hover:bg-black/80 text-white"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-black/30 backdrop-blur-lg border-white/10 text-white">
                      <DropdownMenuItem
                        onClick={() => handleEditChantier(chantier)}
                        className="text-white hover:bg-white/10 cursor-pointer"
                      >
                        <Edit2 className="h-4 w-4 mr-2" />
                        Modifier
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDeleteClick(chantier.id)}
                        className="text-red-300 hover:bg-red-500/20 cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Supprimer
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                {chantier.images.length > 0 && (
                  <div className="relative h-48 overflow-hidden rounded-t-lg">
                    <img
                      src={chantier.images[0]}
                      alt={chantier.nom}
                      className="w-full h-full object-cover"
                    />
                    {chantier.images.length > 1 && (
                      <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm text-white px-2 py-1 rounded text-xs flex items-center gap-1">
                        <ImageIcon className="h-3 w-3" />
                        {chantier.images.length}
                      </div>
                    )}
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="text-lg">{chantier.nom}</CardTitle>
                  <div className="flex items-center gap-2 text-sm text-white/70">
                    <User className="h-4 w-4" />
                    {chantier.clientName}
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-white/70">
                    <Calendar className="h-4 w-4" />
                    {new Date(chantier.dateDebut).toLocaleDateString('fr-FR')}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-white/70">
                    <Clock className="h-4 w-4" />
                    {chantier.duree}
                  </div>
                  <div className="mt-4">
                    <span className={`px-2 py-1 rounded text-xs ${
                      chantier.statut === 'planifié' ? 'bg-blue-500/20 text-blue-300' :
                      chantier.statut === 'en cours' ? 'bg-green-500/20 text-green-300' :
                      'bg-gray-500/20 text-gray-300'
                    }`}>
                      {chantier.statut}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </PageWrapper>
  );
}
