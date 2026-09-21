# Cookbook

A personal home cookbook application for managing recipes, planning weekly meals, and generating AI-powered shopping lists.

## Features

- **Recipe management** — create, edit, and browse recipes stored as plain Markdown files (portable and readable outside the app)
- **Meal planning** — assign recipes to day + meal-type slots in a weekly plan
- **AI shopping list** — consolidates and deduplicates ingredients from a meal plan into a grouped shopping list via the Anthropic API

## Tech stack

| Layer | Technology |
|---|---|
| Backend | Java 21, Spring Boot 3.3, Spring Data JPA, PostgreSQL |
| Frontend | React 18, TypeScript, Vite 5, React Router v6 |
| AI | Anthropic API (optional — falls back to stub response) |
| Build | Maven 3.9+ (backend), Node 18+ / npm (frontend) |

## Prerequisites

- **JDK 21** — `java -version` should report `21.x`
- **Maven 3.9+** — `mvn -version`
- **Node.js 18+** and **npm** — `node -v` and `npm -v`
- **PostgreSQL 15+** (optional) — the backend falls back to a local H2 file if PostgreSQL is not available
- **Anthropic API key** (optional) — only required for real AI shopping list generation

## Environment setup

### Backend database

The backend automatically selects its database at startup:

| Condition | Database used |
|---|---|
| `POSTGRES_URL` not set | H2 file-based — `cookbookdb.mv.db` in the project root (data persists across restarts) |
| `POSTGRES_URL` set and reachable | PostgreSQL |
| `POSTGRES_URL` set but unreachable | Falls back to H2 file-based with a warning |

**Option A — no setup (H2 fallback)**

Start the backend with no extra configuration. Data is stored in `cookbookdb.mv.db` in the project root and survives restarts.

**Option B — PostgreSQL**

1. Create the database (run once):

```bash
psql -U postgres -f database/init.sql
```

2. Set environment variables before starting the backend:

**Linux / macOS** — add to `~/.bashrc` or `~/.zshrc`:

```bash
export POSTGRES_URL=jdbc:postgresql://localhost:5432/cookbook
export POSTGRES_USER=postgres          # default if omitted
export POSTGRES_PASSWORD=your_password
```

**Windows** — run once in PowerShell (persists across sessions and reboots):

```powershell
[System.Environment]::SetEnvironmentVariable("POSTGRES_URL", "jdbc:postgresql://localhost:5432/cookbook", "User")
[System.Environment]::SetEnvironmentVariable("POSTGRES_USER", "postgres", "User")
[System.Environment]::SetEnvironmentVariable("POSTGRES_PASSWORD", "your_password", "User")
```

After running these commands, open a new terminal before starting the backend — existing sessions do not pick up the new values.

Hibernate creates all tables automatically on first startup — no additional SQL is needed.

### AI shopping list (optional)

Set the `ANTHROPIC_API_KEY` environment variable to enable real LLM-based ingredient consolidation.
Without it, the service returns a hardcoded demo response — everything else works normally.

**Linux / macOS** — add to `~/.bashrc` or `~/.zshrc`:

```bash
export ANTHROPIC_API_KEY=sk-ant-...
```

**Windows** — run once in PowerShell:

```powershell
[System.Environment]::SetEnvironmentVariable("ANTHROPIC_API_KEY", "sk-ant-...", "User")
```

## Running locally

### 1. Backend

```bash
cd backend
mvn spring-boot:run
```

- REST API: http://localhost:8080/api
- H2 console (H2 mode only): http://localhost:8080/h2-console — JDBC URL: `jdbc:h2:file:../cookbookdb`

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

- UI: http://localhost:5173
- Vite automatically proxies `/api/*` requests to the backend at port 8080

Both services need to be running at the same time for the full application to work.

## Running tests

```bash
# Backend
cd backend
mvn verify

# Frontend (type-check + build)
cd frontend
npm run build
```

## Project structure

See [`specifications/architecture.md`](specifications/architecture.md).

## Recipe format

Recipes are plain `.md` files in the `recipes/` directory. Example:

```markdown
# Spaghetti Bolognese

**Serves:** 4
**Time:** 45 min
**Tags:** pasta, italian, beef

## Ingredients

- 400g spaghetti
- 500g minced beef

## Instructions

1. Bring a large pot of salted water to the boil.
2. ...
```

See [`specifications/recipe-format.md`](specifications/recipe-format.md) for the full format spec.
