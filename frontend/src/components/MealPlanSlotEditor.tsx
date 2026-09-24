import { MEAL_TYPES, Recipe } from '../api/client'
import { AvailableLeftover } from '../utils/leftovers'
import RecipePicker from './RecipePicker'
import './MealPlanSlotEditor.css'

export type SlotType = 'RECIPE' | 'EAT_OUT' | 'READY_PRODUCT'

export type SlotDraft = {
  id?: number
  key: number
  dayIndex: number
  mealType: string
  mealName: string
  slotType: SlotType
  recipeSlug: string
  leftoverSlug?: string
  leftoverSourcePlanId?: number
  servings: number
  productName: string
  quantity: string
}

let _key = 0
export function nextKey() { return ++_key }

export function formatShortDate(isoDate: string, dayOffset = 0): string {
  const d = new Date(isoDate)
  d.setDate(d.getDate() + dayOffset)
  return [String(d.getDate()).padStart(2, '0'), String(d.getMonth() + 1).padStart(2, '0'), d.getFullYear()].join('.')
}

export function generatePlanName(startDate: string, durationDays: number): string {
  if (durationDays <= 1) return formatShortDate(startDate)
  return `${formatShortDate(startDate)} - ${formatShortDate(startDate, durationDays - 1)}`
}

export function formatDayHeader(startDate: string, dayIndex: number): string {
  const d = new Date(startDate)
  d.setDate(d.getDate() + dayIndex - 1)
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

export function sortedDrafts(slots: SlotDraft[]): SlotDraft[] {
  return [...slots].sort((a, b) => {
    const ai = MEAL_TYPES.indexOf(a.mealType as typeof MEAL_TYPES[number])
    const bi = MEAL_TYPES.indexOf(b.mealType as typeof MEAL_TYPES[number])
    return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi)
  })
}

export function SlotEditor({ slot, recipes, leftovers, onChange, onRemove }: {
  slot: SlotDraft
  recipes: Recipe[]
  leftovers: AvailableLeftover[]
  onChange: (patch: Partial<SlotDraft>) => void
  onRemove: () => void
}) {
  return (
    <div className="slot-editor">
      <select value={slot.mealType} onChange={e => onChange({ mealType: e.target.value })}>
        {MEAL_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
      </select>

      {slot.mealType === 'OTHER' && (
        <input
          placeholder="Meal name"
          value={slot.mealName}
          onChange={e => onChange({ mealName: e.target.value })}
          className="slot-editor__input--meal-name"
        />
      )}

      <select value={slot.slotType} onChange={e => {
        const newType = e.target.value as SlotType
        const patch: Partial<SlotDraft> = { slotType: newType }
        if (newType === 'READY_PRODUCT' && !slot.quantity) patch.quantity = '1'
        if (newType !== 'RECIPE') {
          patch.leftoverSlug = undefined
          patch.leftoverSourcePlanId = undefined
        }
        onChange(patch)
      }}>
        <option value="RECIPE">Recipe</option>
        <option value="EAT_OUT">Eat out</option>
        <option value="READY_PRODUCT">Ready product</option>
      </select>

      {slot.slotType === 'RECIPE' && (
        <>
          <div className="slot-editor__recipe-group">
            <RecipePicker
              recipes={recipes}
              leftovers={leftovers}
              value={slot.recipeSlug}
              leftoverSlug={slot.leftoverSlug}
              onChange={(slug, leftoverSlug, leftoverSourcePlanId) => onChange({ recipeSlug: slug, leftoverSlug, leftoverSourcePlanId })}
            />
            {slot.leftoverSlug && <span className="leftover-chip">leftover</span>}
          </div>
          <label className="slot-editor__servings-label">
            Servings
            <input
              type="number" min={1} value={slot.servings}
              onChange={e => onChange({ servings: +e.target.value })}
              className="slot-editor__input--servings"
            />
          </label>
        </>
      )}

      {slot.slotType === 'READY_PRODUCT' && (
        <>
          <input
            placeholder="Product name"
            value={slot.productName}
            onChange={e => onChange({ productName: e.target.value })}
            className="slot-editor__input--product-name"
          />
          <input
            placeholder="Quantity"
            value={slot.quantity}
            onChange={e => onChange({ quantity: e.target.value })}
            className="slot-editor__input--quantity"
          />
        </>
      )}

      <button className="btn btn--ghost slot-editor__remove" onClick={onRemove} title="Remove slot">×</button>
    </div>
  )
}

export function InsertDivider({ onClick }: { onClick: () => void }) {
  return (
    <div className="insert-divider">
      <hr className="insert-divider__line" />
      <button
        className="btn btn--ghost insert-divider__btn"
        onClick={onClick}
        title="Add slot here"
      >
        + add slot
      </button>
      <hr className="insert-divider__line" />
    </div>
  )
}
