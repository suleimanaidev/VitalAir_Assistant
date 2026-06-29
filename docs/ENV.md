# Environment setup — what the user must install & configure

VitalAir uses **one file only**: `vitalAir/.env` at the project root.  
Both frontend and backend read it. **Do not** create `frontend/.env.local` or `backend/.env`.

---

## One-time install (every user)

Run these from the project root (`vitalAir/`):

| Step | Command | What it installs |
|------|---------|------------------|
| 1 | `copy .env.example .env` | Creates your config file |
| 2 | Edit `.env` | See **Required keys** below |
| 3 | `npm run install:all` | Node deps + Python venv + `backend/requirements.txt` |
| 4 | `npm run ingest:rag` | Builds FAISS index from `backend/rag/docs/` (needed for agent advice) |

**Optional (scanned PDF / image uploads on Profile):**  
Install [Tesseract OCR](https://github.com/UB-Mannheim/tesseract/wiki) on Windows. Without it, text PDFs still work; scanned images may not OCR.

---

## Start the app

```powershell
npm run dev:backend    # terminal 1 → http://localhost:8000
npm run dev:frontend   # terminal 2 → http://localhost:3000
```

After **any** `.env` change → restart **both** terminals.

---

## `.env` variables — what you must do

### Required (app will not work properly without these)

| Variable | User action |
|----------|-------------|
| `MONGODB_URI` | Create free [MongoDB Atlas](https://cloud.mongodb.com) cluster → Database user → **Network Access** add your IP → copy connection string |
| `WAQI_API_KEY` | Free token from [aqicn.org data platform](https://aqicn.org/data-platform/token/) |
| `VITALAIR_JWT_SECRET` | Any long random string (16+ chars). Example: `openssl rand -hex 32` |
| `NEXTAUTH_SECRET` | **Same value** as `VITALAIR_JWT_SECRET` |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` (default) |
| `BACKEND_URL` | `http://localhost:8000` (default) |
| `NEXTAUTH_URL` | `http://localhost:3000` (must match browser URL) |
| `CORS_ORIGINS` | Include your frontend URL, e.g. `http://localhost:3000` |

### RAG knowledge base (required for meaningful agent output)

| Step | User action |
|------|-------------|
| Docs already in repo | `backend/rag/docs/health/`, `backend/rag/docs/diet/` |
| Build index | Run `npm run ingest:rag` once (and again if you add new `.txt` files) |
| `FAISS_INDEX_DIR` | Leave as `./faiss_indexes` unless you change storage path |

### AI agents

| Variable | User action |
|----------|-------------|
| `USE_MOCK_AGENTS=false` | Real agents — **requires** an API key below |
| `USE_MOCK_AGENTS=true` | Offline demo mode — no OpenAI/Gemini needed |
| `OPENAI_API_KEY` | [OpenAI API key](https://platform.openai.com/api-keys) — **recommended** when `USE_MOCK_AGENTS=false` |
| `OPENAI_MODEL` | Default `gpt-4o-mini` is fine |
| `GEMINI_API_KEY` | Optional alternative if you use Google Gemini |
| `LLM_PROVIDER` | `auto` (default) picks OpenAI if key is set |

### Optional (app works without these)

| Variable | User action |
|----------|-------------|
| `GOOGLE_MAPS_API_KEY` | Leave **empty** → free OSRM routing (recommended). Only set if you want paid Google Directions |
| `SERPER_API_KEY` | Not required for dashboard, login, or routes |

### Defaults (usually no change)

| Variable | Meaning |
|----------|---------|
| `JWT_ALGORITHM` | `HS256` |
| `JWT_EXPIRE_MINUTES` | `1440` (24 hours) |

---

## Checklist for a new user

- [ ] Node.js 18+ and Python 3.11+ installed  
- [ ] `copy .env.example .env` and fill MongoDB + WAQI + secrets  
- [ ] `npm run install:all`  
- [ ] `npm run ingest:rag`  
- [ ] `USE_MOCK_AGENTS=false` + `OPENAI_API_KEY=sk-...` (for real agents)  
- [ ] MongoDB Atlas IP whitelist includes your machine  
- [ ] Both servers running; login at `/login`  

---

## How apps load this file

| App | Loader |
|-----|--------|
| Frontend | `frontend/next.config.mjs` → root `.env` |
| Backend | `backend/main.py` → `load_dotenv('../.env')` |

`VITALAIR_JWT_SECRET` and `NEXTAUTH_SECRET` must match so login and API auth work together.
