import Link from 'next/link'
import { cn } from '@/lib/utils'

/**
 * Logotype DiagCheck : un document avec coin replié et une coche.
 * SVG inline, hérite de currentColor : la couleur vient toujours des tokens.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M8 3.5h11l6.5 6.5v17a1.5 1.5 0 0 1-1.5 1.5H8a1.5 1.5 0 0 1-1.5-1.5V5A1.5 1.5 0 0 1 8 3.5Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M19 3.5V10h6.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="m11.5 19 3.2 3.2 6-7"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

interface BrandProps {
  className?: string
  markClassName?: string
  wordClassName?: string
  href?: string
}

/**
 * Marque complète : logotype dans un carré accent + wordmark en serif.
 */
export function Brand({ className, markClassName, wordClassName, href }: BrandProps) {
  const content = (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <span
        className={cn(
          'flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground',
          markClassName
        )}
      >
        <LogoMark className="h-5 w-5" />
      </span>
      <span
        className={cn('font-serif text-xl font-semibold tracking-tight', wordClassName)}
      >
        DiagCheck
      </span>
    </span>
  )

  if (href) {
    return (
      <Link href={href} className="inline-flex items-center">
        {content}
      </Link>
    )
  }
  return content
}

export const BRAND_TAGLINE =
  'La pré-vérification des dossiers de diagnostics immobiliers'

export const BRAND_DISCLAIMER =
  'Outil d\'aide à la vérification documentaire. Ne certifie pas juridiquement la conformité.'
