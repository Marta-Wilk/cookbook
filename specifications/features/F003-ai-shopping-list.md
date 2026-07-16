# F003 — AI Shopping List

## Goal

Generate a shopping list from a meal plan using the Anthropic API. The list can be
saved, updated (items marked as owned), and deleted when shopping is done.

## Acceptance criteria

### Generation
1. `POST /api/shopping-lists/generate/{mealPlanId}` generates and persists a shopping list
2. RECIPE entries: ingredients extracted from the recipe file and sent to the LLM
3. READY_PRODUCT entries: added to the list directly (name + quantity), no LLM processing
4. EAT_OUT entries: excluded from the list entirely
5. LLM consolidates and deduplicates recipe ingredients across all RECIPE entries
6. When `ANTHROPIC_API_KEY` is not set, the stub path processes plan entries directly without calling the LLM:
   - `READY_PRODUCT` entries are added to items as `"<quantity> <productName>"`
   - `RECIPE` entries are resolved from disk and their `## Ingredients` lines are added verbatim
   - `EAT_OUT` entries are excluded
   - Items are not grouped by category and may contain duplicates — no consolidation is performed
   - The `groupedMarkdown` field is a flat bullet list of all collected items
7. When the meal plan has no RECIPE or READY_PRODUCT entries → saved list with empty items

### Retrieval and management
8. `GET /api/shopping-lists` returns all saved shopping lists (id, name, createdAt, itemCount)
9. `GET /api/shopping-lists/{id}` returns a list with all items and their `owned` status
10. `PATCH /api/shopping-lists/{id}/items/{itemId}` toggles the `owned` flag on an item
11. `DELETE /api/shopping-lists/{id}` removes the list and all its items; returns 204

## Data model

### ShoppingList

| Field       | Type      | Notes                                    |
|-------------|-----------|------------------------------------------|
| id          | Long      | auto-generated                           |
| name        | String    | defaults to meal plan name + date        |
| mealPlanId  | Long      | reference to source plan (not a FK)      |
| createdAt   | DateTime  | set on insert                            |

### ShoppingListItem

| Field          | Type    | Notes                                      |
|----------------|---------|--------------------------------------------|
| id             | Long    | auto-generated                             |
| shoppingList   | FK      | belongs to ShoppingList                    |
| ingredient     | String  | ingredient or product name                 |
| quantity       | String  | amount and unit as a string                |
| category       | String  | supermarket category from LLM              |
| owned          | boolean | true when user marks as already owned      |
| sortOrder      | int     | display order within category              |

## Anthropic API integration

**Model:** `claude-sonnet-5`

**System prompt:**
```
You are a helpful kitchen assistant. Given a list of recipe ingredient sections,
consolidate all ingredients into a single shopping list.
- Remove duplicates; sum quantities where possible
- Group by supermarket category: Produce, Meat & Fish, Dairy, Pantry, Frozen, Other
- Return JSON only, no explanation
```

**User message format:**
```
Generate a shopping list for the following recipes:

[RECIPE: Spaghetti Bolognese (serves 4, 2x this week)]
- 400g spaghetti
- 500g minced beef
...

[RECIPE: Tomato Soup (serves 4, 1x this week)]
- 400g tomatoes
...
```

**Expected JSON response:**
```json
{
  "items": [
    { "ingredient": "spaghetti", "quantity": "800g", "category": "Pantry" },
    { "ingredient": "minced beef", "quantity": "500g", "category": "Meat & Fish" }
  ]
}
```

## Frontend

### Shopping lists overview
The **Shopping List** nav item opens a page listing all saved shopping lists, showing
name and creation date for each. Clicking a list opens the Shopping list view.

### Shopping list view
The detail view is reachable in two ways:
- After generating a new list from the Meal Plan Details page (F002)
- By selecting an existing list from the Shopping lists overview

It displays:
- The list name and all items
- Each item shows ingredient/product name and quantity
- User can toggle the `owned` flag per item (checkbox or strikethrough)
- A **Delete** button removes the list entirely and returns the user to the overview
- When the list was generated in stub mode, a notice is shown informing the user that AI
  processing was unavailable: items may be duplicated, quantities are not summed, and
  there is no category grouping

### Empty plan handling
HTTP 204 from the generate endpoint is handled client-side — no navigation occurs;
the message *"For this plan there is no products to buy, you planned to eat out."*
is shown on the Meal Plan Details page.

## Holdout tests (CI gate)

- Stub mode (no API key): POST returns 200; items reflect actual plan entries — READY_PRODUCT items appear as-is,
  RECIPE ingredients are extracted from the recipe file without deduplication or grouping, EAT_OUT entries are absent
- Missing meal plan → POST returns 404
- Meal plan with only EAT_OUT entries → user receive message that 
  'For this plan there is no products to buy, you planned to eat out.'
- READY_PRODUCT entry appears in saved list without calling LLM
- `PATCH` owned=true on an item → GET returns that item with `owned: true`
- `DELETE` list → GET returns 404 for that list id
