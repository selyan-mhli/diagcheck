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
  CheckCircle,
  AlertCircle,
  XCircle,
  Clock,
  Download,
  Play,
  Trash2,
  History,
  Eye,
} from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface Document {
  id: string
  nomFichier: string
  typeDocument: string | null
  statutDocument: string
  problemesDetectes: string[]
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
    case 'VALIDE':
      return 'Valide'
    case 'INCERTAIN':
      return 'À vérifier'
    case 'REFUSE':
      return 'Non conforme'
    default:
      return 'En attente'
  }
}

function getStatusBadgeClass(status: string) {
  switch (status) {
    case 'VERT':
    case 'VALIDE':
      return 'bg-green-100 text-green-800 border-green-200'
    case 'ORANGE':
    case 'INCERTAIN':
      return 'bg-amber-100 text-amber-800 border-amber-200'
    case 'ROUGE':
    case 'REFUSE':
      return 'bg-red-100 text-red-800 border-red-200'
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!session || !dossier) {
    return null
  }

  const pendingDocuments = dossier.documents.filter(
    (d) => d.statutDocument === 'EN_ATTENTE'
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <div className="mb-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour aux dossiers
          </Link>
        </div>

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-8">
          <div className="flex items-start gap-4">
            {getStatusIcon(dossier.statutGlobal)}
            <div>
              <h1 className="text-2xl font-bold">{dossier.nomBien}</h1>
              <p className="text-muted-foreground">{dossier.adresse}</p>
              <p className="text-sm text-muted-foreground mt-1">
                Créé le {formatDate(dossier.dateCreation)}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <span
              className={`px-4 py-2 text-sm font-medium rounded-full border ${getStatusBadgeClass(
                dossier.statutGlobal
              )}`}
            >
              {getStatusLabel(dossier.statutGlobal)}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-3 mb-8">
          <Button
            onClick={handleAnalyze}
            disabled={analyzing || pendingDocuments.length === 0}
          >
            <Play className="h-4 w-4 mr-2" />
            {analyzing ? 'Analyse en cours...' : `Analyser (${pendingDocuments.length})`}
          </Button>
          <Button variant="outline" onClick={handleDownloadReport}>
            <Download className="h-4 w-4 mr-2" />
            Télécharger le rapport
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowHistory(!showHistory)}
          >
            <History className="h-4 w-4 mr-2" />
            Historique
          </Button>
          <Button variant="destructive" onClick={handleDelete}>
            <Trash2 className="h-4 w-4 mr-2" />
            Supprimer
          </Button>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Documents */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Documents ({dossier.documents.length})</CardTitle>
                <CardDescription>
                  Diagnostics immobiliers du dossier
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DocumentUploader
                  dossierId={dossierId}
                  onUploadComplete={fetchDossier}
                />

                {dossier.documents.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Aucun document uploadé</p>
                  </div>
                ) : (
                  <div className="mt-6 space-y-3">
                    {dossier.documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-start gap-4 p-4 border rounded-lg"
                      >
                        {getStatusIcon(doc.statutDocument)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium truncate">{doc.nomFichier}</p>
                            <span
                              className={`px-2 py-0.5 text-xs rounded-full border ${getStatusBadgeClass(
                                doc.statutDocument
                              )}`}
                            >
                              {getStatusLabel(doc.statutDocument)}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {doc.typeDocument || 'Type non détecté'} •{' '}
                            {formatFileSize(doc.tailleFichier)}
                          </p>
                          {doc.problemesDetectes && (() => {
                            const problems = typeof doc.problemesDetectes === 'string' 
                              ? JSON.parse(doc.problemesDetectes) 
                              : doc.problemesDetectes
                            return problems.length > 0 && (
                              <div className="mt-2">
                                {problems.map((problem: string, idx: number) => (
                                  <p
                                    key={idx}
                                    className="text-sm text-red-600 flex items-center gap-1"
                                  >
                                    <XCircle className="h-3 w-3" />
                                    {problem}
                                  </p>
                                ))}
                              </div>
                            )
                          })()}
                          {doc.dateVerification && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Vérifié le {formatDate(doc.dateVerification)}
                            </p>
                          )}
                          <div className="flex gap-2 mt-3">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.preventDefault()
                                window.open(`/api/documents/${doc.id}/view`, '_blank')
                              }}
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              Voir
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={async (e) => {
                                e.preventDefault()
                                if (!confirm('Supprimer ce document ?')) return
                                try {
                                  const res = await fetch(`/api/documents/${doc.id}`, { method: 'DELETE' })
                                  if (res.ok) fetchDossier()
                                } catch (err) {
                                  console.error(err)
                                }
                              }}
                            >
                              <Trash2 className="h-3 w-3 mr-1" />
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
                <CardTitle>Résumé</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Documents</span>
                  <span className="font-medium">{dossier.documents.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Valides</span>
                  <span className="font-medium text-green-600">
                    {dossier.documents.filter((d) => d.statutDocument === 'VALIDE').length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">À vérifier</span>
                  <span className="font-medium text-amber-600">
                    {dossier.documents.filter((d) => d.statutDocument === 'INCERTAIN').length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Non conformes</span>
                  <span className="font-medium text-red-600">
                    {dossier.documents.filter((d) => d.statutDocument === 'REFUSE').length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">En attente</span>
                  <span className="font-medium text-gray-600">
                    {dossier.documents.filter((d) => d.statutDocument === 'EN_ATTENTE').length}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Mention légale */}
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <p className="text-xs text-blue-800">
                  <strong>Avertissement :</strong> Outil d&apos;aide à la vérification
                  documentaire. Ne se substitue pas à un audit réglementaire ou
                  juridique.
                </p>
              </CardContent>
            </Card>

            {/* Historique */}
            {showHistory && (
              <Card>
                <CardHeader>
                  <CardTitle>Historique</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {dossier.analyseLogs.map((log) => (
                      <div key={log.id} className="text-sm border-b pb-2">
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
