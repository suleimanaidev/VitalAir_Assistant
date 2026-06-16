# VitalAir Assistant

Lahore smog safety — AQI, health profile, 4 AI agents, live routes.

```
vitalAir/
├── .env              ← ONLY file for secrets (frontend + backend)
├── frontend/         ← Next.js (port 3000)
└── backend/          ← FastAPI (port 8000)
```

## Quick start

```powershell
copy .env.example .env
# Edit .env — at minimum MONGODB_URI, NEXTAUTH_SECRET

npm run install:all
npm run dev:backend    # terminal 1 → http://localhost:8000
npm run dev:frontend   # terminal 2 → http://localhost:3000
```

## User flow

1. **Register / login** at `/login`
2. **Health profile** — first login redirects to `/onboarding` (name, age, conditions, commute)
3. **Dashboard** — enter **From → To**, click **Analyze route**
4. Four agents run → AQI, health advice (RAG), diet, suggested route
5. **View live route on map** → `/route` (OpenStreetMap roads via OSRM, no API key needed)

## Optional: RAG + live AI agents

```powershell
npm run install:rag          # ChromaDB + ingest docs from backend/rag/docs/
```

In `.env`:

- `USE_MOCK_AGENTS=false` + `GEMINI_API_KEY=` → real CrewAI agents with RAG tools
- `GOOGLE_MAPS_API_KEY=` → Google Directions (otherwise OSRM is used automatically)

## RAG documents (backend only)

- `backend/rag/docs/health/` — WHO guidelines, asthma Lahore, etc.
- `backend/rag/docs/diet/` — anti-pollution nutrition

Used by agents; not shown as files in the UI (advice appears on dashboard cards).

## Patient Document RAG (Innovation 2)

Upload prescriptions / lab reports on **Profile** → indexed into per-user ChromaDB → health agent reads them at analyze time.

```powershell
# Optional: scanned PDF + image OCR (Tesseract must be installed on OS)
cd backend && .venv\Scripts\pip install -r requirements-documents.txt
```

Supported uploads: **PDF, Word (.doc/.docx), JPG, PNG**, plus `.txt` / `.md`.

Pipeline: upload → `document_parser` (Word → pypdf → pdfplumber → PyMuPDF → **Tesseract OCR**) → MongoDB → Chroma `patient_health_docs` → personalized health advice.

## Lahore Seasonal Intelligence (Innovation 3)

Four Pakistan-specific seasons drive all agent behaviour: Winter Smog, Spring Dust, Summer Heatwave, Monsoon.
See `backend/services/seasonal_intelligence.py` — health, nutrition, and route agents adapt automatically.

## Exposure History & Trends (Innovation 7)

`/history` — 30-day PES line chart, AQI category bars, route choice pie chart, advisory compliance bar.
Data saved on each analyze via `save_query` → `GET /api/history/trends`.

## API

- Health: http://localhost:8000/api/health
- Docs: http://localhost:8000/docs

## Important

- Single root `.env` only — no `frontend/.env.local` or `backend/.env`
- Restart both servers after editing `.env`
