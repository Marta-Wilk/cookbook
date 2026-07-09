# Cookbook — AI Development Guide

This file is the primary context document for AI-assisted development on this project.
Read it before generating any code.

## Project

A personal home cookbook application combining:
- Recipe management (plain Markdown text format — portable, shareable, readable outside the app)
- Weekly meal planning (assign recipes to day + meal-type slots)
- AI-powered shopping list generation (consolidates ingredients from a week's plan)

## Monorepo layout

```
cookbook/
├── backend/              Spring Boot 3 REST API — Java 21
├── frontend/             React 18 + TypeScript SPA — Vite
├── specifications/       Feature specs — source of truth for code generation
│   ├── architecture.md
│   ├── recipe-format.md
│   └── features/
│       ├── F001-recipe-management.md
│       ├── F002-meal-planning.md
│       └── F003-ai-shopping-list.md
└── recipes/              Sample recipes in the project text format
```

## How AI-assisted development works here (Level 3)

1. A feature spec lives in `specifications/features/FXXX-<name>.md`
2. Read the spec, then generate code that satisfies every acceptance criterion
3. Write tests that cover the **Holdout tests** section — these gate CI
4. Open a PR referencing the spec
5. CI must pass (all tests green) before the PR can be merged
6. A human (the product owner) reviews and approves the merge

**When given a feature to implement:**
- Start by reading the relevant spec file
- Follow the data model and API contract exactly
- Implement the holdout tests first (they define done)
- Do not add fields, endpoints, or behaviour beyond what the spec states

## Backend conventions

**Tech stack:** Java 21, Spring Boot 3.3.x, Spring Data JPA, PostgreSQL, Lombok, JUnit 5 (H2 for tests only)

**Package structure:** `com.cookbook.<feature>` — one package per domain

**Each domain contains:**
- `<Entity>.java` — JPA entity with Lombok `@Getter @Setter @NoArgsConstructor`
- `<Entity>Repository.java` — extends `JpaRepository<Entity, Long>`
- `<Entity>Service.java` — `@Service`, injected via `@RequiredArgsConstructor`, all business logic here
- `<Entity>Controller.java` — `@RestController`, thin, delegates to service

**Error handling:**
- Throw `ResponseStatusException` from services — never from controllers
- Missing resource → `HttpStatus.NOT_FOUND`
- Validation failure → `HttpStatus.BAD_REQUEST`
- Conflict (e.g. duplicate slug) → `HttpStatus.CONFLICT`

**API contract:**
- All endpoints under `/api/`
- CORS allowed for `http://localhost:5173` (Vite dev server)
- Return `ResponseEntity<T>` with explicit status from POST (201 CREATED)
- DELETE returns 204 No Content

**Testing:**
- `@WebMvcTest` for controller tests (mock the service layer)
- `@DataJpaTest` for repository tests
- `@SpringBootTest` only for integration/smoke tests
- Test class name: `<Subject>Test` (not `<Subject>Tests` except the app smoke test)

## Frontend conventions

**Tech stack:** React 18, TypeScript, Vite 5, React Router DOM v6

**File layout:**
```
src/
  api/client.ts      — all fetch calls, typed interfaces
  pages/             — one file per route
  App.tsx            — router + nav
  main.tsx           — entry point
```

**API calls:** use functions from `src/api/client.ts` — do not call `fetch` directly in components

**State:** local `useState` + `useEffect` is sufficient for now (no Redux, no React Query yet)

## Running locally

### Backend
```bash
cd backend
# Requires JAVA_HOME pointing to JDK 21
JAVA_HOME=$JAVA21_HOME mvn spring-boot:run
```
- API: http://localhost:8080/api
- H2 console: http://localhost:8080/h2-console (JDBC URL: `jdbc:h2:mem:cookbookdb`)

### Frontend
```bash
cd frontend
npm install
npm run dev
```
- UI: http://localhost:5173
- Vite proxies `/api/*` → backend automatically

### AI shopping list (optional)
Set `ANTHROPIC_API_KEY` in your environment.
Without it the service returns a stub demo response — fine for local dev.

## CI / Quality gate

Every PR to `main` triggers `.github/workflows/ci.yml`:
1. Backend: `mvn verify` — must be green
2. Frontend: `tsc && vite build` — must be green

PRs cannot be merged until both checks pass and a reviewer approves.

## Recipe text format

See `specifications/recipe-format.md` for the full spec.
Sample files are in `recipes/`. The `content` field of a `Recipe` entity stores the full Markdown.
