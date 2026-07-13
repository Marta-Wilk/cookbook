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
- **PostgreSQL 15+** running locally (or skip it — the backend defaults to H2 in-memory for development)
- **Anthropic API key** (optional) — only required for real AI shopping list generation

## Environment setup

### Backend database

By default, the backend uses an **H2 in-memory database** — no setup required for local development.

To use PostgreSQL instead, set these environment variables before starting the backend:

```
SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/cookbook
SPRING_DATASOURCE_USERNAME=<your-pg-user>
SPRING_DATASOURCE_PASSWORD=<your-pg-password>
```

### AI shopping list (optional)

Set the `ANTHROPIC_API_KEY` environment variable to enable real LLM-based ingredient consolidation.
Without it, the service returns a hardcoded demo response — everything else works normally.

```bash
# Linux / macOS
export ANTHROPIC_API_KEY=sk-ant-...

# Windows PowerShell
$env:ANTHROPIC_API_KEY = "sk-ant-..."
```

## Running locally

### 1. Backend

```bash
cd backend
mvn spring-boot:run
```

- REST API: http://localhost:8080/api
- H2 console (dev only): http://localhost:8080/h2-console — JDBC URL: `jdbc:h2:mem:cookbookdb`

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
