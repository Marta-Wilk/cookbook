# F002 — Meal Planning

## Goal

Users plan meals for 1 to 7 days by assigning a recipe, marking a slot as eat-out,
or entering a ready-made product for each day + meal-type slot.

## Acceptance criteria

### BACKEND

1. `GET /api/meal-plans` lists all meal plans
2. `POST /api/meal-plans` creates a plan with `name`, `startDate`, and `durationDays` (1–7)
3. `GET /api/meal-plans/{id}` returns the plan with all entries and recipe details
4. `PUT /api/meal-plans/{id}` updates name, startDate, durationDays
5. `DELETE /api/meal-plans/{id}` removes the plan and all its entries; returns 204
6. `POST /api/meal-plans/{id}/entries` adds an entry (see slot types below)
7. `DELETE /api/meal-plans/{planId}/entries/{entryId}` removes a single entry
8. `durationDays` outside 1–7 → HTTP 400
9. Removal of plan and its entries should be transactional operation.

### FRONTEND

1. **Meal Plans** page lists all meal plans that exist sorting them by name. Displaying name and buttons to open, edit and
   delete for each plan in a separate row
2. On the top of 'Meal Plans' page we have a button to **Create New Plan** which opens a two-part form:
   - Part 1: have two fields `startDate`, `durationDays` (1–7) as list, and confirm button;
     it should not allow to create plan with backdated start date and for date for which plan already exist.
   - Part 2: have pre generated sections for each day with 3 default meals and possibility to add additional 
     Meal Slots before or after predefined one
3. **Meal Plan Details** page shows the plan with all its entries; available from 'Meals Plans' list item. The page includes a **Generate Shopping List** button:
   - On success (HTTP 200): navigates to the generated shopping list view
   - On HTTP 204: displays the message *"For this plan there is no products to buy, you planned to eat out."* inline on the page
4. Edit button will open Meal Plan Details page in edit mode to allow users modifications
5. Delete button - triggers additional pop-up with question 
   > "Are you sure you want to remove this plan? This operation cannot be undone."

   If confirmed, the plan and all its entries are removed
6. Each **Meal Slot** should be displayed with `MealType` name and `mealName` if mealType = OTHER. 
   Servings, recipe information, product name and quantity presence depends on Slot Type. 
   Meal Slot have button to remove it.

## Meal types

Predefined types: `BREAKFAST`, `SECOND_BREAKFAST`, `LUNCH`, `DINNER`, `SNACK`, `DESSERT`, `OTHER`

Each day in Meal Plan should have 3 meals by default with preselected types `BREAKFAST`,`LUNCH`, `DINNER`.

A `mealType` field accepts any of the above values, if `OTHER` meal type is chosen, application allowing users to add 
a custom free-text label for additional slots (e.g. "Pre-workout", "Late night snack").

## Slot types

Each entry has a `slotType` which determines which additional fields are required:

| slotType        | Required fields                        | Notes                                      |
|-----------------|----------------------------------------|--------------------------------------------|
| `RECIPE`        | `recipeSlug`, `servings`, `recipeName` | Links to a recipe by slug                  |
| `EAT_OUT`       | none                                   | Placeholder; excluded from shopping list   |
| `READY_PRODUCT` | `productName`, `quantity`              | Manually specified product and quantity    |

## Data model

### MealPlan

| Field        | Type      | Notes                                          |
|--------------|-----------|------------------------------------------------|
| id           | long      | auto-generated                                 |
| name         | String    | e.g. "14.07.2026" or "15.07.2026 - 17.07.2026" |
| startDate    | LocalDate | first day of the plan                          |
| durationDays | int       | 1–7                                            |
| entries      | List      | one-to-many                                    |

### MealPlanEntry

| Field       | Type     | Notes                                            |
|-------------|----------|--------------------------------------------------|
| id          | long     | auto-generated                                   |
| mealPlan    | MealPlan | FK                                               |
| dayIndex    | int      | 1 = startDate, up to durationDays                |
| mealType    | MealType | predefined type                                  |
| mealName    | String   | set when mealType = OTHER                        |
| slotType    | SlotType | RECIPE, EAT_OUT, READY_PRODUCT                   |
| recipeSlug  | String   | set when slotType = RECIPE                       |
| recipeName  | String   | set when slotType = RECIPE                       |
| servings    | int      | set when slotType = RECIPE, defaults to 1        |
| productName | String   | set when slotType = READY_PRODUCT                |
| quantity    | String   | set when slotType = READY_PRODUCT, defaults to 1 |

## Holdout tests (CI gate)

- Create plan → GET returns it with `entries: []`
- `durationDays` = 0 or 8 → HTTP 400
- Add RECIPE entry with unknown recipeSlug → HTTP 404
- Add READY_PRODUCT entry without productName → HTTP 400
- Add two entries for the same dayIndex + mealType → HTTP 409 (slot conflict)
- Delete plan → all entries also deleted (cascade)
- EAT_OUT entry has no recipeSlug, productName, recipeName, servings, or quantity fields in response
