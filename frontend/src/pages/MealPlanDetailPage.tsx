import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Leftover, MEAL_TYPES, MealPlan, MealPlanEntry, Recipe, leftoversApi, mealPlansApi, recipesApi, shoppingListApi } from '../api/client'
import { SlotType, SlotDraft, nextKey, generatePlanName, formatDayHeader, sortedDrafts, SlotEditor, InsertDivider } from '../components/MealPlanSlotEditor'
import { computeAvailableLeftovers, computeCrossPlanUpdates } from '../utils/leftovers'
import './MealPlanDetailPage.css'

function mealLabel(entry: MealPlanEntry): string {
  return entry.mealType === 'OTHER'
    ? (entry.mealName || 'Custom')
    : entry.mealType.replace(/_/g, ' ')
}

function slotDetail(entry: MealPlanEntry): string {
  if (entry.slotType === 'EAT_OUT') return 'Eat out'
  if (entry.slotType === 'READY_PRODUCT') return `${entry.productName} (${entry.quantity})`
  return `${entry.recipeName ?? entry.recipeSlug} · ${entry.servings} ${entry.servings === 1 ? 'serving' : 'servings'}`
}

function sortedEntries(entries: MealPlanEntry[]): MealPlanEntry[] {
  return [...entries].sort((a, b) => {
    const ai = MEAL_TYPES.indexOf(a.mealType as typeof MEAL_TYPES[number])
    const bi = MEAL_TYPES.indexOf(b.mealType as typeof MEAL_TYPES[number])
    return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi)
  })
}


function makeDefaultSlots(durationDays: number): SlotDraft[] {
  const slots: SlotDraft[] = []
  for (let dayIndex = 1; dayIndex <= durationDays; dayIndex++) {
    for (const mealType of ['BREAKFAST', 'LUNCH', 'DINNER']) {
      slots.push({ key: nextKey(), dayIndex, mealType, mealName: '', slotType: 'RECIPE', recipeSlug: '', servings: 1, productName: '', quantity: '' })
    }
  }
  return slots
}

// ---------- Main component ----------

