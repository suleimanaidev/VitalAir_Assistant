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
# Edit .env — see docs/ENV.md for full user checklist

npm run install:all
npm run ingest:rag          # required once — builds RAG index for agents
npm run dev:backend         # terminal 1 → http://localhost:8000
npm run dev:frontend        # terminal 2 → http://localhost:3000
```

**Every new user must:** install deps (`install:all`), configure `.env` (MongoDB, WAQI, secrets), run `ingest:rag`, and set `OPENAI_API_KEY` if `USE_MOCK_AGENTS=false`. Details: **[docs/ENV.md](docs/ENV.md)**.

Backend deps (single file):

```powershell
cd backend
python -m venv .venv
.venv\Scripts\pip install -r requirements.txt
```

## User flow

1. **Register / login** at `/login`
2. **Health profile** — first login redirects to `/onboarding` (name, age, conditions, commute)
3. **Dashboard** — pick your **area** → run agents one-by-one (health → nutrition → route if traveling)
4. Agents use **WHO RAG** + your health profile + uploaded documents
5. **View live route on map** → `/route` (OpenStreetMap + OSRM — free, no API key)
6. **Navigate** → Dashboard route card or `/route` map overlay opens **Google Maps** or **OpenStreetMap** (free deep links)

## Optional: RAG index + live AI agents

```powershell
npm run ingest:rag          # ingest docs from backend/rag/docs/ into FAISS
```

In `.env`:

- `USE_MOCK_AGENTS=false` + `GEMINI_API_KEY=` → real CrewAI agents with RAG tools
- `GOOGLE_MAPS_API_KEY=` → optional paid Google Directions (leave empty for free OSRM routes)

## RAG documents (backend only)

- `backend/rag/docs/health/` — WHO guidelines, asthma Lahore, etc.
- `backend/rag/docs/diet/` — anti-pollution nutrition

Used by agents; not shown as files in the UI (advice appears on dashboard cards).

## Patient Document RAG (Innovation 2)

Upload prescriptions / lab reports on **Profile** → indexed into per-user FAISS store → health agent reads them at analyze time.

Supported uploads: **PDF, Word (.doc/.docx), JPG, PNG**, plus `.txt` / `.md`.

Pipeline: upload → `document_parser` (Word → pypdf → pdfplumber → PyMuPDF → **Tesseract OCR**) → MongoDB → FAISS patient index → personalized health advice.

> **Note:** For scanned PDF/image OCR, install [Tesseract](https://github.com/UB-Mannheim/tesseract/wiki) on your OS.

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
