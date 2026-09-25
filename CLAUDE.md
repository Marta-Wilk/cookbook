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
│       ├── F003-ai-shopping-list.md
│       ├── F004-database-configuration.md
│       ├── F005-recipe-import.md
│       └── F006-leftovers.md
└── recipes/              Sample recipes in the project text format
```

## How AI-assisted development works here (Level 3)

1. A feature spec lives in `specifications/features/FXXX-<name>.md`
2. Read the spec, then generate code that satisfies every acceptance criterion
3. Write tests that cover the **Holdout tests** section — these gate CI
4. Open a PR referencing the spec
5. CI must pass (all tests green) before the PR can be merged
6. A human (the product owner) reviews and approves the merge

**Feature workflow — always follow this order:**
1. For new or changed functionality: update the relevant spec in `specifications/features/` first
2. Read the (updated) spec before writing any code
3. Follow the data model and API contract exactly
4. Implement the holdout tests first (they define done)
5. Do not add fields, endpoints, or behaviour beyond what the spec states

## Backend conventions

**Tech stack:** Java 21, Spring Boot 3.3.x, Spring Data JPA, PostgreSQL, Lombok, JUnit 5 (H2 file-based for local dev fallback; H2 in-memory for tests)

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

**Tech stack:** React 18, TypeScript, Vite 8, React Router DOM v6

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

**Styling rules — mandatory:**
- All styling must be placed in CSS files. Never use inline `style={{}}` attributes in TSX.
- CSS is organised in a hierarchy: `src/index.css` for global/shared styles, `src/pages/<Page>.css` for page-specific styles, `src/components/<Component>.css` for component-specific styles.
- Every TSX file that needs styling imports its own CSS file. Shared utility classes live in `index.css`.

## Running locally

### Backend
```bash
cd backend
# Requires JAVA_HOME pointing to JDK 21
JAVA_HOME=$JAVA21_HOME mvn spring-boot:run
```
- API: http://localhost:8080/api
- H2 console: http://localhost:8080/h2-console (JDBC URL: `jdbc:h2:file:../cookbookdb`)

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

## Branch discipline

Before touching any file:

1. Fetch the latest changes from the remote (no branch switch needed):

```bash
git fetch origin
```

2. Check the current branch with `git branch --show-current` and decide how to proceed:

   - **On `main`**: create a new branch from `origin/main` and continue:
     ```bash
     git checkout -b feature/<short-description> origin/main
     # or: git checkout -b fix/<short-description> origin/main
     ```

   - **On a feature/fix branch whose topic matches the planned changes**: continue working on it as-is.

   - **On a feature/fix branch whose topic does NOT match the planned changes**: warn the user that there are unmerged changes on the current branch that are unrelated to the new task, and ask:
     > "The current branch `<branch-name>` has unmerged changes unrelated to this task. Would you like to open a PR for those changes first before starting the new work?"
     - If the user **wants to open a PR first**: help them create the PR, then create a new branch from `origin/main` for the new work.
     - If the user **does not want a PR now**: create a new branch from `origin/main` for the new work and leave the existing branch untouched:
       ```bash
       git checkout -b feature/<short-description> origin/main
       # or: git checkout -b fix/<short-description> origin/main
       ```
       Use `fix/` prefix for bug fixes, `feature/` prefix for new functionality.

Each branch must cover one coherent unit of work — one feature, one fix, one PR.

## Pull request rules

- "Use the current working branch as the head branch" means use whatever branch you are on **after** following the branch discipline rule above — it is not permission to skip branch creation.
- Never close, merge, or delete a PR unless explicitly instructed.
- Before creating a PR for any branch that adds or modifies a feature spec, check `CLAUDE.md`, `README.md`, and `specifications/architecture.md` for discrepancies with the updated requirements (missing features, outdated tech versions, incorrect data model or package descriptions) and fix them before opening the PR.
- `gh` CLI is **not installed** — use the GitHub API directly via PowerShell `Invoke-RestMethod`. Retrieve the token with `printf 'protocol=https\nhost=github.com\n' | git credential fill` (run in Bash), then call `https://api.github.com/repos/Marta-Wilk/cookbook/...`.

## CI / Quality gate

Every PR to `main` triggers `.github/workflows/ci.yml`:
1. Backend: `mvn verify` — must be green
2. Frontend: `tsc && vite build` — must be green

PRs cannot be merged until both checks pass and a reviewer approves.

## Recipe text format

See `specifications/recipe-format.md` for the full spec.
Sample files are in `recipes/`. Recipe content is stored as `recipes/<slug>.md` on disk — the DB holds metadata only (no `content` column).
