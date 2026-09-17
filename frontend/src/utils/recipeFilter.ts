import { Recipe } from '../api/client'

export function filterRecipes(
  recipes: Recipe[],
  query: string,
  mode: 'name' | 'tag'
): Recipe[] {
  const q = query.trim().toLowerCase()
  if (q === '') return recipes
  if (mode === 'name') return recipes.filter(r => r.name.toLowerCase().includes(q))
  return recipes.filter(r =>
    (r.tags ?? '')
      .split(',')
      .map(t => t.trim().toLowerCase())
      .filter(Boolean)
      .some(t => t.includes(q))
  )
}
