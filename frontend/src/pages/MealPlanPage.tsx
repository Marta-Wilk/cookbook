import { useEffect, useState } from 'react'
import { MealPlan, mealPlansApi } from '../api/client'

const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']
const MEALS = ['BREAKFAST', 'LUNCH', 'DINNER']

export default function MealPlanPage() {
  const [plans, setPlans] = useState<MealPlan[]>([])
  const [selected, setSelected] = useState<MealPlan | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    mealPlansApi.getAll()
      .then(data => {
        setPlans(data)
        if (data.length > 0) setSelected(data[0])
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p>Loading meal plans…</p>

  return (
    <div>
      <h1>Meal Plan</h1>

      {plans.length === 0 ? (
        <p>No meal plans yet.</p>
      ) : (
        <>
          <select onChange={e => setSelected(plans.find(p => p.id === +e.target.value) ?? null)}>
            {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>

          {selected && (
            <table style={{ marginTop: '1rem', borderCollapse: 'collapse', width: '100%' }}>
              <thead>
                <tr>
                  <th></th>
                  {DAYS.map(d => <th key={d}>{d.slice(0, 3)}</th>)}
                </tr>
              </thead>
              <tbody>
                {MEALS.map(meal => (
                  <tr key={meal}>
                    <td><strong>{meal}</strong></td>
                    {DAYS.map(day => {
                      const entry = selected.entries.find(
                        e => e.dayOfWeek === day && e.mealType === meal
                      )
                      return (
                        <td key={day} style={{ border: '1px solid #ccc', padding: '0.5rem', minWidth: '80px' }}>
                          {entry?.recipe.name ?? '—'}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  )
}
