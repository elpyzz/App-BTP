import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Mail, User, Phone, Calendar, FileText, Plus } from "lucide-react"
import { motion } from "framer-motion"
import { useAuth } from '@/context/AuthContext'
import { loadProspects, createProspect, updateProspectColumn, deleteProspect } from '@/lib/supabase/prospects'

interface Prospect {
  id: string
  name: string
  email: string
  phone?: string
  company?: string
  notes?: string
  createdAt: string
  columnId?: string
  status?: string
}

interface Column {
  id: string
  name: string
  items: Prospect[]
}

// Mapping des colonnes vers les statuts
const COLUMN_STATUS_MAP: Record<string, string> = {
  'all': 'nouveau',
  'quote': 'devis_envoye',
  'followup1': 'relance_1',
  'followup2': 'relance_2',
  'followup3': 'relance_3',
  'followup4': 'relance_4',
}

export function CRMPipeline() {
  const { user } = useAuth()
  const [columns, setColumns] = useState<Column[]>([
    {
      id: 'all',
      name: 'Tous les prospects',
      items: []
    },
    {
      id: 'quote',
      name: 'Envoi du devis',
      items: []
    },
    {
      id: 'followup1',
      name: 'Relance 1',
      items: []
    },
    {
      id: 'followup2',
      name: 'Relance 2',
      items: []
    },
    {
      id: 'followup3',
      name: 'Relance 3',
      items: []
    },
    {
      id: 'followup4',
      name: 'Relance 4',
      items: []
    },
  ])

  const [draggedItem, setDraggedItem] = useState<{prospect: Prospect, columnId: string} | null>(null)
  const [showQuoteModal, setShowQuoteModal] = useState(false)
  const [showFollowupModal, setShowFollowupModal] = useState(false)
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null)
  const [selectedColumn, setSelectedColumn] = useState<string>("")
  const [loading, setLoading] = useState(true)

  // Charger les prospects depuis Supabase
  const loadProspectsFromSupabase = async () => {
    if (!user?.id) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const prospects = await loadProspects()
      
      // Définir les colonnes de base
      const baseColumns: Column[] = [
        {
          id: 'all',
          name: 'Tous les prospects',
          items: []
        },
        {
          id: 'quote',
          name: 'Envoi du devis',
          items: []
        },
        {
          id: 'followup1',
          name: 'Relance 1',
          items: []
        },
        {
          id: 'followup2',
          name: 'Relance 2',
          items: []
        },
        {
          id: 'followup3',
          name: 'Relance 3',
          items: []
        },
        {
          id: 'followup4',
          name: 'Relance 4',
          items: []
        },
      ]
      
      // Organiser les prospects par colonne
      const newColumns = baseColumns.map(col => ({
        ...col,
        items: prospects
          .filter(p => p.column_id === col.id)
          .map(p => ({
            id: p.id,
            name: p.name,
            email: p.email,
            phone: p.phone,
            company: p.company,
            notes: p.notes,
            createdAt: p.created_at || new Date().toISOString(),
            columnId: p.column_id,
            status: p.status
          }))
      }))

      setColumns(newColumns)
    } catch (error) {
      console.error('Error loading prospects:', error)
    } finally {
      setLoading(false)
    }
  }

  // Charger les prospects au montage et quand l'utilisateur change
  useEffect(() => {
    if (user?.id) {
      loadProspectsFromSupabase()
    } else {
      setColumns(prev => prev.map(col => ({ ...col, items: [] })))
      setLoading(false)
    }
  }, [user?.id])

  // Écouter les événements de rechargement
  useEffect(() => {
    if (!user?.id) return

    const handleReload = () => {
      loadProspectsFromSupabase()
    }

    window.addEventListener('prospectsUpdated', handleReload)
    return () => {
      window.removeEventListener('prospectsUpdated', handleReload)
    }
  }, [user?.id])

  const handleDragStart = (prospect: Prospect, columnId: string) => {
    setDraggedItem({ prospect, columnId })
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = async (targetColumnId: string) => {
    if (!draggedItem) return

    const { prospect, columnId: sourceColumnId } = draggedItem

    // Si on déplace vers "Envoi du devis", ouvrir la popup
    if (targetColumnId === 'quote') {
      setSelectedProspect(prospect)
      setSelectedColumn(targetColumnId)
      setShowQuoteModal(true)
      return
    }

    // Si on déplace vers une colonne de relance, ouvrir la popup
    if (targetColumnId.startsWith('followup')) {
      setSelectedProspect(prospect)
      setSelectedColumn(targetColumnId)
      setShowFollowupModal(true)
      return
    }

    // Déplacer l'élément et sauvegarder dans Supabase
    try {
      const status = COLUMN_STATUS_MAP[targetColumnId] || 'nouveau'
      await updateProspectColumn(prospect.id, targetColumnId, status)

      // Mettre à jour l'état local
      setColumns(prev => {
        const newColumns = prev.map(col => {
          if (col.id === sourceColumnId) {
            return {
              ...col,
              items: col.items.filter(item => item.id !== prospect.id)
            }
          }
          if (col.id === targetColumnId) {
            return {
              ...col,
              items: [...col.items, { ...prospect, columnId: targetColumnId, status }]
            }
          }
          return col
        })
        return newColumns
      })

      setDraggedItem(null)
    } catch (error) {
      console.error('Error updating prospect column:', error)
      alert('Erreur lors du déplacement du prospect')
    }
  }

  const handleQuoteConfirm = async () => {
    if (!draggedItem || !selectedProspect) return

    try {
      const status = COLUMN_STATUS_MAP['quote'] || 'devis_envoye'
      await updateProspectColumn(selectedProspect.id, 'quote', status)

      // Mettre à jour l'état local
      setColumns(prev => {
        const newColumns = prev.map(col => {
          if (col.id === draggedItem.columnId) {
            return {
              ...col,
              items: col.items.filter(item => item.id !== selectedProspect.id)
            }
          }
          if (col.id === 'quote') {
            return {
              ...col,
              items: [...col.items, { ...selectedProspect, columnId: 'quote', status }]
            }
          }
          return col
        })
        return newColumns
      })

      // Ici, on déclencherait le webhook pour envoyer le devis
      console.log("Devis envoyé à:", selectedProspect.email)

      setShowQuoteModal(false)
      setSelectedProspect(null)
      setDraggedItem(null)
    } catch (error) {
      console.error('Error updating prospect:', error)
      alert('Erreur lors de l\'envoi du devis')
    }
  }

  const handleFollowupConfirm = async () => {
    if (!draggedItem || !selectedProspect) return

    try {
      const status = COLUMN_STATUS_MAP[selectedColumn] || 'relance_1'
      await updateProspectColumn(selectedProspect.id, selectedColumn, status)

      // Mettre à jour l'état local
      setColumns(prev => {
        const newColumns = prev.map(col => {
          if (col.id === draggedItem.columnId) {
            return {
              ...col,
              items: col.items.filter(item => item.id !== selectedProspect.id)
            }
          }
          if (col.id === selectedColumn) {
            return {
              ...col,
              items: [...col.items, { ...selectedProspect, columnId: selectedColumn, status }]
            }
          }
          return col
        })
        return newColumns
      })

      // Ici, on déclencherait le webhook pour envoyer la relance
      console.log("Relance envoyée à:", selectedProspect.email)

      setShowFollowupModal(false)
      setSelectedProspect(null)
      setSelectedColumn("")
      setDraggedItem(null)
    } catch (error) {
      console.error('Error updating prospect:', error)
      alert('Erreur lors de l\'envoi de la relance')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-white">Chargement des prospects...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {columns.map((column) => (
          <Card
            key={column.id}
            className="bg-black/20 backdrop-blur-xl border border-white/10 text-white"
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(column.id)}
          >
            <CardHeader>
              <CardTitle className="text-sm">{column.name}</CardTitle>
              <Badge variant="secondary" className="mt-2">
                {column.items.length}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="min-h-[200px] space-y-2">
                {column.items.map((prospect) => (
                  <motion.div
                    key={prospect.id}
                    draggable
                    onDragStart={() => handleDragStart(prospect, column.id)}
                    className="p-3 bg-black/20 backdrop-blur-md border border-white/10 rounded-lg cursor-move hover:bg-white/10 transition-all text-white"
                  >
                    <div className="space-y-1">
                      <p className="font-medium text-sm">{prospect.name}</p>
                      <div className="flex items-center gap-1 text-xs text-white/70">
                        <Mail className="h-3 w-3" />
                        <span className="truncate">{prospect.email}</span>
                      </div>
                      {prospect.phone && (
                        <div className="flex items-center gap-1 text-xs text-white/70">
                          <Phone className="h-3 w-3" />
                          <span>{prospect.phone}</span>
                        </div>
                      )}
                      {prospect.company && (
                        <p className="text-xs text-white/70">{prospect.company}</p>
                      )}
                    </div>
                  </motion.div>
                ))}
                {column.items.length === 0 && (
                  <p className="text-xs text-white/70 text-center py-8">
                    Aucun prospect
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Modal pour visualisation du devis */}
      {showQuoteModal && selectedProspect && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="bg-black/20 backdrop-blur-xl border border-white/10 w-full max-w-2xl m-4 text-white">
            <CardHeader>
              <CardTitle>Visualisation du Devis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-2">Destinataire:</p>
                <p className="text-sm">{selectedProspect.name} ({selectedProspect.email})</p>
              </div>
              <div className="border border-white/10 rounded-lg p-4 bg-black/20 backdrop-blur-md">
                <p className="text-sm text-white/70 mb-4">Aperçu du devis à envoyer...</p>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Prestation</span>
                    <span>€0.00</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>Total</span>
                    <span>€0.00</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => {
                  setShowQuoteModal(false)
                  setSelectedProspect(null)
                  setDraggedItem(null)
                }}>
                  Annuler
                </Button>
                <Button onClick={handleQuoteConfirm}>
                  Envoyer le Devis
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal pour relance */}
      {showFollowupModal && selectedProspect && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="bg-black/20 backdrop-blur-xl border border-white/10 w-full max-w-2xl m-4 text-white">
            <CardHeader>
              <CardTitle>Message de Relance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-2">Destinataire:</p>
                <p className="text-sm">{selectedProspect.name} ({selectedProspect.email})</p>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Message (modifiable):</label>
                <textarea
                  className="w-full px-3 py-2 rounded-md border bg-black/20 backdrop-blur-md border-white/10 text-white placeholder:text-white/50 min-h-[150px]"
                  defaultValue="Bonjour, je souhaite faire un suivi concernant notre échange précédent..."
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => {
                  setShowFollowupModal(false)
                  setSelectedProspect(null)
                  setSelectedColumn("")
                  setDraggedItem(null)
                }}>
                  Annuler
                </Button>
                <Button onClick={handleFollowupConfirm}>
                  Envoyer la Relance
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