export default function MealPlanDetailPage({ editMode = false }: { editMode?: boolean }) {
  const { id } = useParams()
  const navigate = useNavigate()

  const [plan, setPlan] = useState<MealPlan | null>(null)
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [leftovers, setLeftovers] = useState<Leftover[]>([])
  const [loading, setLoading] = useState(true)

  const today = new Date().toISOString().split('T')[0]

  // Edit mode state
  const [draftStartDate, setDraftStartDate] = useState('')
  const [draftDuration, setDraftDuration] = useState(0)
  const [draftSlots, setDraftSlots] = useState<SlotDraft[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Shopping list generation state
  const [generating, setGenerating] = useState(false)
  const [eatOutMessage, setEatOutMessage] = useState('')
  const [listExistsConflict, setListExistsConflict] = useState(false)

  useEffect(() => {
    if (!id) return
    Promise.all([mealPlansApi.getById(+id), recipesApi.getAll(), leftoversApi.getAll()])
      .then(([p, r, l]) => { setPlan(p); setRecipes(r); setLeftovers(l) })
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (!plan || !editMode) return
    setSaving(false)
    setError('')
    setDraftStartDate(plan.startDate)
    setDraftDuration(plan.durationDays)
    if (plan.entries.length === 0) {
      setDraftSlots(makeDefaultSlots(plan.durationDays))
      return
    }
    setDraftSlots(plan.entries.map(e => ({
      id: e.id,
      key: nextKey(),
      dayIndex: e.dayIndex,
      mealType: e.mealType,
      mealName: e.mealName ?? '',
      slotType: e.slotType as SlotType,
      recipeSlug: e.recipeSlug ?? '',
      leftoverSlug: e.leftoverSlug,
      leftoverSourcePlanId: e.leftoverSourcePlanId,
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
      recipeSlug: '',
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
      ...(slot.slotType === 'RECIPE' && {
        recipeSlug: slot.recipeSlug,
        servings: slot.servings,
        ...(slot.leftoverSlug && { leftoverSlug: slot.leftoverSlug }),
        ...(slot.leftoverSourcePlanId !== undefined && { leftoverSourcePlanId: slot.leftoverSourcePlanId }),
      }),
      ...(slot.slotType === 'READY_PRODUCT' && { productName: slot.productName, quantity: slot.quantity }),
    }
  }

  async function handleGenerateShoppingList() {
    if (!plan) return
    setGenerating(true)
    setEatOutMessage('')
    setListExistsConflict(false)
    try {
      const result = await shoppingListApi.generate(plan.id)
      if (result) {
        navigate(`/shopping-list/${result.id}`)
      } else {
        setEatOutMessage('For this plan there is no products to buy, you planned to eat out.')
      }
    } catch (err) {
      if (err instanceof Error && err.message.startsWith('409')) {
        setListExistsConflict(true)
      } else {
        setEatOutMessage('Failed to generate shopping list. Please try again.')
      }
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
      if (draftStartDate !== plan.startDate || draftDuration !== plan.durationDays) {
        await mealPlansApi.update(plan.id, {
          name: generatePlanName(draftStartDate, draftDuration),
          startDate: draftStartDate,
          durationDays: draftDuration,
        })
      }

      const entries = draftSlots
        .filter(s => s.dayIndex >= 1 && s.dayIndex <= draftDuration && !(s.slotType === 'RECIPE' && !s.recipeSlug))
        .map(buildEntry)
      await mealPlansApi.replaceEntries(plan.id, entries)

      const dbFromOtherPlans = leftovers.filter(l => l.sourcePlanId !== plan.id)
      const allAvailable = computeAvailableLeftovers(draftSlots, recipes, dbFromOtherPlans)
      const ownLeftovers = allAvailable.filter(l => l.sourcePlanId === undefined)
      await leftoversApi.replaceForPlan(plan.id, ownLeftovers)
      const crossPlanUpdates = computeCrossPlanUpdates(draftSlots, leftovers)
      for (const [sourcePlanId, updatedList] of crossPlanUpdates) {
        await leftoversApi.replaceForPlan(sourcePlanId, updatedList)
      }

      const updated = await mealPlansApi.getById(plan.id)
      setPlan(updated)
      navigate(`/meal-plan/${plan.id}`)
    } catch (e) {
      const raw = e instanceof Error ? e.message : ''
      const detail = raw.replace(/^\d{3}\s+/, '')
      setError(detail || 'Failed to save changes. Please try again.')
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
        <div className="page-header">
          <h1 className="page-header__title">{plan.name}</h1>
          <div className="page-header__actions">
            <button className="btn btn--secondary" onClick={() => navigate(`/meal-plan/${plan.id}/edit`)}>Edit</button>
            <button className="btn btn--primary" onClick={handleGenerateShoppingList} disabled={generating}>
              {generating ? 'Generating…' : 'Generate Shopping List'}
            </button>
            <button className="btn btn--ghost" onClick={() => navigate('/meal-plan')}>← Back to list</button>
          </div>
        </div>

        {eatOutMessage && (
          <p className="eat-out-message">{eatOutMessage}</p>
        )}

        {listExistsConflict && (
          <p className="eat-out-message">
            A shopping list already exists for this plan.{' '}
            <button className="btn-link" onClick={() => navigate('/shopping-list')}>View Shopping Lists</button>
          </p>
        )}

        {days.map(dayIndex => {
          const entries = sortedEntries(plan.entries.filter(e => e.dayIndex === dayIndex))
          return (
            <div key={dayIndex} className="day-card">
              <div className="day-card__header">
                Day {dayIndex} — {formatDayHeader(plan.startDate, dayIndex)}
              </div>
              <div className="day-card__body">
                {entries.length === 0 && (
                  <p className="day-card__empty">No meals planned.</p>
                )}
                {entries.map(entry => (
                  <div key={entry.id} className="meal-entry">
                    <span className="meal-entry__label">{mealLabel(entry)}</span>
                    <span className="meal-entry__detail">
                      {slotDetail(entry)}
                      {entry.leftoverSlug && <span className="leftover-chip">leftover</span>}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  // ---- Edit mode ----
  const editDays = Array.from({ length: draftDuration }, (_, i) => i + 1)

  // Exclude this plan's own DB leftovers — computeAvailableLeftovers derives them from draftSlots instead.
  const availableLeftovers = computeAvailableLeftovers(
    draftSlots, recipes, leftovers.filter(l => l.sourcePlanId !== plan.id)
  )

  return (
    <div>
      <div className="page-header">
        <h1 className="page-header__title">{generatePlanName(draftStartDate, draftDuration)}</h1>
        <div className="page-header__actions">
          <label className="edit-date-label">
            Start date
            <input
              type="date"
              value={draftStartDate}
              min={plan.startDate < today ? plan.startDate : today}
              onChange={e => setDraftStartDate(e.target.value)}
            />
          </label>
          <label className="edit-date-label">
            Duration
            <select value={draftDuration} onChange={e => setDraftDuration(+e.target.value)}>
              {[1, 2, 3, 4, 5, 6, 7].map(n => (
                <option key={n} value={n}>{n} day{n > 1 ? 's' : ''}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {editDays.map(dayIndex => {
        const slots = sortedDrafts(draftSlots.filter(s => s.dayIndex === dayIndex))
        return (
          <div key={dayIndex} className="day-card">
            <div className="day-card__header">
              Day {dayIndex} — {formatDayHeader(draftStartDate, dayIndex)}
            </div>
            <div className="day-card__body">
              <InsertDivider onClick={() => addDraftSlot(dayIndex)} />
              {slots.map(slot => (
                <div key={slot.key}>
                  <SlotEditor
                    slot={slot}
                    recipes={recipes}
                    leftovers={availableLeftovers}
                    onChange={patch => updateDraftSlot(slot.key, patch)}
                    onRemove={() => removeDraftSlot(slot.key)}
                  />
                  <InsertDivider onClick={() => addDraftSlot(dayIndex)} />
                </div>
              ))}
            </div>
          </div>
        )
      })}

      {error && <p className="error-text">{error}</p>}

      <div className="page-header__actions edit-save-actions">
        <button className="btn btn--primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save changes'}
        </button>
        <button className="btn btn--secondary" onClick={() => navigate(`/meal-plan/${plan.id}`)} disabled={saving}>
          Cancel
        </button>
      </div>
    </div>
  )
}
