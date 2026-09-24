# F004 — AI Recipe Import

## Goal

Allow a user to paste raw, unstructured recipe text (e.g. copied from a website or a message)
and have the Anthropic API parse it into the application's recipe format, pre-filling the
Add Recipe form so the user can review, edit, and save normally.

## Acceptance criteria

### Parsing
1. `POST /api/recipes/import` accepts `{ "rawText": "..." }` and returns a parsed recipe draft
2. The response contains: `name`, `servings`, `prepTimeMinutes`, `tags`, `ingredients` (array of strings),
   `steps` (array of strings), `notes`, and `stubMode`
3. Missing fields in the raw text are returned as `null`; `ingredients` and `steps` are never null (empty array when absent)
4. Empty or blank `rawText` → 400 Bad Request
5. When `ANTHROPIC_API_KEY` is not set, the stub path returns `stubMode: true` with all other fields null/empty — no LLM call is made
6. When the Anthropic API call fails, the endpoint returns 502 Bad Gateway

### Frontend
7. The Add Recipe page shows an **Import from text** button
8. The button is enabled on initial load; after the first import attempt returns `stubMode: true`, the button becomes disabled
9. While disabled, hovering the button shows a tooltip: *"AI unavailable — ANTHROPIC_API_KEY is not configured"*
10. Clicking the enabled button reveals an import panel with a textarea and a **Parse with AI** button
11. Submitting the panel calls `POST /api/recipes/import` and pre-fills all matching form fields with the parsed values
12. After pre-fill the import panel closes; the user can edit the fields and save via the existing Add Recipe flow
13. Saving after import uses the existing `POST /api/recipes` endpoint — no new save endpoint

## Data model

No new persisted entities. The import endpoint is a stateless parsing step only.

### Request

| Field   | Type   | Notes               |
|---------|--------|---------------------|
| rawText | String | required, non-blank |

### Response

| Field           | Type           | Notes                                      |
|-----------------|----------------|--------------------------------------------|
| name            | String         | null if not determinable                   |
| servings        | Integer        | null if not determinable                   |
| prepTimeMinutes | Integer        | null if not determinable                   |
| tags            | String         | comma-separated, null if not determinable  |
| ingredients     | List\<String\> | never null; empty list when absent         |
| steps           | List\<String\> | never null; empty list when absent         |
| notes           | String         | null if absent                             |
| stubMode        | boolean        | true when ANTHROPIC_API_KEY is not set     |

## Anthropic API integration

**Model:** `claude-opus-4-8` (via `ai.anthropic.model` config key)

**System prompt:**
```
You are a kitchen assistant. Parse the provided raw recipe text into structured fields.
Return ONLY a raw JSON object with no markdown, no code fences, and no explanation.
Use exactly this structure:
{
  "name": "Recipe Title",
  "servings": 4,
  "prepTimeMinutes": 30,
  "tags": "pasta, italian",
  "ingredients": ["400g spaghetti", "500g minced beef"],
  "steps": ["Bring water to boil", "Cook pasta"],
  "notes": "Optional notes"
}
Use null for fields you cannot determine. Ingredients and steps must be arrays of strings.
```

## Frontend

The **Add Recipe** page gains an import section rendered above the form:

- An **Import from text** button (secondary style)
  - Enabled on initial load; disabled after first `stubMode: true` response
  - When disabled: a tooltip on hover explains AI is unavailable
- Clicking the enabled button shows an **import panel** containing:
  - A textarea for pasting raw recipe text
  - A **Parse with AI** button (disabled when textarea is empty or parse is in progress)
  - A **Cancel** button to dismiss the panel
- On successful parse (`stubMode: false`): form fields are pre-filled and the panel closes
- On `stubMode: true`: the button becomes disabled (tooltip visible) and the panel closes
- Errors from the API are surfaced via the existing page-level error display

## Holdout tests (CI gate)

- `POST /api/recipes/import` with stub mode (no API key) → 200 with `stubMode: true`, all other fields null/empty
- `POST /api/recipes/import` with blank `rawText` → 400
- `POST /api/recipes/import` with valid text → 200 with `stubMode: false` and expected fields (mocked service)
