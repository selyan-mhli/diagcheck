import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { deleteFile } from '@/lib/s3'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // Vérifier que le document appartient à un dossier de l'agence
    const document = await prisma.document.findFirst({
      where: { id: params.id },
      include: {
        dossier: true,
      },
    })

    if (!document || document.dossier.agencyId !== session.user.id) {
      return NextResponse.json({ error: 'Document non trouvé' }, { status: 404 })
    }

    // Supprimer le fichier du stockage
    try {
      await deleteFile(document.s3Key)
    } catch (e) {
      console.error('Erreur suppression fichier:', e)
    }

    // Supprimer le document de la base
    await prisma.document.delete({
      where: { id: params.id },
    })

    // Log
    await prisma.analyseLog.create({
      data: {
        dossierId: document.dossierId,
        action: 'DOCUMENT_DELETED',
        details: JSON.stringify({
          documentId: document.id,
          fileName: document.nomFichier,
        }),
      },
    })

    return NextResponse.json({ message: 'Document supprimé' })
  } catch (error) {
    console.error('Erreur lors de la suppression:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la suppression du document' },
      { status: 500 }
    )
  }
}
