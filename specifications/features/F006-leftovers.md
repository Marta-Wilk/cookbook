# F006 — Leftover Tracking

## Goal

Track leftover servings when a recipe produces more than a meal plan entry consumes.
Surface available leftovers in the recipe picker (above regular recipes) while the user is
building or editing a plan. Leftovers are computed **in frontend memory** during editing;
only the net leftovers that remain unconsumed after the whole plan is saved are persisted
to the database, tagged with the plan that generated them.

## Acceptance criteria

### In-memory tracking during plan creation / editing
1. While the user builds or edits a plan, the recipe picker shows a **Leftovers** section
   above regular recipes
2. As soon as a RECIPE slot is filled with a fresh cook where `recipe.servings > entry.servings`,
   the surplus appears immediately as an available leftover in subsequent slots of the same
   plan (no save required)
3. When a leftover is consumed within the same plan (slot with `leftoverSlug` set), it is
   removed from the picker for later slots
4. Leftovers from previous plans (from DB) are also shown, minus any already consumed in
   the current draft

### Persisting net leftovers (plan-scoped)
5. Every leftover row is tagged with the `sourcePlanId` of the plan that generated it
6. On plan save, the frontend calls `PUT /api/leftovers/plan/{planId}` with only this plan's
   net surplus (fresh-cook surpluses not consumed within this plan)
7. `PUT /api/leftovers/plan/{planId}` deletes all existing leftovers for that plan and
   inserts the provided list with `sourcePlanId` set to `planId`; returns 204
8. When a slot consumes a DB leftover from *another* plan, the slot stores `leftoverSourcePlanId`
   pointing to the source plan; on save, the frontend calls `PUT /api/leftovers/plan/{sourcePlanId}`
   with the reduced remaining list for each affected source plan (supports partial consumption)
9. When editing an existing plan, its own DB leftovers are excluded from the external DB
   snapshot before computing available leftovers (prevents double-counting)

### Plan deletion
10. Deleting a meal plan also deletes all leftover rows where `sourcePlanId = planId`
11. If any `MealPlanEntry` in another plan has `leftoverSourcePlanId` equal to the plan being
    deleted, the deletion is rejected with `409 Conflict`; the error detail names the blocking
    plan(s) so the user knows where to resolve the dependency first

### Shopping list integration
11. RECIPE entries with `leftoverSlug` set are excluded from shopping list generation —
    leftovers are already cooked and require no new ingredients

### Leftover management API
12. `GET /api/leftovers` returns all leftovers where `servingsRemaining > 0`; each row
    includes `id` and `sourcePlanId`
13. `PUT /api/leftovers/plan/{planId}` replaces all leftovers for that plan; returns 204
14. `DELETE /api/leftovers/{id}` removes a single leftover by id; unknown id → 404, returns 204

## Data model

### Leftover

| Field             | Type   | Notes                                          |
|-------------------|--------|------------------------------------------------|
| id                | Long   | generated primary key                          |
| sourcePlanId      | Long   | id of the plan that generated this leftover    |
| recipeSlug        | String | identifies the recipe                          |
| recipeName        | String | display name, copied from recipe               |
| servingsRemaining | int    | must be ≥ 0                                    |

Unique constraint on `(sourcePlanId, recipeSlug)`.

### MealPlanEntry (addition)

| Field                | Type   | Notes                                                               |
|----------------------|--------|---------------------------------------------------------------------|
| leftoverSlug         | String | nullable; set when entry consumes a leftover                        |
| leftoverSourcePlanId | Long   | nullable; id of the plan that owns the consumed leftover (cross-plan only) |

## Frontend

### Recipe picker
The recipe picker shows a **Leftovers** section above the regular recipe list.
Each leftover item displays the recipe name and remaining serving count.
Selecting a leftover sets both `recipeSlug` and `leftoverSlug` on the slot draft.
Selecting a regular recipe clears `leftoverSlug`.

### `computeAvailableLeftovers(slots, recipes, dbLeftovers)`
Utility in `src/utils/leftovers.ts`. Iterates over all slots:
- Fresh-cook slots add `recipe.servings - slot.servings` to the in-draft pool
- Leftover-consuming slots subtract from the pool (in-draft first, then mark DB slug as consumed)
Returns `[...inDraftPool, ...unconsumedDbLeftovers]`, session-first.

### View mode
Meal plan detail view appends `· leftover` to the slot description for entries that have
`leftoverSlug` set.

## Holdout tests (CI gate)

### Backend
- `GET /api/leftovers` returns leftovers with `servingsRemaining > 0`
- `DELETE /api/leftovers/{id}` on unknown id returns 404
- `DELETE /api/leftovers/{id}` on existing leftover returns 204
- `PUT /api/leftovers/plan/{planId}` with a non-empty list replaces that plan's leftovers and returns 204
- `PUT /api/leftovers/plan/{planId}` with an empty list clears that plan's leftovers and returns 204
- Deleting a meal plan removes its associated leftover rows
- Deleting a plan whose leftovers are consumed by another plan returns 409

### Frontend utility
- Fresh-cook slot generates in-draft leftover visible to picker
- Leftover-consuming slot (same slug) removes it from the in-draft pool
- DB leftover appears when not consumed in the session
- DB leftover is hidden when consumed in the session
- Session leftover takes priority over a same-slug DB entry
