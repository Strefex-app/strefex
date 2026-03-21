# Repository layout notes

## `STREFEX/` nested folder

The directory `STREFEX/src/pages/` contains **legacy or alternate copies** of some page components (e.g. `HeadcountManagement.jsx`, `HRDocumentation.jsx`, `EmployeeGoals.jsx`).

- **They are not imported** by the Vite app entry (`src/main.jsx` → `src/App.jsx`).
- The **canonical source** for the running application is always under **`src/`** at the repo root.
- Before deleting `STREFEX/`, diff against `src/pages/` and merge any unique changes you still need.

## App source of truth

| Area        | Path        |
|------------|-------------|
| React app  | `src/`      |
| API routes | `api/`      |
| Database   | `supabase/migrations/` |
