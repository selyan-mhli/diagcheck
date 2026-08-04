'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface NewDossierDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function NewDossierDialog({ open, onOpenChange, onSuccess }: NewDossierDialogProps) {
  const [nomBien, setNomBien] = useState('')
  const [adresse, setAdresse] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/dossiers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nomBien, adresse }),
      })

      if (!response.ok) {
        const data = await response.json()
        setError(data.error || 'Erreur lors de la création')
        return
      }

      setNomBien('')
      setAdresse('')
      onSuccess()
    } catch {
      setError('Une erreur est survenue')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Nouveau dossier</DialogTitle>
          <DialogDescription>
            Créez un nouveau dossier pour un bien immobilier
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
                {error}
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="nomBien">Nom du bien</Label>
              <Input
                id="nomBien"
                placeholder="Appartement T3 Centre-ville"
                value={nomBien}
                onChange={(e) => setNomBien(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="adresse">Adresse complète</Label>
              <Input
                id="adresse"
                placeholder="12 rue de la Paix, 75002 Paris"
                value={adresse}
                onChange={(e) => setAdresse(e.target.value)}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Création...' : 'Créer le dossier'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
