'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DashboardHeader } from '@/components/dashboard-header'
import { DocumentUploader } from '@/components/document-uploader'
import {
  ArrowLeft,
  FileText,
  Download,
  Play,
  Trash2,
  History,
  Eye,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react'
import { formatDate, formatFileSize, cn } from '@/lib/utils'
import {
  VerdictBadge,
  getVerdict,
  documentTypeLabel,
  parseProblems,
} from '@/components/verdict'

interface Document {
  id: string
  nomFichier: string
  typeDocument: string | null
  statutDocument: string
  problemesDetectes: string[] | string
  dateVerification: string | null
  tailleFichier: number
  createdAt: string
}

interface AnalyseLog {
  id: string
  action: string
  details: Record<string, unknown>
  createdAt: string
}

interface Dossier {
  id: string
  nomBien: string
  adresse: string
  dateCreation: string
  statutGlobal: string
  documents: Document[]
  analyseLogs: AnalyseLog[]
}

function verdictHeadline(status: string): string {
  switch (status) {
    case 'VERT':
      return 'Prêt à signer'
    case 'ORANGE':
      return 'À vérifier'
    case 'ROUGE':
      return 'Non conforme'
    default:
      return 'En attente d\'analyse'
  }
}

function verdictSubline(status: string): string {
  switch (status) {
    case 'VERT':
      return 'Aucun point bloquant détecté par le moteur de règles sur les documents fournis.'
    case 'ORANGE':
      return 'Certains documents demandent une vérification humaine avant signature.'
    case 'ROUGE':
      return 'Au moins un document est non conforme : le dossier ne doit pas être signé en l\'état.'
    default:
      return 'Uploadez les diagnostics puis lancez l\'analyse pour obtenir le verdict.'
  }
}

export default function DossierDetailPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const dossierId = params.id as string

  const [dossier, setDossier] = useState<Dossier | null>(null)
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  const fetchDossier = useCallback(async () => {
    try {
      const response = await fetch(`/api/dossiers/${dossierId}`)
      if (response.ok) {
        const data = await response.json()
        setDossier(data)
      } else if (response.status === 404) {
        router.push('/dashboard')
      }
    } catch (error) {
      console.error('Erreur lors du chargement du dossier:', error)
    } finally {
      setLoading(false)
    }
  }, [dossierId, router])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  useEffect(() => {
    if (session && dossierId) {
      fetchDossier()
    }
  }, [session, dossierId, fetchDossier])

  const handleAnalyze = async () => {
    setAnalyzing(true)
    try {
      const response = await fetch(`/api/dossiers/${dossierId}/analyze`, {
        method: 'POST',
      })
      if (response.ok) {
        await fetchDossier()
      }
    } catch (error) {
      console.error('Erreur lors de l\'analyse:', error)
    } finally {
      setAnalyzing(false)
    }
  }

  const handleDownloadReport = async () => {
    try {
      const response = await fetch(`/api/dossiers/${dossierId}/report`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `rapport-${dossier?.nomBien || 'dossier'}.pdf`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error('Erreur lors du téléchargement:', error)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce dossier ?')) return

    try {
      const response = await fetch(`/api/dossiers/${dossierId}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        router.push('/dashboard')
      }
    } catch (error) {
      console.error('Erreur lors de la suppression:', error)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!session || !dossier) {
    return null
  }

  const pendingDocuments = dossier.documents.filter(
    (d) => d.statutDocument === 'EN_ATTENTE'
  )

  const verdict = getVerdict(dossier.statutGlobal)
  const isAnalyzed = ['VERT', 'ORANGE', 'ROUGE'].includes(dossier.statutGlobal)

  const lastVerification = dossier.documents
    .map((d) => d.dateVerification)
    .filter((d): d is string => d !== null)
    .sort()
    .pop()

  const analyzedDocuments = dossier.documents.filter(
    (d) => d.statutDocument !== 'EN_ATTENTE'
  )

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <div className="mb-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour aux dossiers
          </Link>
        </div>

        {/* Verdict héros : LE moment du produit */}
        <section
          aria-label="Verdict du dossier"
          className={cn(
            'mb-8 rounded-lg border-2 p-6 sm:p-10',
            verdict.bg,
            verdict.border
          )}
        >
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className={cn('text-sm font-medium uppercase tracking-widest', verdict.text)}>
                Verdict DiagCheck
              </p>
              <h1
                className={cn(
                  'mt-2 font-serif text-4xl font-semibold tracking-tight sm:text-6xl',
                  verdict.text
                )}
              >
                {verdictHeadline(dossier.statutGlobal)}
              </h1>
              <p className="mt-3 max-w-2xl text-sm text-foreground/80 sm:text-base">
                {verdictSubline(dossier.statutGlobal)}
              </p>
              <p className="mt-4 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{dossier.nomBien}</span>
                {' · '}
                {dossier.adresse}
                {' · '}
                {isAnalyzed && lastVerification
                  ? `analysé le ${formatDate(lastVerification)}`
                  : `créé le ${formatDate(dossier.dateCreation)}`}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {pendingDocuments.length > 0 && (
                <Button onClick={handleAnalyze} disabled={analyzing}>
                  <Play className="mr-2 h-4 w-4" />
                  {analyzing
                    ? 'Analyse en cours...'
                    : `Analyser (${pendingDocuments.length})`}
                </Button>
              )}
              {isAnalyzed && (
                <Button onClick={handleDownloadReport}>
                  <Download className="mr-2 h-4 w-4" />
                  Télécharger le rapport PDF
                </Button>
              )}
            </div>
          </div>
        </section>

        {/* Actions secondaires */}
        <div className="mb-8 flex flex-wrap gap-3">
          {!isAnalyzed && (
            <Button variant="outline" onClick={handleDownloadReport}>
              <Download className="mr-2 h-4 w-4" />
              Télécharger le rapport
            </Button>
          )}
          <Button variant="outline" onClick={() => setShowHistory(!showHistory)}>
            <History className="mr-2 h-4 w-4" />
            Historique
          </Button>
          <Button variant="destructive" onClick={handleDelete}>
            <Trash2 className="mr-2 h-4 w-4" />
            Supprimer
          </Button>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            {/* Pourquoi ce verdict : l'explicabilité, règle par règle */}
            {analyzedDocuments.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="font-serif text-xl">
                    Pourquoi ce verdict
                  </CardTitle>
                  <CardDescription>
                    Chaque document est passé au moteur de règles déterministe.
                    Les points ci-dessous expliquent le verdict, règle par règle :
                    aucune boîte noire.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analyzedDocuments.map((doc) => {
                      const docVerdict = getVerdict(doc.statutDocument)
                      const problems = parseProblems(doc.problemesDetectes)
                      return (
                        <div
                          key={doc.id}
                          className={cn(
                            'rounded-md border p-4',
                            docVerdict.border,
                            docVerdict.bg
                          )}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="font-medium">
                              {documentTypeLabel(doc.typeDocument)}
                              <span className="ml-2 text-sm font-normal text-muted-foreground">
                                {doc.nomFichier}
                              </span>
                            </p>
                            <VerdictBadge status={doc.statutDocument} />
                          </div>
                          {problems.length > 0 ? (
                            <ul className="mt-3 space-y-1.5">
                              {problems.map((problem, idx) => (
                                <li
                                  key={idx}
                                  className={cn(
                                    'flex items-start gap-2 text-sm',
                                    docVerdict.text
                                  )}
                                >
                                  <AlertCircle
                                    className="mt-0.5 h-4 w-4 shrink-0"
                                    aria-hidden="true"
                                  />
                                  {problem}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p
                              className={cn(
                                'mt-3 flex items-start gap-2 text-sm',
                                docVerdict.text
                              )}
                            >
                              <CheckCircle2
                                className="mt-0.5 h-4 w-4 shrink-0"
                                aria-hidden="true"
                              />
                              Aucun problème détecté par le moteur de règles.
                            </p>
                          )}
                          {doc.dateVerification && (
                            <p className="mt-2 text-xs text-muted-foreground">
                              Vérifié le {formatDate(doc.dateVerification)}
                            </p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Documents */}
            <Card>
              <CardHeader>
                <CardTitle className="font-serif text-xl">
                  Documents ({dossier.documents.length})
                </CardTitle>
                <CardDescription>Diagnostics immobiliers du dossier</CardDescription>
              </CardHeader>
              <CardContent>
                <DocumentUploader dossierId={dossierId} onUploadComplete={fetchDossier} />

                {dossier.documents.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    <FileText className="mx-auto mb-4 h-12 w-12 opacity-50" />
                    <p>Aucun document uploadé</p>
                  </div>
                ) : (
                  <div className="mt-6 space-y-3">
                    {dossier.documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-start gap-4 rounded-md border p-4"
                      >
                        <FileText
                          className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground"
                          aria-hidden="true"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate font-medium">{doc.nomFichier}</p>
                            <VerdictBadge status={doc.statutDocument} />
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {documentTypeLabel(doc.typeDocument)} ·{' '}
                            {formatFileSize(doc.tailleFichier)}
                          </p>
                          {doc.dateVerification && (
                            <p className="mt-1 text-xs text-muted-foreground">
                              Vérifié le {formatDate(doc.dateVerification)}
                            </p>
                          )}
                          <div className="mt-3 flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.preventDefault()
                                window.open(`/api/documents/${doc.id}/view`, '_blank')
                              }}
                            >
                              <Eye className="mr-1 h-3 w-3" />
                              Voir
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-verdict-rouge hover:bg-verdict-rouge-bg hover:text-verdict-rouge"
                              onClick={async (e) => {
                                e.preventDefault()
                                if (!confirm('Supprimer ce document ?')) return
                                try {
                                  const res = await fetch(`/api/documents/${doc.id}`, {
                                    method: 'DELETE',
                                  })
                                  if (res.ok) fetchDossier()
                                } catch (err) {
                                  console.error(err)
                                }
                              }}
                            >
                              <Trash2 className="mr-1 h-3 w-3" />
                              Supprimer
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Résumé */}
            <Card>
              <CardHeader>
                <CardTitle className="font-serif text-xl">Résumé</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Documents</span>
                  <span className="font-medium">{dossier.documents.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Valides</span>
                  <span className="font-medium text-verdict-vert">
                    {dossier.documents.filter((d) => d.statutDocument === 'VALIDE').length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Incertains</span>
                  <span className="font-medium text-verdict-orange">
                    {dossier.documents.filter((d) => d.statutDocument === 'INCERTAIN').length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Refusés</span>
                  <span className="font-medium text-verdict-rouge">
                    {dossier.documents.filter((d) => d.statutDocument === 'REFUSE').length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">En attente</span>
                  <span className="font-medium text-verdict-attente">
                    {pendingDocuments.length}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Mention légale */}
            <Card className="bg-secondary">
              <CardContent className="p-4">
                <p className="text-xs text-secondary-foreground">
                  <strong>Avertissement :</strong> outil d&apos;aide à la vérification
                  documentaire. Ne se substitue pas à un audit réglementaire ou
                  juridique.
                </p>
              </CardContent>
            </Card>

            {/* Historique */}
            {showHistory && (
              <Card>
                <CardHeader>
                  <CardTitle className="font-serif text-xl">Historique</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="max-h-96 space-y-3 overflow-y-auto">
                    {dossier.analyseLogs.map((log) => (
                      <div key={log.id} className="border-b pb-2 text-sm">
                        <p className="font-medium">{log.action}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(log.createdAt)}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
