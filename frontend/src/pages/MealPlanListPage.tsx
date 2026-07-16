import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MealPlan, mealPlansApi } from '../api/client'

export default function MealPlanListPage() {
  const [plans, setPlans] = useState<MealPlan[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    mealPlansApi.getAll()
      .then(data => setPlans([...data].sort((a, b) => a.name.localeCompare(b.name))))
      .finally(() => setLoading(false))
  }, [])

  async function handleDelete(plan: MealPlan) {
    if (!window.confirm('Are you sure you want to remove this plan? This operation cannot be undone.')) return
    await mealPlansApi.delete(plan.id)
    setPlans(prev => prev.filter(p => p.id !== plan.id))
  }

  if (loading) return <p>Loading…</p>

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <h1 style={{ margin: 0 }}>Meal Plans</h1>
        <button onClick={() => navigate('/meal-plan/new')}>Create New Plan</button>
      </div>

      {plans.length === 0 ? (
        <p>No meal plans yet.</p>
      ) : (
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '0.5rem 1rem 0.5rem 0', borderBottom: '2px solid #ccc' }}>
                Name
              </th>
              <th style={{ padding: '0.5rem 0', borderBottom: '2px solid #ccc' }}></th>
            </tr>
          </thead>
          <tbody>
            {plans.map(plan => (
              <tr key={plan.id}>
                <td style={{ padding: '0.5rem 1rem 0.5rem 0', borderBottom: '1px solid #eee' }}>
                  {plan.name}
                </td>
                <td style={{ padding: '0.5rem 0', borderBottom: '1px solid #eee' }}>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => navigate(`/meal-plan/${plan.id}`)}>Open</button>
                    <button onClick={() => navigate(`/meal-plan/${plan.id}/edit`)}>Edit</button>
                    <button onClick={() => handleDelete(plan)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
