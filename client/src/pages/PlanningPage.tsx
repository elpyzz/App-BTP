import { PageWrapper } from '@/components/PageWrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar, Building, Clock, User, Image as ImageIcon, Mail, Phone, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { useChantiers, Chantier } from '@/context/ChantiersContext';
import { useState, useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

// Fonction pour parser la durée et calculer la date de fin
function calculateEndDate(dateDebut: string, duree: string): Date {
  const startDate = new Date(dateDebut);
  const dureeLower = duree.toLowerCase().trim();
  
  // Parser différentes formats de durée
  let daysToAdd = 0;
  
  if (dureeLower.includes('semaine') || dureeLower.includes('sem')) {
    const weeks = parseInt(dureeLower.match(/\d+/)?.[0] || '1');
    daysToAdd = weeks * 7;
  } else if (dureeLower.includes('mois')) {
    const months = parseInt(dureeLower.match(/\d+/)?.[0] || '1');
    daysToAdd = months * 30; // Approximation
  } else if (dureeLower.includes('jour') || dureeLower.includes('j')) {
    const days = parseInt(dureeLower.match(/\d+/)?.[0] || '1');
    daysToAdd = days;
  } else {
    // Si c'est juste un nombre, on assume des jours
    const days = parseInt(dureeLower.match(/\d+/)?.[0] || '1');
    daysToAdd = days;
  }
  
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + daysToAdd);
  return endDate;
}

// Fonction pour obtenir les jours du mois
function getDaysInMonth(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();
  
  const days = [];
  
  // Ajouter les jours du mois précédent pour compléter la première semaine
  const prevMonth = new Date(year, month, 0);
  const prevMonthDays = prevMonth.getDate();
  for (let i = startingDayOfWeek - 1; i >= 0; i--) {
    days.push({
      date: new Date(year, month - 1, prevMonthDays - i),
      isCurrentMonth: false,
      isToday: false
    });
  }
  
  // Ajouter les jours du mois actuel
  const today = new Date();
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    days.push({
      date,
      isCurrentMonth: true,
      isToday: date.toDateString() === today.toDateString()
    });
  }
  
  // Ajouter les jours du mois suivant pour compléter la dernière semaine
  const remainingDays = 42 - days.length; // 6 semaines * 7 jours
  for (let day = 1; day <= remainingDays; day++) {
    days.push({
      date: new Date(year, month + 1, day),
      isCurrentMonth: false,
      isToday: false
    });
  }
  
  return days;
}

