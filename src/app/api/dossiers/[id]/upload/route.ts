import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { uploadFile } from '@/lib/s3'
import AdmZip from 'adm-zip'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 Mo

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
    })

    if (!dossier) {
      return NextResponse.json({ error: 'Dossier non trouvé' }, { status: 404 })
    }

    const formData = await request.formData()
    const files = formData.getAll('files') as File[]

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 })
    }

    const uploadedDocuments = []

    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `Le fichier ${file.name} dépasse la taille maximale de 10 Mo` },
          { status: 400 }
        )
      }

      const buffer = Buffer.from(await file.arrayBuffer())

      // Si c'est un ZIP, extraire les PDF
      if (file.name.toLowerCase().endsWith('.zip')) {
        const zip = new AdmZip(buffer)
        const zipEntries = zip.getEntries()

        for (const entry of zipEntries) {
          if (
            !entry.isDirectory &&
            entry.entryName.toLowerCase().endsWith('.pdf')
          ) {
            const pdfBuffer = entry.getData()
            const fileName = entry.entryName.split('/').pop() || entry.entryName

            if (pdfBuffer.length > MAX_FILE_SIZE) {
              continue // Skip les fichiers trop gros
            }

            const { s3Key, fileHash } = await uploadFile(
              pdfBuffer,
              fileName,
              'application/pdf'
            )

            const document = await prisma.document.create({
              data: {
                dossierId: params.id,
                nomFichier: fileName,
                s3Key,
                fileHash,
                tailleFichier: pdfBuffer.length,
              },
            })

            uploadedDocuments.push(document)
          }
        }
      } else if (file.name.toLowerCase().endsWith('.pdf')) {
        const { s3Key, fileHash } = await uploadFile(
          buffer,
          file.name,
          'application/pdf'
        )

        const document = await prisma.document.create({
          data: {
            dossierId: params.id,
            nomFichier: file.name,
            s3Key,
            fileHash,
            tailleFichier: file.size,
          },
        })

        uploadedDocuments.push(document)
      } else {
        return NextResponse.json(
          { error: `Format non supporté: ${file.name}. Seuls les PDF et ZIP sont acceptés.` },
          { status: 400 }
        )
      }
    }

    await prisma.analyseLog.create({
      data: {
        dossierId: params.id,
        action: 'DOCUMENTS_UPLOADED',
        details: JSON.stringify({
          count: uploadedDocuments.length,
          files: uploadedDocuments.map((d) => d.nomFichier),
        }),
      },
    })

    return NextResponse.json({
      message: `${uploadedDocuments.length} document(s) uploadé(s)`,
      documents: uploadedDocuments,
    })
  } catch (error) {
    console.error('Erreur lors de l\'upload:', error)
    return NextResponse.json(
      { error: 'Erreur lors de l\'upload des documents' },
      { status: 500 }
    )
  }
}
