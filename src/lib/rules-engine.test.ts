import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { evaluateDocument, isExpired } from './rules-engine'
import rulesConfig from '@/config/rules.json'

// Convention : un document est périmé uniquement si "maintenant" est
// strictement postérieur à la date d'expiration. Le jour anniversaire exact
// (date + validité) est encore valide ; le lendemain il est périmé.

const NOW = new Date('2026-11-25T12:00:00Z')

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
})
afterEach(() => {
  vi.useRealTimers()
})

describe('isExpired', () => {
  it('ERP (0,5 an) daté d\'il y a 3 mois : non périmé', () => {
    expect(isExpired('2026-08-25', 0.5)).toBe(false)
  })

  it('ERP (0,5 an) daté d\'il y a 7 mois : périmé', () => {
    expect(isExpired('2026-04-25', 0.5)).toBe(true)
  })

  it('ERP établi hier : non périmé', () => {
    expect(isExpired('2026-11-24', 0.5)).toBe(false)
  })

  it('DPE (10 ans) de 9 ans : non périmé', () => {
    expect(isExpired('2017-11-25', 10)).toBe(false)
  })

  it('DPE (10 ans) de 11 ans : périmé', () => {
    expect(isExpired('2015-11-25', 10)).toBe(true)
  })

  it('limite exacte : valide le jour anniversaire, périmé le lendemain', () => {
    // ERP : 6 mois pile avant NOW
    expect(isExpired('2026-05-25T12:00:00Z', 0.5)).toBe(false)
    expect(isExpired('2026-05-25T11:59:59Z', 0.5)).toBe(true)
  })

  it('débordement de fin de mois : 31 août + 6 mois = 28 février', () => {
    vi.setSystemTime(new Date('2027-02-28T12:00:00Z'))
    expect(isExpired('2026-08-31T12:00:00Z', 0.5)).toBe(false)
    vi.setSystemTime(new Date('2027-03-01T12:00:00Z'))
    expect(isExpired('2026-08-31T12:00:00Z', 0.5)).toBe(true)
  })

  it('29 février + 1 an = 28 février de l\'année suivante', () => {
    vi.setSystemTime(new Date('2025-02-28T12:00:00Z'))
    expect(isExpired('2024-02-29T12:00:00Z', 1)).toBe(false)
    vi.setSystemTime(new Date('2025-03-01T12:00:00Z'))
    expect(isExpired('2024-02-29T12:00:00Z', 1)).toBe(true)
  })

  it('date absente, inconnue ou invalide : jamais périmé', () => {
    expect(isExpired('', 0.5)).toBe(false)
    expect(isExpired('inconnu', 0.5)).toBe(false)
    expect(isExpired('pas une date', 0.5)).toBe(false)
  })
})

describe('evaluateDocument (ERP)', () => {
  it('la validité ERP de rules.json est inchangée (0,5 an)', () => {
    const erp = rulesConfig.rules.find((r) => r.documentTypes.includes('ERP_ESRIS'))
    expect(erp?.validityYears).toBe(0.5)
  })

  it('un ERP récent n\'est pas refusé pour péremption', () => {
    const res = evaluateDocument(
      {
        document_type: 'ERP',
        date_etablissement: '2026-08-25',
        signature_detectee: 'oui',
        lisibilite: 'lisible',
        adresse_bien: 'inconnu',
      } as never,
      '1 rue de Paris'
    )
    expect(res.appliedRules.some((r) => r.endsWith('_expired'))).toBe(false)
  })
})