export default function PlanningPage() {
  const { chantiers, clients } = useChantiers();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedChantier, setSelectedChantier] = useState<Chantier | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [filterStatut, setFilterStatut] = useState<string>('tous');
  
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  const days = useMemo(() => getDaysInMonth(year, month), [year, month]);

  // Filtrer les chantiers selon le filtre de statut
  const filteredChantiers = useMemo(() => {
    if (filterStatut === 'tous') return chantiers;
    return chantiers.filter(c => c.statut === filterStatut);
  }, [chantiers, filterStatut]);

  const handleChantierClick = (chantier: Chantier) => {
    setSelectedChantier(chantier);
    setIsDialogOpen(true);
  };
  
  // Fonction pour obtenir les chantiers d'un jour donné
  const getChantiersForDay = (date: Date) => {
    return filteredChantiers.filter(chantier => {
      const startDate = new Date(chantier.dateDebut);
      const endDate = calculateEndDate(chantier.dateDebut, chantier.duree);
      
      // Normaliser les dates (ignorer l'heure)
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);
      
      const chantierStart = new Date(startDate);
      chantierStart.setHours(0, 0, 0, 0);
      const chantierEnd = new Date(endDate);
      chantierEnd.setHours(23, 59, 59, 999);
      
      return dayStart >= chantierStart && dayStart <= chantierEnd;
    });
  };
  
  const monthNames = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];
  
  const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
  
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };
  
  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };
  
  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const handleMonthChange = (newMonth: number) => {
    setCurrentDate(new Date(year, newMonth, 1));
  };

  const handleYearChange = (newYear: number) => {
    setCurrentDate(new Date(newYear, month, 1));
  };

  // Générer les années disponibles (année actuelle ± 5 ans)
  const currentYear = new Date().getFullYear();
  const availableYears = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);
  
  return (
    <PageWrapper>
      <header className="bg-black/20 backdrop-blur-xl border-b border-white/10 px-6 py-4 rounded-tl-3xl ml-20">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">
              Planning des Chantiers
            </h1>
            <p className="text-sm text-white/70">Calendrier intégré pour organiser vos interventions</p>
          </div>
        </div>
      </header>

      <main className="flex-1 p-6 space-y-6 ml-20">
        {/* Contrôles du calendrier */}
        <Card className="bg-black/20 backdrop-blur-xl border border-white/10 text-white">
          <CardHeader>
            <div className="flex flex-col gap-4">
              {/* Première ligne : Navigation principale */}
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  {/* Bouton Mois précédent */}
                  <Button
                    onClick={goToPreviousMonth}
                    variant="outline"
                    size="sm"
                    className="bg-white/10 border-white/20 text-white hover:bg-white/20 hover:border-white/30"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Précédent
                  </Button>
                  
                  {/* Sélecteur de mois/année */}
                  <div className="flex items-center gap-2">
                    <Select
                      value={month.toString()}
                      onValueChange={(value) => handleMonthChange(parseInt(value))}
                    >
                      <SelectTrigger className="w-[140px] bg-white/10 border-white/20 text-white hover:bg-white/20">
                        <SelectValue>{monthNames[month]}</SelectValue>
                      </SelectTrigger>
                      <SelectContent className="bg-black/90 border-white/20 text-white">
                        {monthNames.map((name, index) => (
                          <SelectItem key={index} value={index.toString()}>
                            {name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <Select
                      value={year.toString()}
                      onValueChange={(value) => handleYearChange(parseInt(value))}
                    >
                      <SelectTrigger className="w-[100px] bg-white/10 border-white/20 text-white hover:bg-white/20">
                        <SelectValue>{year}</SelectValue>
                      </SelectTrigger>
                      <SelectContent className="bg-black/90 border-white/20 text-white">
                        {availableYears.map((y) => (
                          <SelectItem key={y} value={y.toString()}>
                            {y}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Bouton Mois suivant */}
                  <Button
                    onClick={goToNextMonth}
                    variant="outline"
                    size="sm"
                    className="bg-white/10 border-white/20 text-white hover:bg-white/20 hover:border-white/30"
                  >
                    Suivant
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
                
                {/* Bouton Aujourd'hui */}
                <Button
                  onClick={goToToday}
                  variant="outline"
                  size="sm"
                  className="bg-blue-500/20 border-blue-500/50 text-blue-200 hover:bg-blue-500/30 hover:border-blue-500/70"
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Aujourd'hui
                </Button>
              </div>

              {/* Deuxième ligne : Filtres */}
              <div className="flex items-center gap-4 pt-2 border-t border-white/10">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-white/70" />
                  <span className="text-sm text-white/70">Filtrer par statut :</span>
                </div>
                <div className="flex gap-2">
                  {['tous', 'planifié', 'en cours', 'terminé'].map((statut) => (
                    <Button
                      key={statut}
                      onClick={() => setFilterStatut(statut)}
                      variant={filterStatut === statut ? "default" : "outline"}
                      size="sm"
                      className={
                        filterStatut === statut
                          ? 'bg-blue-500/30 border-blue-500/50 text-blue-200 hover:bg-blue-500/40'
                          : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                      }
                    >
                      {statut === 'tous' ? 'Tous' : statut.charAt(0).toUpperCase() + statut.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Calendrier */}
        <Card className="bg-black/20 backdrop-blur-xl border border-white/10 text-white">
          <CardContent className="p-6">
            {/* En-têtes des jours */}
            <div className="grid grid-cols-7 gap-2 mb-4">
              {dayNames.map(day => (
                <div key={day} className="text-center text-sm font-semibold text-white/70 py-2">
                  {day}
                </div>
              ))}
            </div>
            
            {/* Grille du calendrier */}
            <div className="grid grid-cols-7 gap-2">
              {days.map((day, index) => {
                const dayChantiers = getChantiersForDay(day.date);
                const isToday = day.isToday;
                
                return (
                  <div
                    key={index}
                    className={`min-h-[100px] p-2 rounded-lg border transition-all ${
                      day.isCurrentMonth
                        ? isToday
                          ? 'bg-blue-500/20 border-blue-500/50 border-2 shadow-lg shadow-blue-500/20'
                          : 'bg-black/10 border-white/10 hover:bg-black/20'
                        : 'bg-black/5 border-white/5 opacity-50'
                    }`}
                  >
                    <div className={`text-sm font-medium mb-1 ${
                      day.isCurrentMonth ? 'text-white' : 'text-white/50'
                    } ${isToday ? 'text-blue-200 font-bold' : ''}`}>
                      {day.date.getDate()}
                    </div>
                    
                    {/* Afficher les chantiers */}
                    <div className="space-y-1">
                      {dayChantiers.slice(0, 2).map(chantier => {
                        const startDate = new Date(chantier.dateDebut);
                        const isStart = day.date.toDateString() === startDate.toDateString();
                        const endDate = calculateEndDate(chantier.dateDebut, chantier.duree);
                        const isEnd = day.date.toDateString() === endDate.toDateString();
                        
                        return (
                          <div
                            key={chantier.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleChantierClick(chantier);
                            }}
                            className={`text-xs p-1.5 rounded truncate cursor-pointer transition-all hover:opacity-90 hover:scale-105 hover:shadow-md ${
                              chantier.statut === 'planifié'
                                ? 'bg-blue-500/30 text-blue-200 border border-blue-500/50'
                                : chantier.statut === 'en cours'
                                ? 'bg-yellow-500/30 text-yellow-200 border border-yellow-500/50'
                                : 'bg-green-500/30 text-green-200 border border-green-500/50'
                            }`}
                            title={`${chantier.nom} - ${chantier.clientName}`}
                          >
                            {isStart && '▶ '}
                            {isEnd && '◀ '}
                            {chantier.nom}
                          </div>
                        );
                      })}
                      {dayChantiers.length > 2 && (
                        <div className="text-xs text-white/70">
                          +{dayChantiers.length - 2} autre(s)
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Légende */}
        <Card className="bg-black/20 backdrop-blur-xl border border-white/10 text-white">
          <CardHeader>
            <CardTitle className="text-lg">Légende</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-blue-500/30 border border-blue-500/50"></div>
                <span className="text-sm">Planifié</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-yellow-500/30 border border-yellow-500/50"></div>
                <span className="text-sm">En cours</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-green-500/30 border border-green-500/50"></div>
                <span className="text-sm">Terminé</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Liste des chantiers du mois */}
        {filteredChantiers.length > 0 && (
          <Card className="bg-black/20 backdrop-blur-xl border border-white/10 text-white">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Building className="h-5 w-5" />
                Chantiers du mois
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {filteredChantiers
                  .filter(chantier => {
                    const startDate = new Date(chantier.dateDebut);
                    const endDate = calculateEndDate(chantier.dateDebut, chantier.duree);
                    return (
                      (startDate.getMonth() === month && startDate.getFullYear() === year) ||
                      (endDate.getMonth() === month && endDate.getFullYear() === year) ||
                      (startDate <= new Date(year, month + 1, 0) && endDate >= new Date(year, month, 1))
                    );
                  })
                  .map(chantier => {
                    const startDate = new Date(chantier.dateDebut);
                    const endDate = calculateEndDate(chantier.dateDebut, chantier.duree);
                    
                    return (
                      <div
                        key={chantier.id}
                        onClick={() => handleChantierClick(chantier)}
                        className="p-3 rounded-lg bg-black/20 border border-white/10 cursor-pointer transition-all hover:bg-black/30 hover:border-white/20 hover:scale-[1.02]"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Building className="h-4 w-4 text-white/70" />
                              <span className="font-semibold">{chantier.nom}</span>
                              <span className={`px-2 py-0.5 rounded text-xs ${
                                chantier.statut === 'planifié'
                                  ? 'bg-blue-500/20 text-blue-300'
                                  : chantier.statut === 'en cours'
                                  ? 'bg-yellow-500/20 text-yellow-300'
                                  : 'bg-green-500/20 text-green-300'
                              }`}>
                                {chantier.statut}
                              </span>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-white/70">
                              <div className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {chantier.clientName}
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {startDate.toLocaleDateString('fr-FR')} - {endDate.toLocaleDateString('fr-FR')}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Dialog de détails du chantier */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-black/20 backdrop-blur-xl border border-white/10 text-white max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white text-2xl flex items-center gap-2">
              <Building className="h-6 w-6" />
              {selectedChantier?.nom}
            </DialogTitle>
          </DialogHeader>
          {selectedChantier && (
            <div className="space-y-6 mt-4">
              {/* Informations client */}
              <div className="p-4 bg-black/20 backdrop-blur-md border border-white/10 rounded-lg">
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Informations Client
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-white">
                    <span className="font-medium">Nom :</span>
                    <span>{selectedChantier.clientName}</span>
                  </div>
                  {(() => {
                    const client = clients.find(c => c.id === selectedChantier.clientId);
                    return client ? (
                      <>
                        {client.email && (
                          <div className="flex items-center gap-2 text-white/80">
                            <Mail className="h-4 w-4" />
                            <span>{client.email}</span>
                          </div>
                        )}
                        {client.phone && (
                          <div className="flex items-center gap-2 text-white/80">
                            <Phone className="h-4 w-4" />
                            <span>{client.phone}</span>
                          </div>
                        )}
                      </>
                    ) : null;
                  })()}
                </div>
              </div>

              {/* Dates et durée */}
              <div className="p-4 bg-black/20 backdrop-blur-md border border-white/10 rounded-lg">
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Planning
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-white">
                    <span className="font-medium">Date de début :</span>
                    <span>{new Date(selectedChantier.dateDebut).toLocaleDateString('fr-FR', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}</span>
                  </div>
                  <div className="flex items-center gap-2 text-white">
                    <span className="font-medium">Date de fin :</span>
                    <span>{calculateEndDate(selectedChantier.dateDebut, selectedChantier.duree).toLocaleDateString('fr-FR', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}</span>
                  </div>
                  <div className="flex items-center gap-2 text-white">
                    <Clock className="h-4 w-4" />
                    <span className="font-medium">Durée :</span>
                    <span>{selectedChantier.duree}</span>
                  </div>
                </div>
              </div>

              {/* Statut */}
              <div className="p-4 bg-black/20 backdrop-blur-md border border-white/10 rounded-lg">
                <h3 className="text-lg font-semibold text-white mb-3">Statut</h3>
                <span className={`px-3 py-1.5 rounded text-sm font-medium ${
                  selectedChantier.statut === 'planifié'
                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/50'
                    : selectedChantier.statut === 'en cours'
                    ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/50'
                    : 'bg-green-500/20 text-green-300 border border-green-500/50'
                }`}>
                  {selectedChantier.statut}
                </span>
              </div>

              {/* Images */}
              {selectedChantier.images && selectedChantier.images.length > 0 && (
                <div className="p-4 bg-black/20 backdrop-blur-md border border-white/10 rounded-lg">
                  <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                    <ImageIcon className="h-5 w-5" />
                    Photos du Chantier ({selectedChantier.images.length})
                  </h3>
                  <div className={`grid gap-3 ${
                    selectedChantier.images.length === 1 
                      ? 'grid-cols-1' 
                      : selectedChantier.images.length === 2
                      ? 'grid-cols-2'
                      : 'grid-cols-2 md:grid-cols-3'
                  }`}>
                    {selectedChantier.images.map((image, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={image}
                          alt={`Photo ${index + 1} du chantier ${selectedChantier.nom}`}
                          className="w-full h-48 object-cover rounded-lg border border-white/20 hover:border-white/40 transition-colors"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}
