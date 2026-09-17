import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MEAL_TYPES, MealPlan, MealPlanEntry, Recipe, mealPlansApi, recipesApi } from '../api/client'
import { SlotDraft, nextKey, generatePlanName, formatDayHeader, SlotEditor, InsertDivider } from '../components/MealPlanSlotEditor'
import './MealPlanCreatePage.css'

type DayDraft = { dayIndex: number; slots: SlotDraft[] }

function makeSlot(mealType: string): SlotDraft {
  return { key: nextKey(), dayIndex: 0, mealType, mealName: '', slotType: 'RECIPE', recipeSlug: '', servings: 1, productName: '', quantity: '' }
}

function makeDays(durationDays: number): DayDraft[] {
  return Array.from({ length: durationDays }, (_, i) => ({
    dayIndex: i + 1,
    slots: [makeSlot('BREAKFAST'), makeSlot('LUNCH'), makeSlot('DINNER')],
  }))
}

function rangesOverlap(existingPlans: MealPlan[], startDate: string, durationDays: number): boolean {
  const newStart = new Date(startDate).getTime()
  const newEnd = new Date(startDate)
  newEnd.setDate(newEnd.getDate() + durationDays - 1)
  return existingPlans.some(p => {
    const s = new Date(p.startDate).getTime()
    const e = new Date(p.startDate)
    e.setDate(e.getDate() + p.durationDays - 1)
    return newStart <= e.getTime() && newEnd.getTime() >= s
  })
}

// ---------- Main page ----------

