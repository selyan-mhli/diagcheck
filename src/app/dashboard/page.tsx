'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, FileText, CheckCircle, AlertCircle, XCircle, Clock } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { DashboardHeader } from '@/components/dashboard-header'
import { NewDossierDialog } from '@/components/new-dossier-dialog'

interface Document {
  id: string
  nomFichier: string
  typeDocument: string | null
  statutDocument: string
  problemesDetectes: string[]
  dateVerification: string | null
}

interface Dossier {
  id: string
  nomBien: string
  adresse: string
  dateCreation: string
  statutGlobal: string
  documents: Document[]
  _count: { documents: number }
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'VERT':
    case 'VALIDE':
      return <CheckCircle className="h-5 w-5 text-green-500" />
    case 'ORANGE':
    case 'INCERTAIN':
      return <AlertCircle className="h-5 w-5 text-amber-500" />
    case 'ROUGE':
    case 'REFUSE':
      return <XCircle className="h-5 w-5 text-red-500" />
    default:
      return <Clock className="h-5 w-5 text-gray-400" />
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case 'VERT':
      return 'Prêt à signer'
    case 'ORANGE':
      return 'À vérifier'
    case 'ROUGE':
      return 'Non conforme'
    default:
      return 'En attente'
  }
}

function getStatusBadgeClass(status: string) {
  switch (status) {
    case 'VERT':
      return 'bg-green-100 text-green-800 border-green-200'
    case 'ORANGE':
      return 'bg-amber-100 text-amber-800 border-amber-200'
    case 'ROUGE':
      return 'bg-red-100 text-red-800 border-red-200'
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [dossiers, setDossiers] = useState<Dossier[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  useEffect(() => {
    if (session) {
      fetchDossiers()
    }
  }, [session])

  const fetchDossiers = async () => {
    try {
      const response = await fetch('/api/dossiers')
      if (response.ok) {
        const data = await response.json()
        setDossiers(data)
      }
    } catch (error) {
      console.error('Erreur lors du chargement des dossiers:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDossierCreated = () => {
    fetchDossiers()
    setDialogOpen(false)
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  const stats = {
    total: dossiers.length,
    vert: dossiers.filter((d) => d.statutGlobal === 'VERT').length,
    orange: dossiers.filter((d) => d.statutGlobal === 'ORANGE').length,
    rouge: dossiers.filter((d) => d.statutGlobal === 'ROUGE').length,
    enAttente: dossiers.filter((d) => d.statutGlobal === 'EN_ATTENTE').length,
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-sm text-muted-foreground">Total dossiers</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">{stats.vert}</div>
              <div className="text-sm text-muted-foreground">Prêts à signer</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-amber-600">{stats.orange}</div>
              <div className="text-sm text-muted-foreground">À vérifier</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-red-600">{stats.rouge}</div>
              <div className="text-sm text-muted-foreground">Non conformes</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-gray-600">{stats.enAttente}</div>
              <div className="text-sm text-muted-foreground">En attente</div>
            </CardContent>
          </Card>
        </div>

        {/* Header avec bouton */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Mes dossiers</h2>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nouveau dossier
          </Button>
        </div>

        {/* Liste des dossiers */}
        {dossiers.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Aucun dossier</h3>
              <p className="text-muted-foreground mb-4">
                Créez votre premier dossier pour commencer à analyser vos diagnostics
              </p>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Créer un dossier
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {dossiers.map((dossier) => (
              <Link key={dossier.id} href={`/dashboard/dossiers/${dossier.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        {getStatusIcon(dossier.statutGlobal)}
                        <div>
                          <h3 className="font-semibold">{dossier.nomBien}</h3>
                          <p className="text-sm text-muted-foreground">{dossier.adresse}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Créé le {formatDate(dossier.dateCreation)} • {dossier._count.documents} document(s)
                          </p>
                        </div>
                      </div>
                      <span
                        className={`px-3 py-1 text-xs font-medium rounded-full border ${getStatusBadgeClass(
                          dossier.statutGlobal
                        )}`}
                      >
                        {getStatusLabel(dossier.statutGlobal)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>

      <NewDossierDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={handleDossierCreated}
      />
    </div>
  )
}
