import { describe, it, expect } from 'vitest'
import { filterRecipes } from './recipeFilter'
import { Recipe } from '../api/client'

function makeRecipe(overrides: Partial<Recipe>): Recipe {
  return {
    id: 1,
    name: 'Test Recipe',
    slug: 'test-recipe',
    content: '',
    tags: '',
    servings: 2,
    prepTimeMinutes: 30,
    ...overrides,
  }
}

const RECIPES: Recipe[] = [
  makeRecipe({ id: 1, name: 'Tomato Soup', slug: 'tomato-soup', tags: 'soup, vegetarian' }),
  makeRecipe({ id: 2, name: 'Chicken Curry', slug: 'chicken-curry', tags: 'curry, spicy' }),
  makeRecipe({ id: 3, name: 'Caesar Salad', slug: 'caesar-salad', tags: 'salad, vegetarian' }),
  makeRecipe({ id: 4, name: 'Beef Stew', slug: 'beef-stew', tags: null as unknown as string }),
]

describe('filterRecipes — name mode', () => {
  it('returns full list when query is blank', () => {
    expect(filterRecipes(RECIPES, '', 'name')).toHaveLength(4)
  })

  it('returns full list when query is whitespace only', () => {
    expect(filterRecipes(RECIPES, '   ', 'name')).toHaveLength(4)
  })

  it('matches by substring (case-insensitive)', () => {
    const result = filterRecipes(RECIPES, 'tom', 'name')
    expect(result).toHaveLength(1)
    expect(result[0].slug).toBe('tomato-soup')
  })

  it('is case-insensitive', () => {
    const result = filterRecipes(RECIPES, 'CHICKEN', 'name')
    expect(result).toHaveLength(1)
    expect(result[0].slug).toBe('chicken-curry')
  })

  it('returns empty array when nothing matches', () => {
    expect(filterRecipes(RECIPES, 'zzz', 'name')).toHaveLength(0)
  })
})

describe('filterRecipes — tag mode', () => {
  it('returns full list when query is blank', () => {
    expect(filterRecipes(RECIPES, '', 'tag')).toHaveLength(4)
  })

  it('matches individual tags (case-insensitive)', () => {
    const result = filterRecipes(RECIPES, 'vegetarian', 'tag')
    expect(result).toHaveLength(2)
    expect(result.map(r => r.slug)).toEqual(
      expect.arrayContaining(['tomato-soup', 'caesar-salad'])
    )
  })

  it('matches partial tag substring', () => {
    const result = filterRecipes(RECIPES, 'soup', 'tag')
    expect(result).toHaveLength(1)
    expect(result[0].slug).toBe('tomato-soup')
  })

  it('returns empty array when nothing matches', () => {
    expect(filterRecipes(RECIPES, 'zzz', 'tag')).toHaveLength(0)
  })

  it('does not throw when tags field is null', () => {
    expect(() => filterRecipes(RECIPES, 'anything', 'tag')).not.toThrow()
  })
})
