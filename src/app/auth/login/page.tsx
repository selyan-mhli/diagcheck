'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { LogoMark, BRAND_TAGLINE, BRAND_DISCLAIMER } from '@/components/brand'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError(result.error)
      } else {
        router.push('/dashboard')
        router.refresh()
      }
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
                Connexion à votre compte agence
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
                    autoComplete="current-password"
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Connexion...' : 'Se connecter'}
                </Button>
              </form>
              <p className="mt-6 text-center text-sm text-muted-foreground">
                Pas encore de compte ?{' '}
                <Link
                  href="/auth/register"
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  Inscrire mon agence
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
