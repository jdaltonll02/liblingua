# Liberian Language Dataset Platform

A full-stack crowdsourcing platform for building open NLP translation datasets in eight Liberian low-resource languages: **Kpelle, Bassa, Grebo, Vai, Mende, Loma, Krahn, and Dan (Gio)**.

---

## Architecture

```
liberian-dataset-platform/
├── backend/          Node.js + Express + Prisma (PostgreSQL)
├── frontend/         React + Vite + TailwindCSS
├── scripts/          seed.js  •  export.js
└── uploads/audio/    Audio files (WAV/MP3/WebM)
```

---

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | ≥ 18 |
| PostgreSQL | ≥ 14 |
| npm | ≥ 9 |

---

## Setup

### 1. Clone & install dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Configure environment

```bash
cd backend
cp .env.example .env
# Edit .env — set DATABASE_URL and JWT_SECRET
```

Minimum required variables:

```
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/liberian_dataset"
JWT_SECRET="a-long-random-secret"
```

### 3. Run database migrations

```bash
cd backend
npx prisma migrate dev --name init
npx prisma generate
```

### 4. Seed the database

```bash
# From project root
node scripts/seed.js
```

This creates:
- 50 English samples across 6 domains and 3 difficulty levels
- 1 admin account (`admin@example.com` / `changeme123` — change immediately)
- Gold standard reference translations for spot-checking

### 5. Start the servers

```bash
# Terminal 1 — Backend (port 4000)
cd backend
npm run dev

# Terminal 2 — Frontend (port 5173)
cd frontend
npm run dev
```

Open `http://localhost:5173`.

---

## API Reference

All endpoints are prefixed with `/api`. Authenticated routes require:

```
Authorization: Bearer <jwt_token>
```

### Auth

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/register` | — | Register a new contributor |
| POST | `/auth/login` | — | Login, returns JWT |
| GET | `/auth/me` | ✓ | Get current user profile |

**Register body:**
```json
{
  "name": "Jallah Kamara",
  "email": "jallah@example.com",
  "password": "securepass",
  "native_language": "Kpelle",
  "native_dialect": "Central Kpelle",
  "region_of_origin": "Bong County",
  "age_group": "18_35",
  "is_l1_speaker": true
}
```

### Samples

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/samples/random?language=kpelle` | ✓ | Fetch a domain-weighted random unlocked sample |
| GET | `/samples/progress?language=kpelle` | ✓ | Get remaining sample count for a language |
| GET | `/samples/:id` | ✓ | Get a sample by ID |
| POST | `/samples` | Admin | Add a single English sample |
| POST | `/samples/bulk` | Admin | Bulk import samples from JSON |

**Bulk import body:**
```json
{
  "samples": [
    { "text": "...", "domain": "health", "difficulty": "easy" },
    { "text": "...", "domain": "legal", "difficulty": "medium", "is_gold_standard": false }
  ]
}
```

Valid `domain` values: `general` `health` `legal` `education` `news` `conversational`  
Valid `difficulty` values: `easy` `medium` `hard`

### Translations

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/translations` | ✓ | Submit a translation (multipart/form-data) |
| GET | `/translations?sample_id=xxx&language=kpelle` | ✓ | List translations |
| GET | `/translations/mine` | ✓ | Current contributor's translation history |
| PATCH | `/translations/:id/validate` | Admin | Set validated status + quality score |

**Submit translation (multipart/form-data):**
```
sample_id       UUID
target_language kpelle | bassa | grebo | vai | mende | loma | krahn | dan
translated_text (required)
dialect         (optional string)
audio           (optional WAV/MP3/WebM file, max 50 MB)
```

**Validate body:**
```json
{ "is_validated": true, "quality_score": 0.87 }
```

### Export

All export endpoints accept `?language=<lang>` and `?validated_only=true`.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/export/csv` | ✓ | CSV download |
| GET | `/export/json` | ✓ | JSON array download |
| GET | `/export/huggingface` | ✓ | JSONL (HuggingFace-compatible) download |

