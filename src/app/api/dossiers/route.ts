import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createDossierSchema = z.object({
  nomBien: z.string().min(1, 'Le nom du bien est requis'),
  adresse: z.string().min(1, 'L\'adresse est requise'),
})

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const dossiers = await prisma.dossier.findMany({
      where: { agencyId: session.user.id },
      include: {
        documents: {
          select: {
            id: true,
            nomFichier: true,
            typeDocument: true,
            statutDocument: true,
            problemesDetectes: true,
            dateVerification: true,
          },
        },
        _count: {
          select: { documents: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(dossiers)
  } catch (error) {
    console.error('Erreur lors de la récupération des dossiers:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des dossiers' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const body = await request.json()
    const { nomBien, adresse } = createDossierSchema.parse(body)

    const dossier = await prisma.dossier.create({
      data: {
        nomBien,
        adresse,
        agencyId: session.user.id,
      },
    })

    await prisma.analyseLog.create({
      data: {
        dossierId: dossier.id,
        action: 'DOSSIER_CREATED',
        details: JSON.stringify({ nomBien, adresse }),
      },
    })

    return NextResponse.json(dossier, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    console.error('Erreur lors de la création du dossier:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création du dossier' },
      { status: 500 }
    )
  }
}
