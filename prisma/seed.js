/**
 * Seed de démo DiagCheck (idempotent, aucun appel API).
 *
 * Crée :
 *  - l'agence demo@agence-exemple.fr (mot de passe : DemoDiag2026!)
 *  - un dossier déjà analysé (verdict ORANGE) avec 3 documents plausibles :
 *      DPE VALIDE, ERP REFUSE, Amiante INCERTAIN
 *
 * Lancement : npm run db:seed  (ou : node prisma/seed.js)
 * JS pur volontairement : ni tsx ni ts-node ne sont présents dans le projet.
 */
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

const DEMO_EMAIL = 'demo@agence-exemple.fr'
const DEMO_PASSWORD = 'DemoDiag2026!'
const DOSSIER_ID = 'seed-dossier-avignon-t3'
const ANALYSE_DATE = new Date('2026-07-28T10:15:00.000Z')

async function main() {
  // Même coût que register/route.ts : bcrypt, 12 rounds
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12)

  const agency = await prisma.agency.upsert({
    where: { email: DEMO_EMAIL },
    update: { name: 'Agence Exemple Provence' },
    create: {
      email: DEMO_EMAIL,
      passwordHash,
      name: 'Agence Exemple Provence',
    },
  })

  const dossierData = {
    nomBien: 'Appartement T3, 12 rue des Lilas, Avignon',
    adresse: '12 rue des Lilas, 84000 Avignon',
    statutGlobal: 'ORANGE',
    agencyId: agency.id,
  }

  await prisma.dossier.upsert({
    where: { id: DOSSIER_ID },
    update: dossierData,
    create: { id: DOSSIER_ID, ...dossierData },
  })

  const documents = [
    {
      id: 'seed-doc-dpe',
      nomFichier: 'DPE_12-rue-des-lilas_2025.pdf',
      s3Key: 'seed/demo/dpe-12-rue-des-lilas.pdf',
      fileHash: 'a3f1c9e07b52d8146fa0b9e3c4d75a218e6f0b3c9d1a4e7f2b5c8d0e3f6a9b1c',
      tailleFichier: 412876,
      typeDocument: 'DPE',
      statutDocument: 'VALIDE',
      resultatRegles: JSON.stringify({
        statut: 'VALIDE',
        regles: ['Validité 10 ans : OK', 'Classe énergie présente : OK'],
      }),
      problemesDetectes: JSON.stringify([]),
      dateVerification: ANALYSE_DATE,
    },
    {
      id: 'seed-doc-erp',
      nomFichier: 'ERP_12-rue-des-lilas_2025.pdf',
      s3Key: 'seed/demo/erp-12-rue-des-lilas.pdf',
      fileHash: 'b7d2e4f18c63a9057eb1c0f4d5e86b329f7a1c4d0e2b5f8a3c6d9e1f4a7b0c2d',
      tailleFichier: 187342,
      typeDocument: 'ERP_ESRIS',
      statutDocument: 'REFUSE',
      resultatRegles: JSON.stringify({
        statut: 'REFUSE',
        regles: ['Validité 6 mois : DÉPASSÉE'],
      }),
      problemesDetectes: JSON.stringify([
        'Document daté de plus de 6 mois : l\'état des risques et pollutions doit avoir moins de 6 mois à la date de signature',
      ]),
      dateVerification: ANALYSE_DATE,
    },
    {
      id: 'seed-doc-amiante',
      nomFichier: 'Amiante_12-rue-des-lilas_2019.pdf',
      s3Key: 'seed/demo/amiante-12-rue-des-lilas.pdf',
      fileHash: 'c9e3f5a20d74b1168fc2d1a5e6f97c430a8b2d5e1f3c6a9b4d7e0f2a5b8c1d3e',
      tailleFichier: 653209,
      typeDocument: 'AMIANTE',
      statutDocument: 'INCERTAIN',
      resultatRegles: JSON.stringify({
        statut: 'INCERTAIN',
        regles: ['Lisibilité du rapport : PARTIELLE'],
      }),
      problemesDetectes: JSON.stringify([
        'Lisibilité partielle du document : la date de repérage n\'a pas pu être vérifiée avec certitude',
      ]),
      dateVerification: ANALYSE_DATE,
    },
  ]

  for (const doc of documents) {
    const { id, ...data } = doc
    await prisma.document.upsert({
      where: { id },
      update: data,
      create: { id, dossierId: DOSSIER_ID, ...data },
    })
  }

  const logs = [
    {
      id: 'seed-log-upload',
      action: 'UPLOAD_DOCUMENTS',
      details: JSON.stringify({ nombre: 3, source: 'seed de démo' }),
    },
    {
      id: 'seed-log-analyse',
      action: 'ANALYSE_TERMINEE',
      details: JSON.stringify({
        statutGlobal: 'ORANGE',
        valides: 1,
        incertains: 1,
        refuses: 1,
      }),
    },
  ]

  for (const log of logs) {
    const { id, ...data } = log
    await prisma.analyseLog.upsert({
      where: { id },
      update: data,
      create: { id, dossierId: DOSSIER_ID, ...data },
    })
  }

  console.log('Seed de démo terminé.')
  console.log(`  Compte : ${DEMO_EMAIL} / ${DEMO_PASSWORD}`)
  console.log('  Dossier : Appartement T3, 12 rue des Lilas, Avignon (verdict ORANGE)')
}

main()
  .catch((error) => {
    console.error('Erreur pendant le seed :', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
