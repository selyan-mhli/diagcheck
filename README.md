# DiagCheck

**Outil gratuit et open source pour agences immobilières françaises** : aide à la vérification documentaire de diagnostics immobiliers.

> ⚠️ **Avertissement** : Cet outil ne certifie jamais juridiquement la conformité. Il s'agit uniquement d'une aide à la vérification documentaire et ne se substitue pas à un audit réglementaire ou juridique.

## 🎯 Objectif

Aider une agence immobilière à pré-analyser un dossier de diagnostics immobiliers afin de déterminer s'il est :
- **VERT** : Prêt à être signé
- **ORANGE** : À vérifier
- **ROUGE** : Non conforme

## 🏗️ Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Frontend  │────▶│   Backend   │────▶│  PostgreSQL │
│   Next.js   │     │  API Routes │     │   Prisma    │
└─────────────┘     └──────┬──────┘     └─────────────┘
                          │
              ┌───────────┼───────────┐
              ▼           ▼           ▼
        ┌─────────┐ ┌─────────┐ ┌─────────┐
        │   LLM   │ │ Moteur  │ │   S3    │
        │ Claude  │ │ Règles  │ │ Storage │
        └─────────┘ └─────────┘ └─────────┘
```

**Séparation stricte des rôles :**
- **LLM (Claude)** : Extraction factuelle uniquement
- **Moteur de règles** : Décision finale (déterministe, configurable)
- **Frontend** : Affichage
- **Backend** : Orchestration et audit

## 🛠️ Stack Technique

| Composant | Technologie |
|-----------|-------------|
| Frontend | Next.js 14 (App Router) |
| Backend | API Routes Next.js |
| Auth | NextAuth (email/password) |
| Base de données | PostgreSQL |
| ORM | Prisma |
| Stockage fichiers | S3-compatible |
| LLM | Claude (Anthropic) |
| PDF | PDFKit |
| UI | TailwindCSS, Radix UI |

## 📦 Installation

### Prérequis

- Node.js 18+
- PostgreSQL
- Compte Anthropic (API Claude)
- Stockage S3-compatible (AWS S3, MinIO, Cloudflare R2...)

### 1. Cloner et installer

```bash
cd DiagCheck
npm install
```

### 2. Configuration

Copier le fichier d'environnement et le configurer :

```bash
cp .env.example .env
```

Éditer `.env` avec vos valeurs :

```env
# Base de données PostgreSQL
DATABASE_URL="postgresql://user:password@localhost:5432/diagcheck"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="votre-secret-genere-avec-openssl-rand-base64-32"

# Anthropic Claude API
ANTHROPIC_API_KEY="sk-ant-api03-..."

# S3-Compatible Storage
S3_ENDPOINT="https://s3.amazonaws.com"
S3_REGION="eu-west-3"
S3_BUCKET="diagcheck-documents"
S3_ACCESS_KEY_ID="votre-access-key"
S3_SECRET_ACCESS_KEY="votre-secret-key"
```

### 3. Initialiser la base de données

```bash
npm run db:generate
npm run db:push
```

### 4. Lancer le serveur de développement

```bash
npm run dev
```

L'application est accessible sur `http://localhost:3000`

## 📁 Structure du Projet

```
src/
├── app/
│   ├── api/
│   │   ├── auth/           # Authentification
│   │   └── dossiers/       # CRUD dossiers + upload + analyse
│   ├── auth/               # Pages login/register
│   └── dashboard/          # Dashboard et détail dossiers
├── components/
│   ├── ui/                 # Composants UI (shadcn)
│   └── ...                 # Composants métier
├── config/
│   └── rules.json          # Configuration des règles
├── lib/
│   ├── auth.ts             # Configuration NextAuth
│   ├── llm.ts              # Intégration Claude
│   ├── pdf-generator.ts    # Génération rapports PDF
│   ├── prisma.ts           # Client Prisma
│   ├── rules-engine.ts     # Moteur de règles
│   └── s3.ts               # Stockage S3
└── types/
    └── next-auth.d.ts      # Types NextAuth
```

## ⚙️ Configuration des Règles

Les règles de validation sont configurables dans `src/config/rules.json` :

```json
{
  "version": "1.0.0",
  "rules": [
    {
      "id": "dpe",
      "name": "Diagnostic de Performance Énergétique",
      "documentTypes": ["DPE"],
      "validityYears": 10,
      "conditions": [
        {
          "type": "illegible",
          "message": "Document DPE illisible",
          "resultStatus": "REFUSE"
        }
      ]
    }
  ]
}
```

### Durées de validité par défaut

| Diagnostic | Validité |
|------------|----------|
| DPE | 10 ans |
| Amiante | Illimitée (si absence) |
| Plomb (CREP) | 1 an (vente) |
| Gaz | 3 ans |
| Électricité | 3 ans |
| ERP/ESRIS | 6 mois |
| Carrez/Boutin | Illimitée |

