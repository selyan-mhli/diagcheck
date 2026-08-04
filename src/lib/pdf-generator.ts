import PDFDocument from 'pdfkit'

const LEGAL_DISCLAIMER = 
  "Outil d'aide à la vérification documentaire. Ne se substitue pas à un audit réglementaire ou juridique."

interface DocumentData {
  id: string
  nomFichier: string
  typeDocument: string | null
  statutDocument: string
  problemesDetectes: string
  dateVerification: Date | null
}

interface DossierWithDocuments {
  id: string
  nomBien: string
  adresse: string
  statutGlobal: string
  documents: DocumentData[]
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'VALIDE':
      return 'Valide'
    case 'INCERTAIN':
      return 'À vérifier'
    case 'REFUSE':
      return 'Non conforme'
    case 'VERT':
      return 'Prêt à signer'
    case 'ORANGE':
      return 'À vérifier'
    case 'ROUGE':
      return 'Non conforme'
    default:
      return 'En attente'
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'VALIDE':
    case 'VERT':
      return '#22c55e'
    case 'INCERTAIN':
    case 'ORANGE':
      return '#f59e0b'
    case 'REFUSE':
    case 'ROUGE':
      return '#ef4444'
    default:
      return '#6b7280'
  }
}

export async function generateReport(dossier: DossierWithDocuments): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 })
      const chunks: Buffer[] = []

      doc.on('data', (chunk) => chunks.push(chunk))
      doc.on('end', () => resolve(Buffer.concat(chunks)))
      doc.on('error', reject)

      // En-tête
      doc
        .fontSize(24)
        .fillColor('#1e40af')
        .text('DiagCheck', { align: 'center' })
        .fontSize(12)
        .fillColor('#6b7280')
        .text('Rapport de vérification documentaire', { align: 'center' })
        .moveDown(2)

      // Informations du bien
      doc
        .fontSize(16)
        .fillColor('#111827')
        .text('Informations du bien')
        .moveDown(0.5)

      doc
        .fontSize(11)
        .fillColor('#374151')
        .text(`Nom du bien : ${dossier.nomBien}`)
        .text(`Adresse : ${dossier.adresse}`)
        .text(`Date de vérification : ${new Date().toLocaleDateString('fr-FR')}`)
        .moveDown(1)

      // Statut global
      doc
        .fontSize(16)
        .fillColor('#111827')
        .text('Statut global')
        .moveDown(0.5)

      const globalStatusLabel = getStatusLabel(dossier.statutGlobal)
      const globalStatusColor = getStatusColor(dossier.statutGlobal)

      doc
        .fontSize(14)
        .fillColor(globalStatusColor)
        .text(globalStatusLabel, { continued: false })
        .moveDown(1.5)

      // Tableau des diagnostics
      doc
        .fontSize(16)
        .fillColor('#111827')
        .text('Détail des diagnostics')
        .moveDown(0.5)

      // En-têtes du tableau
      const tableTop = doc.y
      const col1 = 50
      const col2 = 200
      const col3 = 320
      const col4 = 420

      doc
        .fontSize(10)
        .fillColor('#6b7280')
        .text('Document', col1, tableTop)
        .text('Type', col2, tableTop)
        .text('Statut', col3, tableTop)
        .text('Problèmes', col4, tableTop)

      doc
        .moveTo(col1, tableTop + 15)
        .lineTo(550, tableTop + 15)
        .strokeColor('#e5e7eb')
        .stroke()

      let yPosition = tableTop + 25

      for (const document of dossier.documents) {
        const statusLabel = getStatusLabel(document.statutDocument)
        const statusColor = getStatusColor(document.statutDocument)
        const problemsArray = typeof document.problemesDetectes === 'string' 
          ? JSON.parse(document.problemesDetectes) 
          : (document.problemesDetectes || [])
        const problems = problemsArray.length > 0 ? problemsArray.join(', ') : '-'

        // Vérifier si on a besoin d'une nouvelle page
        if (yPosition > 700) {
          doc.addPage()
          yPosition = 50
        }

        doc
          .fontSize(9)
          .fillColor('#374151')
          .text(document.nomFichier.substring(0, 25), col1, yPosition, { width: 140 })
          .text(document.typeDocument || 'Inconnu', col2, yPosition, { width: 110 })
          .fillColor(statusColor)
          .text(statusLabel, col3, yPosition, { width: 90 })
          .fillColor('#374151')
          .text(problems.substring(0, 30), col4, yPosition, { width: 130 })

        yPosition += 25
      }

      doc.moveDown(2)

      // Résumé
      doc
        .fontSize(16)
        .fillColor('#111827')
        .text('Résumé', 50)
        .moveDown(0.5)

      const validCount = dossier.documents.filter(d => d.statutDocument === 'VALIDE').length
      const uncertainCount = dossier.documents.filter(d => d.statutDocument === 'INCERTAIN').length
      const refusedCount = dossier.documents.filter(d => d.statutDocument === 'REFUSE').length

      doc
        .fontSize(11)
        .fillColor('#374151')
        .text(`Documents analysés : ${dossier.documents.length}`)
        .fillColor('#22c55e')
        .text(`Valides : ${validCount}`)
        .fillColor('#f59e0b')
        .text(`À vérifier : ${uncertainCount}`)
        .fillColor('#ef4444')
        .text(`Non conformes : ${refusedCount}`)
        .moveDown(2)

      // Mention légale
      doc
        .fontSize(9)
        .fillColor('#9ca3af')
        .text(LEGAL_DISCLAIMER, 50, doc.page.height - 80, {
          align: 'center',
          width: doc.page.width - 100,
        })

      doc.end()
    } catch (error) {
      reject(error)
    }
  })
}
