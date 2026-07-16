import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { MEAL_TYPES, MealPlan, MealPlanEntry, Recipe, mealPlansApi, recipesApi, shoppingListApi } from '../api/client'
import { SlotType, SlotDraft, nextKey, generatePlanName, formatDayHeader, sortedDrafts, SlotEditor, InsertDivider } from '../components/MealPlanSlotEditor'

function mealLabel(entry: MealPlanEntry): string {
  return entry.mealType === 'OTHER'
    ? (entry.mealName || 'Custom')
    : entry.mealType.replace(/_/g, ' ')
}

function slotDetail(entry: MealPlanEntry): string {
  if (entry.slotType === 'EAT_OUT') return 'Eat out'
  if (entry.slotType === 'READY_PRODUCT') return `${entry.productName} (${entry.quantity})`
  return `${entry.recipeName ?? entry.recipeSlug} ×${entry.servings}`
}

function sortedEntries(entries: MealPlanEntry[]): MealPlanEntry[] {
  return [...entries].sort((a, b) => {
    const ai = MEAL_TYPES.indexOf(a.mealType as typeof MEAL_TYPES[number])
    const bi = MEAL_TYPES.indexOf(b.mealType as typeof MEAL_TYPES[number])
    return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi)
  })
}

function isDifferent(slot: SlotDraft, orig: MealPlanEntry): boolean {
  if (slot.mealType !== orig.mealType || slot.dayIndex !== orig.dayIndex || slot.slotType !== orig.slotType) return true
  if (slot.mealType === 'OTHER' && slot.mealName !== (orig.mealName ?? '')) return true
  if (slot.slotType === 'RECIPE' && (slot.recipeSlug !== (orig.recipeSlug ?? '') || slot.servings !== (orig.servings ?? 1))) return true
  if (slot.slotType === 'READY_PRODUCT' && (slot.productName !== (orig.productName ?? '') || slot.quantity !== (orig.quantity ?? ''))) return true
  return false
}

// ---------- Main component ----------

