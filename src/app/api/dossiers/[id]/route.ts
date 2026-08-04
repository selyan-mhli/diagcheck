import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
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
        documents: {
          orderBy: { createdAt: 'desc' },
        },
        analyseLogs: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
    })

    if (!dossier) {
      return NextResponse.json({ error: 'Dossier non trouvé' }, { status: 404 })
    }

    return NextResponse.json(dossier)
  } catch (error) {
    console.error('Erreur lors de la récupération du dossier:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération du dossier' },
      { status: 500 }
    )
  }
}

export async function DELETE(
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

    await prisma.dossier.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ message: 'Dossier supprimé' })
  } catch (error) {
    console.error('Erreur lors de la suppression du dossier:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la suppression du dossier' },
      { status: 500 }
    )
  }
}
