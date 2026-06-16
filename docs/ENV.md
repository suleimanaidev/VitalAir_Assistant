# One `.env` file

Both apps read **`vitalAir/.env`** at the project root.

| App | How it loads |
|-----|----------------|
| Frontend | `frontend/next.config.mjs` → `loadEnvConfig('..')` |
| Backend | `backend/main.py` → `load_dotenv('../.env')` + `config.py` |

## Do not use

- `frontend/.env.local` — removed; delete if present
- `backend/.env` — removed; delete if present

## Variables

See root `.env.example` for the full list.

`VITALAIR_JWT_SECRET` is used for both NextAuth (`NEXTAUTH_SECRET`) and FastAPI JWT.