export default function MealPlanDetailPage({ editMode = false }: { editMode?: boolean }) {
  const { id } = useParams()
  const navigate = useNavigate()

  const [plan, setPlan] = useState<MealPlan | null>(null)
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)

  const today = new Date().toISOString().split('T')[0]

  // Edit mode state
  const [draftStartDate, setDraftStartDate] = useState('')
  const [draftDuration, setDraftDuration] = useState(0)
  const [draftSlots, setDraftSlots] = useState<SlotDraft[]>([])
  const [originalEntries, setOriginalEntries] = useState<MealPlanEntry[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Shopping list generation state
  const [generating, setGenerating] = useState(false)
  const [eatOutMessage, setEatOutMessage] = useState('')

  useEffect(() => {
    if (!id) return
    Promise.all([mealPlansApi.getById(+id), recipesApi.getAll()])
      .then(([p, r]) => { setPlan(p); setRecipes(r) })
      .finally(() => setLoading(false))
  }, [id])

  // Initialise edit drafts whenever edit mode is entered (or plan reloads in edit mode)
  useEffect(() => {
    if (!plan || !editMode) return
    setSaving(false)
    setError('')
    setDraftStartDate(plan.startDate)
    setDraftDuration(plan.durationDays)
    setOriginalEntries(plan.entries)
    setDraftSlots(plan.entries.map(e => ({
      id: e.id,
      key: nextKey(),
      dayIndex: e.dayIndex,
      mealType: e.mealType,
      mealName: e.mealName ?? '',
      slotType: e.slotType as SlotType,
      recipeSlug: e.recipeSlug ?? '',
      servings: e.servings ?? 1,
      productName: e.productName ?? '',
      quantity: e.quantity ?? '',
    })))
  }, [plan, editMode])

  function updateDraftSlot(key: number, patch: Partial<SlotDraft>) {
    setDraftSlots(prev => prev.map(s => s.key === key ? { ...s, ...patch } : s))
  }

  function removeDraftSlot(key: number) {
    setDraftSlots(prev => prev.filter(s => s.key !== key))
  }

  function addDraftSlot(dayIndex: number) {
    const used = new Set(draftSlots.filter(s => s.dayIndex === dayIndex).map(s => s.mealType))
    const mealType = MEAL_TYPES.find(t => !used.has(t)) ?? 'OTHER'
    setDraftSlots(prev => [...prev, {
      key: nextKey(),
      dayIndex,
      mealType,
      mealName: '',
      slotType: 'RECIPE',
      recipeSlug: recipes[0]?.slug ?? '',
      servings: 1,
      productName: '',
      quantity: '',
    }])
  }

  function buildEntry(slot: SlotDraft): Omit<MealPlanEntry, 'id'> {
    return {
      dayIndex: slot.dayIndex,
      mealType: slot.mealType,
      ...(slot.mealType === 'OTHER' && { mealName: slot.mealName }),
      slotType: slot.slotType,
      ...(slot.slotType === 'RECIPE' && { recipeSlug: slot.recipeSlug || recipes[0]?.slug, servings: slot.servings }),
      ...(slot.slotType === 'READY_PRODUCT' && { productName: slot.productName, quantity: slot.quantity }),
    }
  }

  async function handleGenerateShoppingList() {
    if (!plan) return
    setGenerating(true)
    setEatOutMessage('')
    try {
      const result = await shoppingListApi.generate(plan.id)
      if (result) {
        navigate(`/shopping-list/${result.id}`)
      } else {
        setEatOutMessage('For this plan there is no products to buy, you planned to eat out.')
      }
    } catch {
      setEatOutMessage('Failed to generate shopping list. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  async function handleSave() {
    if (!plan) return
    const minStartDate = plan.startDate < today ? plan.startDate : today
    if (draftStartDate < minStartDate) {
      setError(`Start date cannot be before ${minStartDate}.`)
      return
    }
    setSaving(true)
    setError('')
    try {
      // Update plan header first so overlap check runs before touching entries
      if (draftStartDate !== plan.startDate || draftDuration !== plan.durationDays) {
        await mealPlansApi.update(plan.id, {
          name: generatePlanName(draftStartDate, draftDuration),
          startDate: draftStartDate,
          durationDays: draftDuration,
        })
      }

      const toDeleteIds = new Set<number>()
      const toPost: SlotDraft[] = []

      // Entries to delete: removed, out-of-range, or changed
      for (const orig of originalEntries) {
        const current = draftSlots.find(s => s.id === orig.id)
        if (!current || current.dayIndex > draftDuration || isDifferent(current, orig)) {
          toDeleteIds.add(orig.id)
        }
      }

      // Entries to post: new ones, or originals that changed
      for (const slot of draftSlots.filter(s => s.dayIndex <= draftDuration)) {
        if (!slot.id) {
          toPost.push(slot)
        } else {
          const orig = originalEntries.find(e => e.id === slot.id)
          if (orig && isDifferent(slot, orig)) {
            toPost.push(slot)
          }
        }
      }

      // Delete first to free unique-constraint slots, then post
      for (const id of toDeleteIds) {
        await mealPlansApi.deleteEntry(plan.id, id)
      }
      for (const slot of toPost) {
        await mealPlansApi.addEntry(plan.id, buildEntry(slot))
      }

      // Re-fetch so the view mode shows fresh data in the same component instance
      const updated = await mealPlansApi.getById(plan.id)
      setPlan(updated)
      navigate(`/meal-plan/${plan.id}`)
    } catch (e) {
      const msg = e instanceof Error ? e.message : ''
      setError(msg.startsWith('409')
        ? 'A meal plan already exists for this date range.'
        : 'Failed to save changes. Please try again.')
      setSaving(false)
    }
  }

  if (loading) return <p>Loading…</p>
  if (!plan) return <p>Plan not found.</p>

  // ---- View mode ----
  if (!editMode) {
    const days = Array.from({ length: plan.durationDays }, (_, i) => i + 1)
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
          <h1 style={{ margin: 0 }}>{plan.name}</h1>
          <button onClick={() => navigate(`/meal-plan/${plan.id}/edit`)}>Edit</button>
          <button onClick={handleGenerateShoppingList} disabled={generating}>
            {generating ? 'Generating…' : 'Generate Shopping List'}
          </button>
          <button onClick={() => navigate('/meal-plan')}>← Back to list</button>
        </div>

        {eatOutMessage && (
          <p style={{ color: '#666', fontStyle: 'italic', marginBottom: '1rem' }}>{eatOutMessage}</p>
        )}

        {days.map(dayIndex => {
          const entries = sortedEntries(plan.entries.filter(e => e.dayIndex === dayIndex))
          return (
            <div key={dayIndex} style={{ marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid #eee' }}>
              <h3 style={{ margin: '0 0 0.6rem' }}>
                Day {dayIndex} — {formatDayHeader(plan.startDate, dayIndex)}
              </h3>
              {entries.length === 0 && (
                <p style={{ color: '#999', margin: '0.25rem 0' }}>No meals planned.</p>
              )}
              {entries.map(entry => (
                <div
                  key={entry.id}
                  style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', marginBottom: '0.3rem' }}
                >
                  <strong style={{ minWidth: '160px', flexShrink: 0 }}>{mealLabel(entry)}</strong>
                  <span style={{ color: '#555' }}>{slotDetail(entry)}</span>
                </div>
              ))}
            </div>
          )
        })}
      </div>
    )
  }

  // ---- Edit mode ----
  const editDays = Array.from({ length: draftDuration }, (_, i) => i + 1)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <h1 style={{ margin: 0 }}>{generatePlanName(draftStartDate, draftDuration)}</h1>
        <label>
          Start date{' '}
          <input
            type="date"
            value={draftStartDate}
            min={plan.startDate < today ? plan.startDate : today}
            onChange={e => setDraftStartDate(e.target.value)}
          />
        </label>
        <label>
          Duration{' '}
          <select value={draftDuration} onChange={e => setDraftDuration(+e.target.value)}>
            {[1, 2, 3, 4, 5, 6, 7].map(n => (
              <option key={n} value={n}>{n} day{n > 1 ? 's' : ''}</option>
            ))}
          </select>
        </label>
      </div>

      {editDays.map(dayIndex => {
        const slots = sortedDrafts(draftSlots.filter(s => s.dayIndex === dayIndex))
        return (
          <div key={dayIndex} style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ margin: '0 0 0.4rem' }}>
              Day {dayIndex} — {formatDayHeader(draftStartDate, dayIndex)}
            </h3>

            <InsertDivider onClick={() => addDraftSlot(dayIndex)} />

            {slots.map(slot => (
              <div key={slot.key}>
                <SlotEditor
                  slot={slot}
                  recipes={recipes}
                  onChange={patch => updateDraftSlot(slot.key, patch)}
                  onRemove={() => removeDraftSlot(slot.key)}
                />
                <InsertDivider onClick={() => addDraftSlot(dayIndex)} />
              </div>
            ))}
          </div>
        )
      })}

      {error && <p style={{ color: 'red' }}>{error}</p>}

      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
        <button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save changes'}
        </button>
        <button onClick={() => navigate(`/meal-plan/${plan.id}`)} disabled={saving}>
          Cancel
        </button>
      </div>
    </div>
  )
}
