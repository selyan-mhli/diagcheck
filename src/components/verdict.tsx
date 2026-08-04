import type { LucideIcon } from 'lucide-react'
import { CheckCircle2, AlertTriangle, XCircle, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

export type VerdictTone = 'vert' | 'orange' | 'rouge' | 'attente'

interface VerdictConfig {
  tone: VerdictTone
  label: string
  Icon: LucideIcon
  /** Texte foncé sur fond teinté (badges, bandeaux) */
  text: string
  bg: string
  border: string
}

const CONFIGS: Record<VerdictTone, Omit<VerdictConfig, 'label'>> = {
  vert: {
    tone: 'vert',
    Icon: CheckCircle2,
    text: 'text-verdict-vert',
    bg: 'bg-verdict-vert-bg',
    border: 'border-verdict-vert-border',
  },
  orange: {
    tone: 'orange',
    Icon: AlertTriangle,
    text: 'text-verdict-orange',
    bg: 'bg-verdict-orange-bg',
    border: 'border-verdict-orange-border',
  },
  rouge: {
    tone: 'rouge',
    Icon: XCircle,
    text: 'text-verdict-rouge',
    bg: 'bg-verdict-rouge-bg',
    border: 'border-verdict-rouge-border',
  },
  attente: {
    tone: 'attente',
    Icon: Clock,
    text: 'text-verdict-attente',
    bg: 'bg-verdict-attente-bg',
    border: 'border-verdict-attente-border',
  },
}

function toneOf(status: string): VerdictTone {
  switch (status) {
    case 'VERT':
    case 'VALIDE':
      return 'vert'
    case 'ORANGE':
    case 'INCERTAIN':
      return 'orange'
    case 'ROUGE':
    case 'REFUSE':
      return 'rouge'
    default:
      return 'attente'
  }
}

function labelOf(status: string): string {
  switch (status) {
    case 'VERT':
      return 'Prêt à signer'
    case 'ORANGE':
      return 'À vérifier'
    case 'ROUGE':
      return 'Non conforme'
    case 'VALIDE':
      return 'Valide'
    case 'INCERTAIN':
      return 'Incertain'
    case 'REFUSE':
      return 'Refusé'
    default:
      return 'En attente'
  }
}

export function getVerdict(status: string): VerdictConfig {
  return { ...CONFIGS[toneOf(status)], label: labelOf(status) }
}

/** Pastille de couleur pleine (le point coloré, sans texte). */
export function VerdictDot({
  status,
  className,
}: {
  status: string
  className?: string
}) {
  const tone = toneOf(status)
  const dotBg: Record<VerdictTone, string> = {
    vert: 'bg-verdict-vert',
    orange: 'bg-verdict-orange',
    rouge: 'bg-verdict-rouge',
    attente: 'bg-verdict-attente',
  }
  return (
    <span
      aria-hidden="true"
      className={cn('inline-block h-3 w-3 shrink-0 rounded-full', dotBg[tone], className)}
    />
  )
}

/** Badge verdict : pastille + libellé sur fond teinté, contraste AA. */
export function VerdictBadge({
  status,
  className,
  size = 'md',
}: {
  status: string
  className?: string
  size?: 'md' | 'lg'
}) {
  const v = getVerdict(status)
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-full border font-medium',
        v.text,
        v.bg,
        v.border,
        size === 'lg' ? 'px-4 py-1.5 text-sm' : 'px-3 py-1 text-xs',
        className
      )}
    >
      <VerdictDot status={status} className={size === 'lg' ? 'h-2.5 w-2.5' : 'h-2 w-2'} />
      {v.label}
    </span>
  )
}

/** Libellés français des types de documents détectés par le moteur de règles. */
export function documentTypeLabel(type: string | null): string {
  switch (type) {
    case 'DPE':
      return 'DPE'
    case 'AMIANTE':
      return 'Amiante'
    case 'PLOMB':
      return 'Plomb (CREP)'
    case 'ELECTRICITE':
      return 'Électricité'
    case 'GAZ':
      return 'Gaz'
    case 'ERP_ESRIS':
      return 'ERP (état des risques)'
    case 'LOI_CARREZ_BOUTIN':
      return 'Loi Carrez / Boutin'
    case 'AUTRE':
      return 'Autre document'
    default:
      return 'Type non détecté'
  }
}

/** Parse défensif de problemesDetectes (string JSON en base, tableau côté client). */
export function parseProblems(value: string[] | string | null | undefined): string[] {
  if (!value) return []
  if (Array.isArray(value)) return value
  try {
    const parsed: unknown = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.filter((p): p is string => typeof p === 'string') : []
  } catch {
    return []
  }
}
