# F001 — Recipe Management

## Goal

Users can create, read, update, and delete recipes. Recipe content is stored as plain
Markdown files in the `recipes/` directory — portable, shareable, and readable without
the application. The database holds only a metadata index for querying.

## Storage model

- **Source of truth:** `recipes/<slug>.md` file on disk
- **Database:** index table with metadata only — no `content` column
- On create/update the service writes the `.md` file and upserts the DB row
- On delete the service removes the `.md` file and the DB row
- On startup the service syncs the DB index from the `recipes/` directory so files
  dropped in manually (e.g. shared by a friend) appear in the app automatically

## Acceptance criteria

1. `GET /api/recipes` returns a list of all recipes (id, name, slug, tags, servings, prepTimeMinutes)
2. `GET /api/recipes/{slug}` returns a single recipe including full `content` (read from file)
3. `POST /api/recipes` creates a recipe and writes `recipes/<slug>.md`; slug derived from name if omitted
4. `PUT /api/recipes/{slug}` updates metadata and overwrites the `.md` file
5. `DELETE /api/recipes/{slug}` removes the file and the DB row; returns 204
6. A missing recipe returns 404 with `{ "message": "Recipe not found: {slug}" }`
7. Slug must be unique; duplicate slug returns 409
8. On application startup, any `.md` files in `recipes/` not yet in the DB are indexed automatically

## Data model (DB index only)

| Field           | Type     | Notes                                    |
|-----------------|----------|------------------------------------------|
| id              | Long     | auto-generated                           |
| name            | String   | required, non-blank                      |
| slug            | String   | unique, URL-safe, derived from name      |
| tags            | String   | comma-separated                          |
| servings        | Integer  | optional                                 |
| prepTimeMinutes | Integer  | optional                                 |
| createdAt       | DateTime | set on insert                            |
| updatedAt       | DateTime | updated on every save                    |

Recipe `content` (full Markdown) is never stored in the DB — it is read from
`recipes/<slug>.md` at request time and included in the API response.

## Recipe list search (frontend)

The recipes list page provides a search bar allowing users to filter the displayed recipes without any server round-trip. All filtering is client-side over the data already returned by `GET /api/recipes`.

### Acceptance criteria

9. When at least one recipe exists, a search bar is displayed above the recipe list
10. The search bar contains two radio buttons — **By name** (selected by default) and **By tag** — and a text input
11. As the user types, the displayed list updates in real time to show only matching recipes
12. In **By name** mode: a recipe is included if its `name` contains the query string (case-insensitive substring match)
13. In **By tag** mode: a recipe is included if any of its individual tags contains the query string (tags are split on `,`, trimmed, matched case-insensitively)
14. A blank or whitespace-only query matches all recipes (full list shown)
15. When the query is non-empty and no recipes match, the message **"No recipes match your search."** is shown in place of the list
16. When no recipes exist at all, the search bar is not rendered — only the **"No recipes yet. Add your first one!"** message is shown
17. Switching between modes while a query is typed re-filters immediately; the query is not cleared

## Holdout tests (CI gate)

- `GET /api/recipes` returns empty list when no recipes exist → HTTP 200, body `[]`
- `POST /api/recipes` with missing `name` → HTTP 400
- `GET /api/recipes/nonexistent` → HTTP 404
- Slug auto-derived from name "Tomato Soup" → `"tomato-soup"`
- Duplicate slug on second create → HTTP 409
- After `POST`, file `recipes/<slug>.md` exists on disk and contains the submitted content
- After `DELETE`, file `recipes/<slug>.md` is removed from disk
- Frontend TypeScript build passes after adding search state and JSX (`tsc && vite build` green)
