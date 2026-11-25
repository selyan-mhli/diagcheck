import { LlmExtractionResult } from './llm'
import rulesConfig from '@/config/rules.json'

export type DocumentStatus = 'VALIDE' | 'INCERTAIN' | 'REFUSE'

export interface RuleResult {
  status: DocumentStatus
  problems: string[]
  appliedRules: string[]
}

interface ValidationRule {
  id: string
  name: string
  documentTypes: string[]
  validityYears: number | null
  conditions: {
    type: string
    field?: string
    value?: string | string[]
    message: string
    resultStatus: DocumentStatus
  }[]
}

interface RulesConfig {
  version: string
  rules: ValidationRule[]
  globalRules: {
    id: string
    name: string
    condition: {
      type: string
      field?: string
      value?: string | string[]
      message: string
      resultStatus: DocumentStatus
    }
  }[]
}

const config = rulesConfig as RulesConfig

function normalizeDocumentType(type: string): string {
  const mapping: Record<string, string> = {
    'dpe': 'DPE',
    'amiante': 'AMIANTE',
    'plomb': 'PLOMB',
    'électricité': 'ELECTRICITE',
    'electricité': 'ELECTRICITE',
    'electricite': 'ELECTRICITE',
    'gaz': 'GAZ',
    'erp': 'ERP_ESRIS',
    'esris': 'ERP_ESRIS',
    'erp / esris': 'ERP_ESRIS',
    'erp/esris': 'ERP_ESRIS',
    'loi carrez': 'LOI_CARREZ_BOUTIN',
    'loi boutin': 'LOI_CARREZ_BOUTIN',
    'loi carrez / boutin': 'LOI_CARREZ_BOUTIN',
    'carrez': 'LOI_CARREZ_BOUTIN',
    'boutin': 'LOI_CARREZ_BOUTIN',
    'autre': 'AUTRE',
  }
  return mapping[type.toLowerCase()] || 'AUTRE'
}

/**
 * Ajoute des mois entiers à une date, sans débordement de fin de mois
 * (31 août + 6 mois = 28 février, pas 3 mars). Les durées fractionnaires
 * en années (ex. 0,5) sont converties en mois par l'appelant.
 * Convention : un document est périmé seulement si "maintenant" est
 * strictement postérieur à la date retournée.
 */
function addMonthsClamped(date: Date, months: number): Date {
  const result = new Date(date)
  const day = result.getDate()
  result.setDate(1)
  result.setMonth(result.getMonth() + months)
  const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate()
  result.setDate(Math.min(day, lastDay))
  return result
}

export function isExpired(dateStr: string, validityYears: number): boolean {
  if (!dateStr || dateStr === 'inconnu') return false
  
  try {
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return false
    
    return new Date() > addMonthsClamped(date, Math.round(validityYears * 12))
  } catch {
    return false
  }
}

function checkCondition(
  condition: { type: string; field?: string; value?: string | string[]; message: string; resultStatus: DocumentStatus },
  extraction: LlmExtractionResult,
  validityYears: number | null
): { triggered: boolean; message: string; status: DocumentStatus } {
  const { type, field, value, message, resultStatus } = condition

  switch (type) {
    case 'field_equals':
      if (field && value) {
        const fieldValue = extraction[field as keyof LlmExtractionResult]
        const matches = Array.isArray(value)
          ? value.includes(String(fieldValue))
          : String(fieldValue) === value
        return { triggered: matches, message, status: resultStatus }
      }
      break

    case 'field_missing':
      if (field) {
        const fieldValue = extraction[field as keyof LlmExtractionResult]
        const isMissing = !fieldValue || fieldValue === 'inconnu' || fieldValue === ''
        return { triggered: isMissing, message, status: resultStatus }
      }
      break

    case 'expired':
      if (validityYears !== null) {
        const expired = isExpired(extraction.date_etablissement, validityYears)
        return { triggered: expired, message, status: resultStatus }
      }
      break

    case 'signature_missing':
      return {
        triggered: extraction.signature_detectee === 'non',
        message,
        status: resultStatus,
      }

    case 'signature_uncertain':
      return {
        triggered: extraction.signature_detectee === 'incertain',
        message,
        status: resultStatus,
      }

    case 'illegible':
      return {
        triggered: extraction.lisibilite === 'illisible',
        message,
        status: resultStatus,
      }

    case 'partially_illegible':
      return {
        triggered: extraction.lisibilite === 'partiellement_illisible',
        message,
        status: resultStatus,
      }
  }

  return { triggered: false, message: '', status: 'VALIDE' }
}

