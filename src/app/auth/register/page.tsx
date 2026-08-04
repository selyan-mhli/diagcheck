'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { LogoMark, BRAND_TAGLINE, BRAND_DISCLAIMER } from '@/components/brand'

export default function RegisterPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Erreur lors de la création du compte')
        return
      }

      router.push('/auth/login?registered=true')
    } catch {
      setError('Une erreur est survenue')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="h-1 w-full bg-primary" aria-hidden="true" />

      <main className="flex flex-1 items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Marque */}
          <div className="mb-8 text-center">
            <div className="mb-4 flex justify-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <LogoMark className="h-8 w-8" />
              </span>
            </div>
            <h1 className="font-serif text-3xl font-semibold tracking-tight">
              DiagCheck
            </h1>
            <p className="mx-auto mt-2 max-w-xs text-sm text-muted-foreground">
              {BRAND_TAGLINE}
            </p>
          </div>

          <Card className="border-border shadow-sm">
            <CardContent className="p-6 sm:p-8">
              <h2 className="mb-6 font-serif text-lg font-semibold">
                Inscrire votre agence
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div
                    role="alert"
                    className="rounded-md border border-verdict-rouge-border bg-verdict-rouge-bg p-3 text-sm text-verdict-rouge"
                  >
                    {error}
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="name">Nom de l&apos;agence</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Mon Agence Immobilière"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="organization"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="agence@exemple.fr"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Mot de passe</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    minLength={8}
                    required
                  />
                  <p className="text-xs text-muted-foreground">Minimum 8 caractères</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Création...' : 'Créer mon compte'}
                </Button>
              </form>
              <p className="mt-6 text-center text-sm text-muted-foreground">
                Déjà un compte ?{' '}
                <Link
                  href="/auth/login"
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  Se connecter
                </Link>
              </p>
            </CardContent>
          </Card>

          <p className="mt-8 text-center text-xs text-muted-foreground">
            {BRAND_DISCLAIMER}
          </p>
        </div>
      </main>
    </div>
  )
}
