# Architecture

## Overview

Monorepo containing three logical layers:

```
cookbook/
├── backend/          Spring Boot 3 REST API (Java 21)
├── frontend/         React 18 + TypeScript SPA (Vite)
├── specifications/   Feature specs — source of truth for AI code generation
└── recipes/          Sample recipes in the project text format
```

## Backend

- **Framework:** Spring Boot 3.3.x
- **Language:** Java 21
- **Database:** PostgreSQL (primary, activated by `POSTGRES_URL` env var); H2 file-based (automatic fallback); H2 in-memory for tests
- **ORM:** Spring Data JPA / Hibernate
- **Build:** Maven 3.9+
- **Tests:** JUnit 5, MockMvc (`@WebMvcTest`), `@DataJpaTest`

### Package structure

```
com.cookbook
├── CookbookApplication.java
├── config/           DataSourceConfig — PostgreSQL / H2 fallback selection
├── recipe/           Recipe metadata index, file-based content storage, AI import
├── mealplan/         MealPlan + MealPlanEntry, flexible day planner
├── shoppinglist/     AI-powered generation + persisted list management
└── leftover/         Leftover tracking — persistence and plan-scoped API
```

### Database configuration

The active datasource is chosen at startup by `DataSourceConfig` (`com.cookbook.config`):

| Condition                               | Datasource used             |
|-----------------------------------------|-----------------------------|
| `POSTGRES_URL` unset                    | H2 file — project root (`cookbookdb.mv.db`) |
| `POSTGRES_URL` set, connection OK       | PostgreSQL                                  |
| `POSTGRES_URL` set, connection timeout  | H2 file — project root (`cookbookdb.mv.db`) |

Required env vars for PostgreSQL:
- `POSTGRES_URL` — e.g. `jdbc:postgresql://localhost:5432/cookbook`
- `POSTGRES_USER` — default: `postgres`
- `POSTGRES_PASSWORD` — default: empty

Tests always use H2 in-memory via `src/test/resources/application.yml`.

See `specifications/features/F004-database-configuration.md` for full spec.

### Conventions

- One package per feature domain
- Each domain has: entity, repository, service, controller
- Controllers are thin — all logic lives in services
- `ResponseStatusException` for error responses (no custom exception hierarchy yet)
- All endpoints under `/api/`

### Recipe file storage

Recipe content lives in the `recipes/` directory as `<slug>.md` files.
The `recipe` DB table is a metadata index only — no `content` column.
The service reads content from disk at request time and writes it on create/update.
On startup, the service syncs any `.md` files in `recipes/` not yet present in the DB.

## Frontend

- **Framework:** React 18 with TypeScript
- **Build tool:** Vite 8
- **Routing:** React Router DOM v6
- **API calls:** native `fetch` via `src/api/client.ts`
- Dev proxy: Vite forwards `/api/*` → `http://localhost:8080`

## AI Integration

Two features call the Anthropic API via a shared `AnthropicClient` bean:

**Shopping list generation** (`com.cookbook.shoppinglist.ShoppingListService`)
- Consolidates recipe ingredients from a meal plan into a grouped, persisted shopping list
- READY_PRODUCT entries are added directly without calling the LLM
- EAT_OUT entries and RECIPE entries with `leftoverSlug` set are excluded entirely
- See `specifications/features/F003-ai-shopping-list.md` for the full prompt spec

**Recipe import** (`com.cookbook.recipe.RecipeImportService`)
- Parses raw unstructured recipe text into structured fields (name, servings, ingredients, steps, etc.)
- Returns a draft that pre-fills the Add Recipe form; no new entity is persisted by the import step
- See `specifications/features/F005-recipe-import.md` for the full prompt spec

**Shared config**
- Config key: `ai.anthropic.api-key` (env var `ANTHROPIC_API_KEY`)
- If key is absent or `stub`, both features degrade gracefully to stub mode without making any LLM call

## Data flow

```
User selects meal plan
  → POST /api/shopping-lists/generate/{mealPlanId}
  → ShoppingListService loads plan entries
      RECIPE entries (fresh cook)  → read ingredients from recipes/<slug>.md → LLM consolidation
      RECIPE entries (leftoverSlug set) → skipped (already cooked, no new ingredients needed)
      READY_PRODUCT                → added directly to list
      EAT_OUT                      → skipped
  → ShoppingList + ShoppingListItems persisted to DB
  → User reviews list, marks owned items via PATCH
  → User deletes list when shopping is done via DELETE
```