export default function MealPlanCreatePage() {
  const navigate = useNavigate()
  const today = new Date().toISOString().split('T')[0]

  const [step, setStep] = useState<1 | 2>(1)
  const [startDate, setStartDate] = useState('')
  const [durationDays, setDurationDays] = useState(7)
  const [days, setDays] = useState<DayDraft[]>([])
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [existingPlans, setExistingPlans] = useState<MealPlan[]>([])
  const [createdPlanId, setCreatedPlanId] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    Promise.all([recipesApi.getAll(), mealPlansApi.getAll()])
      .then(([r, p]) => { setRecipes(r); setExistingPlans(p) })
  }, [])

  async function handleConfirm() {
    setError('')
    if (!startDate) { setError('Start date is required.'); return }
    if (startDate < today) { setError('Start date cannot be in the past.'); return }
    if (rangesOverlap(existingPlans.filter(p => p.id !== createdPlanId), startDate, durationDays)) {
      setError('A meal plan already exists for this date range.')
      return
    }
    setConfirming(true)
    try {
      const name = generatePlanName(startDate, durationDays)
      if (createdPlanId === null) {
        const plan = await mealPlansApi.create({ name, startDate, durationDays })
        setCreatedPlanId(plan.id)
      } else {
        await mealPlansApi.update(createdPlanId, { name, startDate, durationDays })
      }
      setDays(makeDays(durationDays))
      setStep(2)
    } catch (e) {
      const msg = e instanceof Error ? e.message : ''
      setError(msg.startsWith('409')
        ? 'A meal plan already exists for this date range.'
        : 'Failed to save plan. Please try again.')
    } finally {
      setConfirming(false)
    }
  }

  function updateSlot(dayIndex: number, key: number, patch: Partial<SlotDraft>) {
    setDays(prev => prev.map(d =>
      d.dayIndex !== dayIndex ? d
        : { ...d, slots: d.slots.map(s => s.key === key ? { ...s, ...patch } : s) }
    ))
  }

  function removeSlot(dayIndex: number, key: number) {
    setDays(prev => prev.map(d =>
      d.dayIndex !== dayIndex ? d : { ...d, slots: d.slots.filter(s => s.key !== key) }
    ))
  }

  function insertSlotAt(dayIndex: number, position: number) {
    const day = days.find(d => d.dayIndex === dayIndex)!
    const used = new Set(day.slots.map(s => s.mealType))
    const mealType = MEAL_TYPES.find(t => !used.has(t)) ?? 'OTHER'
    const slot = makeSlot(mealType)
    setDays(prev => prev.map(d => {
      if (d.dayIndex !== dayIndex) return d
      const slots = [...d.slots]
      slots.splice(position, 0, slot)
      return { ...d, slots }
    }))
  }

  async function handleSubmit() {
    if (!createdPlanId) return
    setSubmitting(true)
    setError('')
    try {
      for (const day of days) {
        for (const slot of day.slots) {
          const entry: Omit<MealPlanEntry, 'id'> = {
            dayIndex: day.dayIndex,
            mealType: slot.mealType,
            ...(slot.mealType === 'OTHER' && { mealName: slot.mealName }),
            slotType: slot.slotType,
            ...(slot.slotType === 'RECIPE' && { recipeSlug: slot.recipeSlug || recipes[0]?.slug, servings: slot.servings }),
            ...(slot.slotType === 'READY_PRODUCT' && { productName: slot.productName, quantity: slot.quantity }),
          }
          await mealPlansApi.addEntry(createdPlanId, entry)
        }
      }
      navigate(`/meal-plan/${createdPlanId}`)
    } catch {
      setError('Failed to save entries. Please try again.')
      setSubmitting(false)
    }
  }

  // --- Step 1 ---
  if (step === 1) {
    return (
      <div>
        <h1>Create New Plan</h1>
        <div className="create-form">
          <label>
            Start date{' '}
            <input
              type="date"
              min={today}
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
            />
          </label>
          <label>
            Duration{' '}
            <select value={durationDays} onChange={e => setDurationDays(+e.target.value)}>
              {[1, 2, 3, 4, 5, 6, 7].map(n => (
                <option key={n} value={n}>{n} day{n > 1 ? 's' : ''}</option>
              ))}
            </select>
          </label>
          {startDate && (
            <p className="plan-preview-name">
              Plan name: <strong>{generatePlanName(startDate, durationDays)}</strong>
            </p>
          )}
          {error && <p className="error-text">{error}</p>}
          <div className="create-form-actions">
            <button className="btn btn--primary" onClick={handleConfirm} disabled={confirming}>
              {confirming ? 'Saving…' : 'Confirm'}
            </button>
            <button className="btn btn--secondary" onClick={() => navigate('/meal-plan')} disabled={confirming}>Cancel</button>
          </div>
        </div>
      </div>
    )
  }

  // --- Step 2 ---
  return (
    <div>
      <h1>Create New Plan</h1>
      <p className="plan-preview-name">
        <strong>{generatePlanName(startDate, durationDays)}</strong>
        {' — '}
        <button className="btn btn--ghost btn--sm" onClick={() => setStep(1)}>← Change dates</button>
      </p>

      {days.map(day => (
        <div key={day.dayIndex} className="create-day-block">
          <h3>Day {day.dayIndex} — {formatDayHeader(startDate, day.dayIndex)}</h3>

          <InsertDivider onClick={() => insertSlotAt(day.dayIndex, 0)} />

          {day.slots.map((slot, idx) => (
            <div key={slot.key}>
              <SlotEditor
                slot={slot}
                recipes={recipes}
                onChange={patch => updateSlot(day.dayIndex, slot.key, patch)}
                onRemove={() => removeSlot(day.dayIndex, slot.key)}
              />
              <InsertDivider onClick={() => insertSlotAt(day.dayIndex, idx + 1)} />
            </div>
          ))}
        </div>
      ))}

      {error && <p className="error-text">{error}</p>}

      <div className="create-form-actions">
        <button className="btn btn--primary" onClick={handleSubmit} disabled={submitting}>
          {submitting ? 'Creating…' : 'Create Plan'}
        </button>
        <button className="btn btn--secondary" onClick={() => navigate('/meal-plan')} disabled={submitting}>Cancel</button>
      </div>
    </div>
  )
}
