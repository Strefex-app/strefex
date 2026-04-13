# Repository layout notes

## App source of truth

| Area        | Path        |
|------------|-------------|
| React app  | `src/`      |
| API routes | `api/`      |
| Database   | `supabase/migrations/` |

Removed product areas that only used **browser `localStorage`** (no Supabase tables) are purged once via `src/utils/clearDeprecatedLocalStorageOnce.js` from `main.jsx`.
