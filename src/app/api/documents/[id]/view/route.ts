import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getFileBuffer } from '@/lib/s3'

export async function GET(
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

    // Récupérer le fichier
    const buffer = await getFileBuffer(document.s3Key)

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${document.nomFichier}"`,
      },
    })
  } catch (error) {
    console.error('Erreur lors de la récupération du document:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération du document' },
      { status: 500 }
    )
  }
}
