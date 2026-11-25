import { defineConfig } from 'vitest/config'
import path from 'path'

// Fuseau fixe : le calcul de mois utilise l'heure locale (changements d'heure).
process.env.TZ = 'UTC'

export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
