import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShoppingList, shoppingListApi } from '../api/client'
import './ShoppingListPage.css'

export default function ShoppingListPage() {
  const navigate = useNavigate()
  const [lists, setLists] = useState<ShoppingList[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    shoppingListApi.getAll()
      .then(setLists)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p>Loading…</p>

  return (
    <div>
      <h1>Shopping Lists</h1>

      {lists.length === 0 ? (
        <p className="empty-state">No shopping lists yet. Generate one from a meal plan.</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Created</th>
              <th>Items</th>
            </tr>
          </thead>
          <tbody>
            {lists.map(list => (
              <tr
                key={list.id}
                className="shopping-list-row"
                onClick={() => navigate(`/shopping-list/${list.id}`)}
              >
                <td className="list-item-name">{list.name}</td>
                <td className="shopping-list-meta">
                  {new Date(list.createdAt).toLocaleDateString()}
                </td>
                <td className="shopping-list-meta">
                  {list.items.length}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
