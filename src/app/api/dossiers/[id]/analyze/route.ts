import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getFileBuffer } from '@/lib/s3'
import { extractDocumentData } from '@/lib/llm'
import { evaluateDocument, computeGlobalStatus, normalizeDocumentType } from '@/lib/rules-engine'

const VALID_DOCUMENT_TYPES = ['DPE', 'AMIANTE', 'PLOMB', 'ELECTRICITE', 'GAZ', 'ERP_ESRIS', 'LOI_CARREZ_BOUTIN', 'AUTRE']

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const dossier = await prisma.dossier.findFirst({
      where: {
        id: params.id,
        agencyId: session.user.id,
      },
      include: {
        documents: true,
      },
    })

    if (!dossier) {
      return NextResponse.json({ error: 'Dossier non trouvé' }, { status: 404 })
    }

    const pendingDocuments = dossier.documents.filter(
      (d) => d.statutDocument === 'EN_ATTENTE'
    )

    if (pendingDocuments.length === 0) {
      return NextResponse.json({
        message: 'Aucun document en attente d\'analyse',
      })
    }

    const results = []

    for (const document of pendingDocuments) {
      try {
        // Récupérer le fichier depuis S3
        const fileBuffer = await getFileBuffer(document.s3Key)
        const pdfBase64 = fileBuffer.toString('base64')

        // Extraction LLM (passe le nom du fichier pour le mode démo)
        const extraction = await extractDocumentData(pdfBase64, document.nomFichier)

        // Application du moteur de règles
        const ruleResult = evaluateDocument(extraction, dossier.adresse)

        // Mapper le type de document
        const docType = normalizeDocumentType(extraction.document_type)
        const typeDocument = VALID_DOCUMENT_TYPES.includes(docType) ? docType : null

        // Mettre à jour le document
        await prisma.document.update({
          where: { id: document.id },
          data: {
            typeDocument,
            statutDocument: ruleResult.status || 'INCERTAIN',
            extractionLlm: JSON.stringify(extraction),
            resultatRegles: JSON.stringify(ruleResult),
            problemesDetectes: JSON.stringify(ruleResult.problems),
            dateVerification: new Date(),
          },
        })

        // Log d'analyse
        await prisma.analyseLog.create({
          data: {
            dossierId: params.id,
            action: 'DOCUMENT_ANALYZED',
            details: JSON.stringify({
              documentId: document.id,
              fileName: document.nomFichier,
              typeDetected: extraction.document_type,
              status: ruleResult.status,
              problems: ruleResult.problems,
              appliedRules: ruleResult.appliedRules,
            }),
          },
        })

        results.push({
          documentId: document.id,
          fileName: document.nomFichier,
          status: ruleResult.status,
          problems: ruleResult.problems,
        })
      } catch (docError) {
        console.error(`Erreur analyse document ${document.id}:`, docError)

        await prisma.document.update({
          where: { id: document.id },
          data: {
            statutDocument: 'INCERTAIN',
            problemesDetectes: JSON.stringify(['Erreur lors de l\'analyse du document']),
            dateVerification: new Date(),
          },
        })

        await prisma.analyseLog.create({
          data: {
            dossierId: params.id,
            action: 'DOCUMENT_ANALYSIS_ERROR',
            details: JSON.stringify({
              documentId: document.id,
              fileName: document.nomFichier,
              error: String(docError),
            }),
          },
        })

        results.push({
          documentId: document.id,
          fileName: document.nomFichier,
          status: 'INCERTAIN',
          problems: ['Erreur lors de l\'analyse'],
        })
      }
    }

    // Recalculer le statut global du dossier
    const allDocuments = await prisma.document.findMany({
      where: { dossierId: params.id },
    })

    const documentStatuses = allDocuments.map((d) => {
      if (d.statutDocument === 'VALIDE') return 'VALIDE'
      if (d.statutDocument === 'REFUSE') return 'REFUSE'
      return 'INCERTAIN'
    }) as ('VALIDE' | 'INCERTAIN' | 'REFUSE')[]

    const globalStatus = computeGlobalStatus(documentStatuses)

    await prisma.dossier.update({
      where: { id: params.id },
      data: { statutGlobal: globalStatus },
    })

    await prisma.analyseLog.create({
      data: {
        dossierId: params.id,
        action: 'DOSSIER_STATUS_UPDATED',
        details: JSON.stringify({
          previousStatus: dossier.statutGlobal,
          newStatus: globalStatus,
          analyzedDocuments: results.length,
        }),
      },
    })

    return NextResponse.json({
      message: `${results.length} document(s) analysé(s)`,
      globalStatus,
      results,
    })
  } catch (error) {
    console.error('Erreur lors de l\'analyse:', error)
    return NextResponse.json(
      { error: 'Erreur lors de l\'analyse des documents' },
      { status: 500 }
    )
  }
}
