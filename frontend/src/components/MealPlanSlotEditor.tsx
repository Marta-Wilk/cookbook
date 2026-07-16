import { MEAL_TYPES, Recipe } from '../api/client'

export type SlotType = 'RECIPE' | 'EAT_OUT' | 'READY_PRODUCT'

export type SlotDraft = {
  id?: number
  key: number
  dayIndex: number
  mealType: string
  mealName: string
  slotType: SlotType
  recipeSlug: string
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

export function SlotEditor({ slot, recipes, onChange, onRemove }: {
  slot: SlotDraft
  recipes: Recipe[]
  onChange: (patch: Partial<SlotDraft>) => void
  onRemove: () => void
}) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center', padding: '0.4rem 0.6rem', border: '1px solid #ddd', borderRadius: '4px', background: '#fafafa' }}>
      <select value={slot.mealType} onChange={e => onChange({ mealType: e.target.value })}>
        {MEAL_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
      </select>

      {slot.mealType === 'OTHER' && (
        <input
          placeholder="Meal name"
          value={slot.mealName}
          onChange={e => onChange({ mealName: e.target.value })}
          style={{ width: '120px' }}
        />
      )}

      <select value={slot.slotType} onChange={e => {
        const newType = e.target.value as SlotType
        const patch: Partial<SlotDraft> = { slotType: newType }
        if (newType === 'READY_PRODUCT' && !slot.quantity) patch.quantity = '1'
        onChange(patch)
      }}>
        <option value="RECIPE">Recipe</option>
        <option value="EAT_OUT">Eat out</option>
        <option value="READY_PRODUCT">Ready product</option>
      </select>

      {slot.slotType === 'RECIPE' && (
        <>
          <select
            value={slot.recipeSlug || recipes[0]?.slug || ''}
            onChange={e => onChange({ recipeSlug: e.target.value })}
          >
            {recipes.length === 0
              ? <option value="">No recipes available</option>
              : recipes.map(r => <option key={r.slug} value={r.slug}>{r.name}</option>)
            }
          </select>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            Servings
            <input
              type="number" min={1} value={slot.servings}
              onChange={e => onChange({ servings: +e.target.value })}
              style={{ width: '4rem' }}
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
            style={{ width: '130px' }}
          />
          <input
            placeholder="Quantity"
            value={slot.quantity}
            onChange={e => onChange({ quantity: e.target.value })}
            style={{ width: '90px' }}
          />
        </>
      )}

      <button onClick={onRemove} title="Remove slot" style={{ marginLeft: 'auto' }}>×</button>
    </div>
  )
}

export function InsertDivider({ onClick }: { onClick: () => void }) {
  return (
    <div style={{ textAlign: 'center', margin: '2px 0' }}>
      <button
        onClick={onClick}
        title="Add slot here"
        style={{ fontSize: '0.7rem', padding: '0 6px', opacity: 0.5, border: '1px dashed #aaa', background: 'none', cursor: 'pointer' }}
      >
        + add slot here
      </button>
    </div>
  )
}