export function evaluateDocument(
  extraction: LlmExtractionResult,
  bienAdresse: string
): RuleResult {
  const problems: string[] = []
  const appliedRules: string[] = []
  let finalStatus: DocumentStatus = 'VALIDE'

  const docType = normalizeDocumentType(extraction.document_type)

  // Appliquer les règles globales
  for (const globalRule of config.globalRules) {
    const result = checkCondition(globalRule.condition, extraction, null)
    if (result.triggered) {
      problems.push(result.message)
      appliedRules.push(globalRule.id)
      if (result.status === 'REFUSE') {
        finalStatus = 'REFUSE'
      } else if (result.status === 'INCERTAIN' && finalStatus !== 'REFUSE') {
        finalStatus = 'INCERTAIN'
      }
    }
  }

  // Vérifier la cohérence d'adresse
  if (extraction.adresse_bien && extraction.adresse_bien !== 'inconnu') {
    const extractedAddr = extraction.adresse_bien.toLowerCase().replace(/[^a-z0-9]/g, '')
    const bienAddr = bienAdresse.toLowerCase().replace(/[^a-z0-9]/g, '')
    
    // Vérification simple de similarité
    if (extractedAddr.length > 5 && bienAddr.length > 5) {
      const similarity = extractedAddr.includes(bienAddr.substring(0, 10)) || 
                        bienAddr.includes(extractedAddr.substring(0, 10))
      if (!similarity) {
        problems.push('Adresse du document incohérente avec l\'adresse du bien')
        appliedRules.push('address_mismatch')
        finalStatus = 'REFUSE'
      }
    }
  }

  // Appliquer les règles spécifiques au type de document
  const documentRule = config.rules.find((r) =>
    r.documentTypes.includes(docType)
  )

  if (documentRule) {
    for (const condition of documentRule.conditions) {
      const result = checkCondition(condition, extraction, documentRule.validityYears)
      if (result.triggered) {
        problems.push(result.message)
        appliedRules.push(`${documentRule.id}_${condition.type}`)
        if (result.status === 'REFUSE') {
          finalStatus = 'REFUSE'
        } else if (result.status === 'INCERTAIN' && finalStatus !== 'REFUSE') {
          finalStatus = 'INCERTAIN'
        }
      }
    }

    // Vérifier l'expiration si validityYears est défini
    if (documentRule.validityYears !== null && finalStatus !== 'REFUSE') {
      const expired = isExpired(extraction.date_etablissement, documentRule.validityYears)
      if (expired) {
        problems.push(`Diagnostic périmé (validité: ${documentRule.validityYears} ans)`)
        appliedRules.push(`${documentRule.id}_expired`)
        finalStatus = 'REFUSE'
      }
    }
  }

  return {
    status: finalStatus,
    problems,
    appliedRules,
  }
}

export function computeGlobalStatus(
  documentStatuses: DocumentStatus[]
): 'VERT' | 'ORANGE' | 'ROUGE' {
  if (documentStatuses.some((s) => s === 'REFUSE')) {
    return 'ROUGE'
  }
  if (documentStatuses.some((s) => s === 'INCERTAIN')) {
    return 'ORANGE'
  }
  return 'VERT'
}

export { normalizeDocumentType }
