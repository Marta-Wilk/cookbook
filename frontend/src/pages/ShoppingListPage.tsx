import { useEffect, useState } from 'react'
import { MealPlan, ShoppingListResponse, mealPlansApi, shoppingListApi } from '../api/client'

export default function ShoppingListPage() {
  const [plans, setPlans] = useState<MealPlan[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [result, setResult] = useState<ShoppingListResponse | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    mealPlansApi.getAll().then(data => {
      setPlans(data)
      if (data.length > 0) setSelectedId(data[0].id)
    })
  }, [])

  const generate = async () => {
    if (!selectedId) return
    setLoading(true)
    setResult(null)
    try {
      setResult(await shoppingListApi.generate(selectedId))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h1>Shopping List</h1>
      <p>Select a meal plan and let AI generate a consolidated shopping list.</p>

      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
        <select
          value={selectedId ?? ''}
          onChange={e => setSelectedId(+e.target.value)}
          disabled={plans.length === 0}
        >
          {plans.length === 0
            ? <option>No meal plans available</option>
            : plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)
          }
        </select>
        <button onClick={generate} disabled={!selectedId || loading}>
          {loading ? 'Generating…' : 'Generate with AI'}
        </button>
      </div>

      {result && (
        <div>
          <h2>Shopping List</h2>
          <ul>
            {result.items.map((item, i) => <li key={i}>{item}</li>)}
          </ul>
          <h3>Grouped by category</h3>
          <pre style={{ background: '#f5f5f5', padding: '1rem' }}>{result.groupedMarkdown}</pre>
        </div>
      )}
    </div>
  )
}
