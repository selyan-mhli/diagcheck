import Anthropic from '@anthropic-ai/sdk'

const DEMO_MODE = !process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'sk-ant-api03-your-key-here'

const anthropic = DEMO_MODE ? null : new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const SYSTEM_PROMPT = `Tu es un assistant spécialisé en extraction factuelle de documents de diagnostics immobiliers français.
Tu dois uniquement extraire des informations explicitement présentes dans le document.
Tu ne dois jamais interpréter juridiquement un document ni conclure à une conformité légale.
Si une information est absente, floue ou ambiguë, indique "inconnu".
Ne produis aucun texte hors JSON.`

const USER_PROMPT = `Analyse le document PDF fourni.

Identifie le type de document parmi :
- DPE
- Amiante
- Plomb
- Électricité
- Gaz
- ERP / ESRIS
- Loi Carrez / Boutin
- Autre

Extrais les champs suivants s'ils sont présents :
- date_etablissement
- date_expiration
- adresse_bien
- lot_surface
- diagnostiqueur_nom
- diagnostiqueur_societe
- signature_detectee (oui / non / incertain)
- lisibilite (lisible / partiellement_illisible / illisible)

Signale toute ambiguïté dans le champ commentaires.

Retourne uniquement le JSON.`

export interface LlmExtractionResult {
  document_type: string
  date_etablissement: string
  date_expiration: string
  adresse_bien: string
  lot_surface: string
  diagnostiqueur_nom: string
  diagnostiqueur_societe: string
  signature_detectee: 'oui' | 'non' | 'incertain'
  lisibilite: 'lisible' | 'partiellement_illisible' | 'illisible'
  commentaires: string
}

// Détection du type de document basée sur le nom du fichier (mode démo)
function detectDocumentTypeFromFileName(fileName: string): string {
  const name = fileName.toLowerCase()
  if (name.includes('dpe')) return 'DPE'
  if (name.includes('amiante')) return 'Amiante'
  if (name.includes('plomb')) return 'Plomb'
  if (name.includes('electri')) return 'Électricité'
  if (name.includes('gaz')) return 'Gaz'
  if (name.includes('erp') || name.includes('esris')) return 'ERP / ESRIS'
  if (name.includes('carrez') || name.includes('boutin')) return 'Loi Carrez / Boutin'
  return 'Autre'
}

// Génère une extraction simulée pour le mode démo
function generateDemoExtraction(fileName: string): LlmExtractionResult {
  const docType = detectDocumentTypeFromFileName(fileName)
  const now = new Date()
  const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
  
  // Simuler différents scénarios selon le nom du fichier
  const isExpired = fileName.toLowerCase().includes('perime') || fileName.toLowerCase().includes('ancien')
  const isValid = fileName.toLowerCase().includes('ok') || fileName.toLowerCase().includes('valide')
  
  let expirationDate: Date
  if (isExpired) {
    // Document expiré (il y a 6 mois)
    expirationDate = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate())
  } else if (isValid) {
    // Document valide (expire dans 2 ans)
    expirationDate = new Date(now.getFullYear() + 2, now.getMonth(), now.getDate())
  } else {
    // Document qui expire bientôt (dans 2 mois)
    expirationDate = new Date(now.getFullYear(), now.getMonth() + 2, now.getDate())
  }

  return {
    document_type: docType,
    date_etablissement: oneYearAgo.toISOString().split('T')[0],
    date_expiration: expirationDate.toISOString().split('T')[0],
    adresse_bien: '123 Rue de la Démo, 75001 Paris',
    lot_surface: '75 m²',
    diagnostiqueur_nom: 'Jean Dupont (Mode Démo)',
    diagnostiqueur_societe: 'DiagDemo SARL',
    signature_detectee: isValid ? 'oui' : 'incertain',
    lisibilite: 'lisible',
    commentaires: `[MODE DÉMO] Document simulé. Type détecté: ${docType}. ${isExpired ? 'Document expiré.' : isValid ? 'Document valide.' : 'Document à vérifier.'}`,
  }
}

export async function extractDocumentData(
  pdfBase64: string,
  fileName?: string
): Promise<LlmExtractionResult> {
  // Mode démo : simulation sans appel API
  if (DEMO_MODE) {
    console.log('[MODE DÉMO] Simulation de l\'extraction LLM')
    // Simuler un délai pour rendre l'expérience réaliste
    await new Promise(resolve => setTimeout(resolve, 500))
    return generateDemoExtraction(fileName || 'document.pdf')
  }

  // Mode production : appel API Anthropic
  const response = await anthropic!.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'document',
            source: {
              type: 'base64',
              media_type: 'application/pdf',
              data: pdfBase64,
            },
          },
          {
            type: 'text',
            text: USER_PROMPT,
          },
        ],
      },
    ],
  })

  const textContent = response.content.find((c) => c.type === 'text')
  if (!textContent || textContent.type !== 'text') {
    throw new Error('Réponse LLM invalide')
  }

  try {
    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('JSON non trouvé dans la réponse')
    }
    return JSON.parse(jsonMatch[0]) as LlmExtractionResult
  } catch {
    throw new Error('Impossible de parser la réponse JSON du LLM')
  }
}
