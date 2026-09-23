import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MealPlan, mealPlansApi } from '../api/client'
import ConfirmModal from '../components/ConfirmModal'
import './MealPlanListPage.css'

export default function MealPlanListPage() {
  const [plans, setPlans] = useState<MealPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [pendingDelete, setPendingDelete] = useState<MealPlan | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    mealPlansApi.getAll()
      .then(data => setPlans([...data].sort((a, b) => a.name.localeCompare(b.name))))
      .finally(() => setLoading(false))
  }, [])

  async function handleDelete(plan: MealPlan) {
    await mealPlansApi.delete(plan.id)
    setPlans(prev => prev.filter(p => p.id !== plan.id))
    setPendingDelete(null)
  }

  if (loading) return <p>Loading…</p>

  return (
    <div>
      <div className="page-header">
        <h1 className="page-header__title">Meal Plans</h1>
        <div className="page-header__actions">
          <button className="btn btn--primary" onClick={() => navigate('/meal-plan/new')}>
            Create New Plan
          </button>
        </div>
      </div>

      {plans.length === 0 ? (
        <p className="empty-state">No meal plans yet.</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {plans.map(plan => (
              <tr key={plan.id}>
                <td className="list-item-name">{plan.name}</td>
                <td>
                  <div className="page-header__actions plan-row-actions">
                    <button className="btn btn--secondary" onClick={() => navigate(`/meal-plan/${plan.id}`)}>Open</button>
                    <button className="btn btn--secondary" onClick={() => navigate(`/meal-plan/${plan.id}/edit`)}>Edit</button>
                    <button className="btn btn--danger" onClick={() => setPendingDelete(plan)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {pendingDelete && (
        <ConfirmModal
          title={`Delete "${pendingDelete.name}"?`}
          message="This will permanently remove the meal plan and cannot be undone."
          confirmLabel="Delete"
          onConfirm={() => handleDelete(pendingDelete)}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  )
}
