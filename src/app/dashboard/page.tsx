'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, FolderPlus, FileUp, ShieldCheck, FileText } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { DashboardHeader } from '@/components/dashboard-header'
import { NewDossierDialog } from '@/components/new-dossier-dialog'
import { VerdictBadge, getVerdict } from '@/components/verdict'
import { cn } from '@/lib/utils'

interface Document {
  id: string
  nomFichier: string
  typeDocument: string | null
  statutDocument: string
  problemesDetectes: string[] | string
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

const ONBOARDING_STEPS = [
  {
    Icon: FolderPlus,
    title: 'Créez un dossier',
    description:
      'Un dossier correspond à un bien : nom du bien et adresse suffisent pour démarrer.',
  },
  {
    Icon: FileUp,
    title: 'Uploadez les diagnostics',
    description:
      'DPE, amiante, plomb, électricité, gaz, ERP... en PDF ou ZIP, tels que reçus du diagnostiqueur.',
  },
  {
    Icon: ShieldCheck,
    title: 'Obtenez le verdict',
    description:
      'Notre moteur de règles déterministe vérifie chaque document et rend un verdict explicable : Prêt à signer, À vérifier ou Non conforme.',
  },
] as const

const CARD_ACCENT: Record<string, string> = {
  VERT: 'border-l-verdict-vert',
  ORANGE: 'border-l-verdict-orange',
  ROUGE: 'border-l-verdict-rouge',
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
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
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
    <div className="min-h-screen bg-background">
      <DashboardHeader />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {dossiers.length === 0 ? (
          /* État vide pédagogique : premier contact avec le produit */
          <div className="mx-auto max-w-3xl py-8">
            <div className="mb-10 text-center">
              <h1 className="font-serif text-3xl font-semibold tracking-tight">
                Bienvenue sur DiagCheck
              </h1>
              <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
                Vérifiez un dossier de diagnostics avant la signature, en trois
                étapes.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {ONBOARDING_STEPS.map((step, index) => (
                <Card key={step.title} className="relative overflow-hidden">
                  <CardContent className="p-6">
                    <span
                      aria-hidden="true"
                      className="font-serif text-4xl font-semibold text-muted-foreground/40"
                    >
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <step.Icon className="mt-4 h-6 w-6 text-primary" />
                    <h2 className="mt-3 font-serif text-base font-semibold">
                      {step.title}
                    </h2>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {step.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="mt-10 text-center">
              <Button size="lg" onClick={() => setDialogOpen(true)}>
                <Plus className="mr-2 h-5 w-5" />
                Créer mon premier dossier
              </Button>
              <p className="mt-4 text-xs text-muted-foreground">
                Chaque verdict est expliqué règle par règle : aucune boîte noire.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-5">
              <Card>
                <CardContent className="p-4">
                  <div className="font-serif text-2xl font-semibold">{stats.total}</div>
                  <div className="text-sm text-muted-foreground">Total dossiers</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="font-serif text-2xl font-semibold text-verdict-vert">
                    {stats.vert}
                  </div>
                  <div className="text-sm text-muted-foreground">Prêts à signer</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="font-serif text-2xl font-semibold text-verdict-orange">
                    {stats.orange}
                  </div>
                  <div className="text-sm text-muted-foreground">À vérifier</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="font-serif text-2xl font-semibold text-verdict-rouge">
                    {stats.rouge}
                  </div>
                  <div className="text-sm text-muted-foreground">Non conformes</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="font-serif text-2xl font-semibold text-verdict-attente">
                    {stats.enAttente}
                  </div>
                  <div className="text-sm text-muted-foreground">En attente</div>
                </CardContent>
              </Card>
            </div>

            {/* Header avec bouton */}
            <div className="mb-6 flex items-center justify-between">
              <h1 className="font-serif text-xl font-semibold">Mes dossiers</h1>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Nouveau dossier
              </Button>
            </div>

            {/* Liste des dossiers */}
            <div className="grid gap-4">
              {dossiers.map((dossier) => {
                const verdict = getVerdict(dossier.statutGlobal)
                return (
                  <Link key={dossier.id} href={`/dashboard/dossiers/${dossier.id}`}>
                    <Card
                      className={cn(
                        'cursor-pointer border-l-4 transition-shadow hover:shadow-md',
                        CARD_ACCENT[dossier.statutGlobal] ?? 'border-l-verdict-attente'
                      )}
                    >
                      <CardContent className="p-6">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0">
                            <h2 className="truncate font-serif text-lg font-semibold">
                              {dossier.nomBien}
                            </h2>
                            <p className="truncate text-sm text-muted-foreground">
                              {dossier.adresse}
                            </p>
                            <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                              <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                              {dossier._count.documents} document
                              {dossier._count.documents > 1 ? 's' : ''} · créé le{' '}
                              {formatDate(dossier.dateCreation)}
                            </p>
                          </div>
                          <VerdictBadge
                            status={dossier.statutGlobal}
                            size="lg"
                            className="shrink-0 self-start sm:self-center"
                          />
                        </div>
                        <span className="sr-only">{verdict.label}</span>
                      </CardContent>
                    </Card>
                  </Link>
                )
              })}
            </div>
          </>
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