### Stats

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/stats` | — | Platform-wide stats |

**Stats response:**
```json
{
  "total_samples": 50,
  "total_contributors": 12,
  "total_translations": 342,
  "average_quality_score": 0.74,
  "per_language": {
    "kpelle": { "total": 87, "validated": 45, "locked_samples": 29 }
  },
  "domain_breakdown": [
    { "domain": "health", "sample_count": 10 }
  ]
}
```

---

## Dataset Formats

### HuggingFace JSONL (one object per line)

```json
{
  "id": "uuid",
  "source_lang": "en",
  "target_lang": "kpelle",
  "dialect": "central_kpelle",
  "source_text": "Wash your hands with soap and water.",
  "target_text": "Kpuu ye la wuu gbi ee...",
  "domain": "health",
  "difficulty": "easy",
  "contributor_region": "Bong County",
  "contributor_age_group": "18_35",
  "is_l1_speaker": true,
  "is_validated": true,
  "quality_score": 0.87,
  "audio_source_path": null,
  "audio_target_path": "uploads/audio/kpelle/sample-id/contributor-id/recording.webm"
}
```

### Loading with HuggingFace `datasets`

```python
from datasets import load_dataset

dataset = load_dataset(
    "json",
    data_files={"train": "kpelle_liberian_translations.jsonl"},
    split="train"
)
```

---

## CLI Export Tool

```bash
# Export all Kpelle translations as CSV
node scripts/export.js --format csv --language kpelle --output kpelle.csv

# Export validated Bassa translations as HuggingFace JSONL
node scripts/export.js --format huggingface --language bassa --validated-only

# Export everything as JSON
node scripts/export.js --format json
```

---

## Business Logic Notes

| Rule | Implementation |
|------|---------------|
| Per-language locking | A sample is excluded from `GET /samples/random?language=X` once it has ≥ 3 translations in language X. Different languages are fully independent. |
| Duplicate prevention | `UNIQUE(sample_id, contributor_id, target_language)` enforced at DB level; API returns 409 on duplicate submission. |
| Reputation scoring | +0.1 when a translation is validated with quality ≥ 0.4; −0.05 if quality < 0.4. Capped at 5.0. |
| Gold standard checks | 5% of served samples are gold standard. Similarity (3-gram Jaccard) vs. the reference translation is computed silently and stored in `translations.gold_sim_score`. Never shown to contributors. |
| Domain-stratified sampling | Domains with fewer translations for the requested language are served more often via inverse-frequency weighting. |

---

## Database Schema (summary)

```
english_samples  ──< translations >── contributors
                 ──< gold_standard
```

See [backend/prisma/schema.prisma](backend/prisma/schema.prisma) for the full schema.

---

## Audio Storage

Audio files are stored at:

```
uploads/audio/<language>/<sample_id>/<contributor_id>/recording.<ext>
```

The backend serves them at `/uploads/…` via Express static middleware.

To switch to S3-compatible storage, update `backend/src/middleware/upload.js` to use `multer-s3` with the S3 credentials in `.env`.

---

## Documentation

Essential guides for development and production:

| Guide | Purpose |
|-------|---------|
| [**TESTING.md**](TESTING.md) | Unit tests, E2E tests, running test suite |
| [**API.md**](API.md) | Complete API reference with examples |
| [**DEPLOYMENT.md**](DEPLOYMENT.md) | Docker setup, production deployment |
| [**DATABASE_OPTIMIZATION.md**](DATABASE_OPTIMIZATION.md) | Query optimization, indexes, performance |
| [**BACKUP_STRATEGY.md**](BACKUP_STRATEGY.md) | Backup procedures, disaster recovery |
| [**MONITORING.md**](MONITORING.md) | Logging, error tracking (Sentry), metrics |

---

1. Fork the repository
2. Create a feature branch
3. Submit a pull request with a clear description

All contributions should respect the [Responsible NLP Data Collection Guidelines](https://aclanthology.org/2021.acl-long.98/).
