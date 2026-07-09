# F002 — Meal Planning

## Goal

Users plan meals for 1 to 7 days by assigning a recipe, marking a slot as eat-out,
or entering a ready-made product for each day + meal-type slot.

## Acceptance criteria

1. `GET /api/meal-plans` lists all meal plans
2. `POST /api/meal-plans` creates a plan with `name`, `startDate`, and `durationDays` (1–7)
3. `GET /api/meal-plans/{id}` returns the plan with all entries and recipe details
4. `PUT /api/meal-plans/{id}` updates name, startDate, durationDays
5. `DELETE /api/meal-plans/{id}` removes the plan and all its entries; returns 204
6. `POST /api/meal-plans/{id}/entries` adds an entry (see slot types below)
7. `DELETE /api/meal-plans/{planId}/entries/{entryId}` removes a single entry
8. `durationDays` outside 1–7 → HTTP 400

## Meal types

Predefined types: `BREAKFAST`, `SECOND_BREAKFAST`, `LUNCH`, `DINNER`, `SNACK`, `DESSERT`

A `mealType` field accepts any of the above values or a custom free-text label,
allowing users to add additional slots (e.g. "Pre-workout", "Late night snack").

## Slot types

Each entry has a `slotType` which determines which additional fields are required:

| slotType        | Required fields              | Notes                                      |
|-----------------|------------------------------|--------------------------------------------|
| `RECIPE`        | `recipeSlug`, `servings`     | Links to a recipe by slug                  |
| `EAT_OUT`       | none                         | Placeholder; excluded from shopping list   |
| `READY_PRODUCT` | `productName`, `quantity`    | Manually specified product and quantity    |

## Data model

### MealPlan

| Field        | Type      | Notes                        |
|--------------|-----------|------------------------------|
| id           | Long      | auto-generated               |
| name         | String    | e.g. "Week 28 2026"          |
| startDate    | LocalDate | first day of the plan        |
| durationDays | int       | 1–7                          |
| entries      | List      | one-to-many                  |

### MealPlanEntry

| Field       | Type      | Notes                                           |
|-------------|-----------|-------------------------------------------------|
| id          | Long      | auto-generated                                  |
| mealPlan    | MealPlan  | FK                                              |
| dayIndex    | int       | 1 = startDate, up to durationDays               |
| mealType    | String    | predefined label or custom free-text            |
| slotType    | SlotType  | RECIPE, EAT_OUT, READY_PRODUCT                  |
| recipeSlug  | String    | set when slotType = RECIPE                      |
| servings    | int       | set when slotType = RECIPE, defaults to 1       |
| productName | String    | set when slotType = READY_PRODUCT               |
| quantity    | String    | set when slotType = READY_PRODUCT               |

## Holdout tests (CI gate)

- Create plan → GET returns it with `entries: []`
- `durationDays` = 0 or 8 → HTTP 400
- Add RECIPE entry with unknown recipeSlug → HTTP 404
- Add READY_PRODUCT entry without productName → HTTP 400
- Add two entries for the same dayIndex + mealType → HTTP 409 (slot conflict)
- Delete plan → all entries also deleted (cascade)
- EAT_OUT entry has no recipeSlug, productName, or quantity fields in response
