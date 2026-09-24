import { describe, it, expect } from 'vitest'
import { computeAvailableLeftovers, LeftoverSlot } from './leftovers'
import { Recipe, Leftover } from '../api/client'

function makeRecipe(slug: string, name: string, servings: number): Recipe {
  return { id: 1, slug, name, servings, content: '', tags: '', prepTimeMinutes: 0 }
}

function slot(recipeSlug: string, servings: number, leftoverSlug?: string, leftoverSourcePlanId?: number): LeftoverSlot {
  return { slotType: 'RECIPE', recipeSlug, servings, leftoverSlug, leftoverSourcePlanId }
}

function dbLeftover(recipeSlug: string, recipeName: string, servingsRemaining: number, sourcePlanId = 99): Leftover {
  return { id: 10, sourcePlanId, recipeSlug, recipeName, servingsRemaining }
}

const PASTA = makeRecipe('pasta', 'Pasta', 4)
const SOUP  = makeRecipe('soup',  'Soup',  3)

describe('computeAvailableLeftovers', () => {
  it('fresh-cook slot generates an in-draft leftover when surplus exists', () => {
    const result = computeAvailableLeftovers([slot('pasta', 2)], [PASTA], [])
    expect(result).toEqual([{ recipeSlug: 'pasta', recipeName: 'Pasta', servingsRemaining: 2 }])
  })

  it('no leftover generated when servings match recipe exactly', () => {
    const result = computeAvailableLeftovers([slot('pasta', 4)], [PASTA], [])
    expect(result).toHaveLength(0)
  })

  it('leftover-consuming slot removes the entry from the in-draft pool', () => {
    const result = computeAvailableLeftovers(
      [slot('pasta', 2), slot('pasta', 2, 'pasta')],
      [PASTA],
      []
    )
    expect(result).toHaveLength(0)
  })

  it('partial consumption leaves the remainder in the pool', () => {
    const result = computeAvailableLeftovers(
      [slot('pasta', 1), slot('pasta', 1, 'pasta')],
      [PASTA],
      []
    )
    expect(result).toEqual([{ recipeSlug: 'pasta', recipeName: 'Pasta', servingsRemaining: 2 }])
  })

  it('DB leftover appears when not consumed in the session', () => {
    const db = [dbLeftover('soup', 'Soup', 3)]
    const result = computeAvailableLeftovers([], [SOUP], db)
    expect(result).toEqual(db)
  })

  it('DB leftover is hidden when fully consumed in the session', () => {
    const db = [dbLeftover('soup', 'Soup', 3)]
    const result = computeAvailableLeftovers([slot('soup', 3, 'soup')], [SOUP], db)
    expect(result).toHaveLength(0)
  })

  it('DB leftover shows reduced servings when partially consumed', () => {
    const db = [dbLeftover('soup', 'Soup', 3, 99)]
    const result = computeAvailableLeftovers([slot('soup', 1, 'soup', 99)], [SOUP], db)
    expect(result).toEqual([{ ...db[0], servingsRemaining: 2 }])
  })

  it('cross-plan leftoverSourcePlanId does not consume from in-draft pool', () => {
    // Plan cooked pasta on day 1 (surplus 2), and also consumes Plan A's pasta leftover on day 2
    const db = [dbLeftover('pasta', 'Pasta', 1, 5)]
    const result = computeAvailableLeftovers(
      [slot('pasta', 2), slot('pasta', 1, 'pasta', 5)],
      [PASTA],
      db
    )
    // In-draft pool still has 2 servings (not touched by cross-plan consumption)
    // DB leftover from plan 5 is fully consumed
    expect(result).toEqual([{ recipeSlug: 'pasta', recipeName: 'Pasta', servingsRemaining: 2 }])
  })

  it('in-draft leftover takes priority over same-slug DB entry', () => {
    const db = [dbLeftover('pasta', 'Pasta', 1)]
    const result = computeAvailableLeftovers([slot('pasta', 2)], [PASTA], db)
    expect(result).toEqual([{ recipeSlug: 'pasta', recipeName: 'Pasta', servingsRemaining: 2 }])
    expect(result).toHaveLength(1)
  })

  it('multiple recipes accumulate independently', () => {
    const result = computeAvailableLeftovers(
      [slot('pasta', 2), slot('soup', 1)],
      [PASTA, SOUP],
      []
    )
    expect(result).toHaveLength(2)
    expect(result.find(l => l.recipeSlug === 'pasta')?.servingsRemaining).toBe(2)
    expect(result.find(l => l.recipeSlug === 'soup')?.servingsRemaining).toBe(2)
  })
})
