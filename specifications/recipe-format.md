# Recipe Text Format

Recipes are stored as plain Markdown files in the `recipes/` directory.
The format is human-readable outside the app and easy to share.

## File naming

`<slug>.md` — e.g. `spaghetti-bolognese.md`

The slug must match the `slug` field in the database.

## Format specification

```markdown
# Recipe Name

**Serves:** 4
**Time:** 45 min
**Tags:** pasta, italian, beef

## Ingredients

- 400g spaghetti
- 500g minced beef
- 2 cans (400g each) chopped tomatoes
- 1 medium onion, diced
- 3 cloves garlic, minced
- 2 tbsp olive oil
- salt and pepper to taste

## Instructions

1. Bring a large pot of salted water to the boil.
2. Heat olive oil in a large pan over medium heat. Add onion and cook for 5 minutes.
3. Add garlic and cook for 1 minute.
4. Add minced beef and brown, breaking it up as it cooks.
5. Stir in tomatoes and simmer for 20 minutes. Season with salt and pepper.
6. Cook spaghetti according to packet instructions. Drain and serve with sauce.

## Notes

Goes well with a glass of Chianti. Leftovers keep for 3 days in the fridge.
```

## Rules

- `# Recipe Name` — required, first line
- `**Serves:**` and `**Time:**` — optional metadata in bold key-value pairs
- `**Tags:**` — comma-separated list, used for filtering
- `## Ingredients` — required section; each line starts with `-`
- `## Instructions` — required section; numbered steps
- `## Notes` — optional free-text section
- Quantities use metric by default (g, ml, kg, l)

## AI parsing hint

When generating a shopping list, extract all `## Ingredients` sections from recipe content fields. Consolidate duplicates and group by category (produce, meat, dairy, pantry, etc.).
