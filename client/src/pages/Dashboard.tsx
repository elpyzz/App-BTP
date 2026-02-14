import { useEffect, useState, useMemo } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Sidebar from '@/components/Sidebar'
import { UserAccountButton } from '@/components/UserAccountButton'
import { 
  Building, 
  FileText, 
  Wand2, 
  Euro,
  Plus
} from 'lucide-react'
import { Link, useLocation } from 'wouter'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts'

export default function Dashboard() {
  const [location, setLocation] = useLocation();

  useEffect(() => {
    const userType = localStorage.getItem('userType')
    if (userType === 'team') {
      setLocation('/team-dashboard')
    }
  }, [setLocation])
  
  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="relative z-10">
        <Sidebar />
        
        {/* User Account Button - fixed top right */}
        <UserAccountButton />

        {/* Main Content */}
        <main className="ml-0 lg:ml-0 p-6 lg:p-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={location}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-7xl mx-auto"
          >
            {/* Header */}
            <div className="mb-8 ml-20">
              <h1 className="text-4xl font-light tracking-tight text-white mb-2 drop-shadow-lg">
                Dashboard
              </h1>
              <p className="text-white/90 drop-shadow-md">Vue d'ensemble de votre activité</p>
            </div>

            {/* Content */}
            <div className="space-y-6">
              <OverviewTab />
            </div>
          </motion.div>
        </AnimatePresence>
      </main>
      </div>
    </div>
  )
}

