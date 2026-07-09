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
- **Database:** PostgreSQL (preferred); H2 in-memory for tests only
- **ORM:** Spring Data JPA / Hibernate
- **Build:** Maven 3.9+
- **Tests:** JUnit 5, MockMvc (`@WebMvcTest`), `@DataJpaTest`

### Package structure

```
com.cookbook
├── CookbookApplication.java
├── recipe/           Recipe metadata index, file-based content storage
├── mealplan/         MealPlan + MealPlanEntry, flexible day planner
└── shoppinglist/     AI-powered generation + persisted list management
```

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
- **Build tool:** Vite 5
- **Routing:** React Router DOM v6
- **API calls:** native `fetch` via `src/api/client.ts`
- Dev proxy: Vite forwards `/api/*` → `http://localhost:8080`

## AI Integration

The shopping list feature calls the Anthropic API to consolidate ingredients from a meal plan into a grouped, persisted shopping list.

- Service: `com.cookbook.shoppinglist.ShoppingListService`
- Config key: `ai.anthropic.api-key` (env var `ANTHROPIC_API_KEY`)
- If key is absent or `stub`, the service returns a hardcoded demo response
- READY_PRODUCT entries are added to the list directly without calling the LLM
- EAT_OUT entries are excluded from the list entirely
- See `specifications/features/F003-ai-shopping-list.md` for the full prompt spec

## Data flow

```
User selects meal plan
  → POST /api/shopping-lists/generate/{mealPlanId}
  → ShoppingListService loads plan entries
      RECIPE entries   → read ingredients from recipes/<slug>.md → LLM consolidation
      READY_PRODUCT    → added directly to list
      EAT_OUT          → skipped
  → ShoppingList + ShoppingListItems persisted to DB
  → User reviews list, marks owned items via PATCH
  → User deletes list when shopping is done via DELETE
```
