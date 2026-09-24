import { Leftover, LeftoverInput, Recipe } from '../api/client'

export interface LeftoverSlot {
  slotType: string
  recipeSlug?: string
  leftoverSlug?: string
  leftoverSourcePlanId?: number
  servings?: number
}

export type AvailableLeftover = LeftoverInput & { sourcePlanId?: number; id?: number }

/**
 * Compute leftovers available in the recipe picker.
 *
 * Iterates all slots in order:
 * - Fresh-cook slots add `recipe.servings - slot.servings` to the in-draft pool
 * - Leftover-consuming slots with leftoverSourcePlanId consume from DB (cross-plan)
 * - Leftover-consuming slots without leftoverSourcePlanId consume from in-draft pool first,
 *   then fall back to DB (same-plan DB leftover from a previous save)
 *
 * Supports partial DB leftover consumption: shows reduced servings rather than hiding entirely.
 * Returns in-draft pool entries first, then unconsumed/partially-consumed DB leftovers.
 */
export function computeAvailableLeftovers(
  slots: LeftoverSlot[],
  recipes: Recipe[],
  dbLeftovers: Leftover[]
): AvailableLeftover[] {
  const pool = new Map<string, { recipeName: string; servingsRemaining: number }>()
  const dbConsumed = new Map<string, number>()

  for (const slot of slots) {
    if (slot.slotType !== 'RECIPE' || !slot.recipeSlug) continue

    if (slot.leftoverSlug) {
      const slug = slot.leftoverSlug
      if (slot.leftoverSourcePlanId !== undefined) {
        // Cross-plan DB leftover — consume from DB, never from in-draft pool
        dbConsumed.set(slug, (dbConsumed.get(slug) ?? 0) + (slot.servings ?? 1))
      } else if (pool.has(slug)) {
        // In-draft leftover from same plan
        const entry = pool.get(slug)!
        entry.servingsRemaining -= slot.servings ?? 1
        if (entry.servingsRemaining <= 0) pool.delete(slug)
      } else {
        // Same-plan DB leftover (saved previously, leftoverSourcePlanId not stored)
        dbConsumed.set(slug, (dbConsumed.get(slug) ?? 0) + (slot.servings ?? 1))
      }
    } else {
      const recipe = recipes.find(r => r.slug === slot.recipeSlug)
      const surplus = (recipe?.servings ?? 0) - (slot.servings ?? 1)
      if (surplus > 0) {
        const existing = pool.get(slot.recipeSlug)
        if (existing) {
          existing.servingsRemaining += surplus
        } else {
          pool.set(slot.recipeSlug, { recipeName: recipe!.name, servingsRemaining: surplus })
        }
      }
    }
  }

  const sessionLeftovers: AvailableLeftover[] = Array.from(pool.entries()).map(([slug, v]) => ({
    recipeSlug: slug,
    recipeName: v.recipeName,
    servingsRemaining: v.servingsRemaining,
  }))

  const sessionSlugs = new Set(sessionLeftovers.map(l => l.recipeSlug))
  const unconsumedDb: AvailableLeftover[] = []
  for (const l of dbLeftovers) {
    if (sessionSlugs.has(l.recipeSlug)) continue
    const consumed = dbConsumed.get(l.recipeSlug) ?? 0
    if (consumed <= 0) {
      unconsumedDb.push(l)
    } else {
      const remaining = l.servingsRemaining - consumed
      if (remaining > 0) unconsumedDb.push({ ...l, servingsRemaining: remaining })
    }
  }

  return [...sessionLeftovers, ...unconsumedDb]
}

/**
 * For each external plan whose leftover was consumed in the given slots,
 * compute the updated (reduced) leftover list to persist back to that plan.
 * Returns a Map from sourcePlanId to the new leftover list for that plan.
 */
export function computeCrossPlanUpdates(
  slots: LeftoverSlot[],
  dbLeftovers: Leftover[]
): Map<number, LeftoverInput[]> {
  const consumed = new Map<number, Map<string, number>>()
  for (const slot of slots) {
    if (!slot.leftoverSlug || slot.leftoverSourcePlanId === undefined) continue
    const planMap = consumed.get(slot.leftoverSourcePlanId) ?? new Map<string, number>()
    planMap.set(slot.leftoverSlug, (planMap.get(slot.leftoverSlug) ?? 0) + (slot.servings ?? 1))
    consumed.set(slot.leftoverSourcePlanId, planMap)
  }

  const updates = new Map<number, LeftoverInput[]>()
  for (const [sourcePlanId, slugConsumed] of consumed) {
    const sourcePlanLeftovers = dbLeftovers.filter(l => l.sourcePlanId === sourcePlanId)
    const updated: LeftoverInput[] = sourcePlanLeftovers
      .map(l => {
        const c = slugConsumed.get(l.recipeSlug) ?? 0
        const remaining = l.servingsRemaining - c
        return remaining > 0 ? { recipeSlug: l.recipeSlug, recipeName: l.recipeName, servingsRemaining: remaining } : null
      })
      .filter((l): l is LeftoverInput => l !== null)
    updates.set(sourcePlanId, updated)
  }
  return updates
}