## 🔄 Pipeline d'Analyse

1. **Upload** : PDF ou ZIP → Extraction → Stockage S3
2. **Extraction LLM** : Claude extrait les données factuelles (type, dates, signature, lisibilité...)
3. **Moteur de règles** : Application des règles configurées
4. **Statut** : Calcul du statut document et global

### Format JSON d'extraction LLM

```json
{
  "document_type": "DPE",
  "date_etablissement": "2023-01-15",
  "date_expiration": "2033-01-15",
  "adresse_bien": "12 rue de la Paix, 75002 Paris",
  "lot_surface": "65 m²",
  "diagnostiqueur_nom": "Jean Dupont",
  "diagnostiqueur_societe": "Diag Expert SARL",
  "signature_detectee": "oui",
  "lisibilite": "lisible",
  "commentaires": ""
}
```

## 📊 API Endpoints

### Authentification

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/api/auth/register` | Créer un compte |
| POST | `/api/auth/[...nextauth]` | Login NextAuth |

### Dossiers

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/dossiers` | Liste des dossiers |
| POST | `/api/dossiers` | Créer un dossier |
| GET | `/api/dossiers/[id]` | Détail d'un dossier |
| DELETE | `/api/dossiers/[id]` | Supprimer un dossier |
| POST | `/api/dossiers/[id]/upload` | Upload documents |
| POST | `/api/dossiers/[id]/analyze` | Lancer l'analyse |
| GET | `/api/dossiers/[id]/report` | Télécharger le rapport PDF |

### Exemple de réponse API (GET /api/dossiers)

```json
[
  {
    "id": "clx123...",
    "nomBien": "Appartement T3 Centre-ville",
    "adresse": "12 rue de la Paix, 75002 Paris",
    "dateCreation": "2024-01-15T10:30:00.000Z",
    "statutGlobal": "VERT",
    "documents": [
      {
        "id": "doc123...",
        "nomFichier": "DPE_2024.pdf",
        "typeDocument": "DPE",
        "statutDocument": "VALIDE",
        "problemesDetectes": [],
        "dateVerification": "2024-01-15T10:35:00.000Z"
      }
    ],
    "_count": { "documents": 5 }
  }
]
```

## 🗄️ Schéma de Base de Données

```prisma
model Agency {
  id           String    @id @default(cuid())
  email        String    @unique
  passwordHash String
  name         String
  dossiers     Dossier[]
}

model Dossier {
  id            String         @id @default(cuid())
  nomBien       String
  adresse       String
  statutGlobal  StatutGlobal   @default(EN_ATTENTE)
  agencyId      String
  documents     Document[]
  analyseLogs   AnalyseLog[]
}

model Document {
  id                String           @id @default(cuid())
  dossierId         String
  nomFichier        String
  s3Key             String
  fileHash          String
  typeDocument      TypeDocument?
  statutDocument    StatutDocument   @default(EN_ATTENTE)
  extractionLlm     Json?
  resultatRegles    Json?
  problemesDetectes String[]
}

model AnalyseLog {
  id        String   @id @default(cuid())
  dossierId String
  action    String
  details   Json
}
```

## 🚀 Déploiement

### Variables d'environnement requises

```
DATABASE_URL
NEXTAUTH_URL
NEXTAUTH_SECRET
ANTHROPIC_API_KEY
S3_ENDPOINT
S3_REGION
S3_BUCKET
S3_ACCESS_KEY_ID
S3_SECRET_ACCESS_KEY
```

### Build de production

```bash
npm run build
npm start
```

### Plateformes recommandées

- **Vercel** : Déploiement Next.js natif
- **Railway** : PostgreSQL + Next.js
- **Render** : Full-stack

## 🔒 Sécurité

- Mots de passe hashés avec bcrypt (12 rounds)
- Sessions JWT sécurisées
- Clés API isolées dans `.env`
- Hash SHA-256 des fichiers pour traçabilité
- Logs d'audit non modifiables

## ⚠️ Mentions Légales

Ce logiciel est un **outil d'aide à la vérification documentaire**. Il :
- Ne certifie **jamais** juridiquement la conformité
- Ne se substitue **pas** à un audit réglementaire ou juridique
- Fournit une aide à la décision, pas une décision finale

Toute décision est :
- **Explicable** : règles appliquées visibles
- **Traçable** : logs d'analyse conservés
- **Déterministe** : moteur de règles sans IA

## 📄 Licence

Gratuit et open source, sous licence MIT — voir [LICENSE](LICENSE).
Contributions bienvenues : ouvrez une issue ou une pull request.

---

Développé avec ❤️ pour les agences immobilières françaises