// Overview Tab Component
function OverviewTab() {
  const [, setLocation] = useLocation();
  const [unsignedQuotesCount, setUnsignedQuotesCount] = useState(0);
  const [totalQuotes, setTotalQuotes] = useState(0);
  const [signedQuotesCount, setSignedQuotesCount] = useState(0);
  const [signedQuotesTotal, setSignedQuotesTotal] = useState(0);
  const [quotesByMonth, setQuotesByMonth] = useState<any[]>([]);
  
  // Charger les statistiques des devis
  useEffect(() => {
    const loadQuotesStats = () => {
      try {
        const quotesData = localStorage.getItem('quotes_data');
        if (quotesData) {
          const quotes = JSON.parse(quotesData);
          const unsigned = quotes.filter((q: any) => !q.isSigned).length;
          const signed = quotes.filter((q: any) => q.isSigned);
          const signedTotal = signed.reduce((sum: number, q: any) => sum + (q.total || 0), 0);
          
          setUnsignedQuotesCount(unsigned);
          setTotalQuotes(quotes.length);
          setSignedQuotesCount(signed.length);
          setSignedQuotesTotal(signedTotal);
          
          // Calculer les devis par mois (6 derniers mois)
          const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
          const now = new Date();
          const monthData: { [key: string]: { signed: number; unsigned: number; total: number } } = {};
          
          // Initialiser les 6 derniers mois
          for (let i = 5; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthKey = `${months[date.getMonth()]} ${date.getFullYear()}`;
            monthData[monthKey] = { signed: 0, unsigned: 0, total: 0 };
          }
          
          // Compter les devis par mois
          quotes.forEach((quote: any) => {
            if (quote.createdAt) {
              const quoteDate = new Date(quote.createdAt);
              const monthKey = `${months[quoteDate.getMonth()]} ${quoteDate.getFullYear()}`;
              
              if (monthData[monthKey]) {
                monthData[monthKey].total++;
                if (quote.isSigned) {
                  monthData[monthKey].signed++;
                } else {
                  monthData[monthKey].unsigned++;
                }
              }
            }
          });
          
          // Convertir en tableau pour le graphique
          const chartData = Object.keys(monthData).map(month => ({
            mois: month,
            signés: monthData[month].signed,
            'non signés': monthData[month].unsigned,
            total: monthData[month].total
          }));
          
          setQuotesByMonth(chartData);
        } else {
          setUnsignedQuotesCount(0);
          setTotalQuotes(0);
          setSignedQuotesCount(0);
          setSignedQuotesTotal(0);
          setQuotesByMonth([]);
        }
      } catch (error) {
        console.error('Erreur lors du chargement des devis:', error);
        setUnsignedQuotesCount(0);
        setTotalQuotes(0);
        setSignedQuotesCount(0);
        setSignedQuotesTotal(0);
        setQuotesByMonth([]);
      }
    };
    
    loadQuotesStats();
    
    // Rafraîchir périodiquement (réduit de 2s à 10s pour améliorer les performances)
    const interval = setInterval(loadQuotesStats, 10000);
    
    // Écouter les changements de storage
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'quotes_data') {
        loadQuotesStats();
      }
    };
    
    // Écouter les événements personnalisés
    const handleQuotesUpdate = () => {
      loadQuotesStats();
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('quotesUpdated', handleQuotesUpdate);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('quotesUpdated', handleQuotesUpdate);
    };
  }, []);
  
  // Formater le montant
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };
  
  return (
    <div className="space-y-6">
      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <MetricCard
          title="Total des Devis"
          value={totalQuotes.toString()}
          change={`${unsignedQuotesCount} en attente`}
          icon={FileText}
          delay={0.1}
          onClick={() => setLocation('/dashboard/dossiers')}
        />
        <MetricCard
          title="Chantiers Actifs"
          value="12"
          change="+3 en cours"
          icon={Building}
          delay={0.2}
          onClick={() => setLocation('/dashboard/projects')}
        />
        <MetricCard
          title="CA des Devis Signés"
          value={formatAmount(signedQuotesTotal)}
          change={`${signedQuotesCount} devis signés`}
          icon={Euro}
          delay={0.3}
          onClick={() => setLocation('/dashboard/dossiers?tab=signed')}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6">
        <Card className="bg-black/20 backdrop-blur-xl border border-white/10 shadow-xl rounded-2xl text-white">
          <CardHeader>
            <CardTitle className="text-white font-light">Évolution des Devis (6 derniers mois)</CardTitle>
            <p className="text-sm text-white/60 mt-1">Répartition des devis signés et non signés par mois</p>
          </CardHeader>
          <CardContent>
            {quotesByMonth.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={quotesByMonth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                  <XAxis 
                    dataKey="mois" 
                    stroke="rgba(255, 255, 255, 0.7)"
                    tick={{ fill: 'rgba(255, 255, 255, 0.7)', fontSize: 12 }}
                  />
                  <YAxis 
                    stroke="rgba(255, 255, 255, 0.7)"
                    tick={{ fill: 'rgba(255, 255, 255, 0.7)', fontSize: 12 }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(0, 0, 0, 0.9)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '12px',
                      color: '#fff'
                    }}
                    cursor={{ fill: 'rgba(167, 139, 250, 0.1)' }}
                  />
                  <Legend 
                    wrapperStyle={{ color: 'rgba(255, 255, 255, 0.7)' }}
                    iconType="square"
                  />
                  <Bar dataKey="signés" stackId="a" fill="#22c55e" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="non signés" stackId="a" fill="#f97316" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-white/50">
                <div className="text-center">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Aucun devis créé</p>
                  <p className="text-sm mt-2">Les données apparaîtront ici une fois que vous aurez créé des devis</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="bg-black/20 backdrop-blur-xl border border-white/10 shadow-xl rounded-2xl text-white">
        <CardHeader>
          <CardTitle className="text-white font-light">Actions Rapides</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button 
            className="w-full justify-start h-auto p-4 rounded-xl bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-900/30 border border-violet-200 dark:border-violet-800"
            onClick={() => setLocation('/dashboard/projects?openDialog=true')}
          >
            <Plus className="h-5 w-5 mr-3" />
            <div className="text-left">
              <div className="font-medium">Nouveau Chantier</div>
              <div className="text-xs opacity-70">Créer un projet</div>
            </div>
          </Button>
          <Button 
            className="w-full justify-start h-auto p-4 rounded-xl bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-900/30 border border-violet-200 dark:border-violet-800"
            onClick={() => setLocation('/dashboard/quotes')}
          >
            <FileText className="h-5 w-5 mr-3" />
            <div className="text-left">
              <div className="font-medium">Créer un Devis</div>
              <div className="text-xs opacity-70">Générer un devis</div>
            </div>
          </Button>
          <Button 
            className="w-full justify-start h-auto p-4 rounded-xl bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-900/30 border border-violet-200 dark:border-violet-800"
            onClick={() => setLocation('/dashboard/ai-visualization')}
          >
            <Wand2 className="h-5 w-5 mr-3" />
            <div className="text-left">
              <div className="font-medium">Estimation IA</div>
              <div className="text-xs opacity-70">Analyser un projet</div>
            </div>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

function MetricCard({ title, value, change, icon: Icon, delay, onClick }: { title: string, value: string, change: string, icon: any, delay: number, onClick?: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
    >
      <Card 
        className={`bg-black/20 backdrop-blur-xl border border-white/10 shadow-xl rounded-2xl hover:shadow-2xl transition-all text-white ${
          onClick ? 'cursor-pointer hover:scale-105 hover:border-violet-400' : ''
        }`}
        onClick={onClick}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-white/70">{title}</CardTitle>
          <Icon className="h-5 w-5 text-violet-400" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-light text-white mb-1">{value}</div>
          <p className="text-xs text-white/60">{change}</p>
        </CardContent>
      </Card>
    </motion.div>
  )
}

