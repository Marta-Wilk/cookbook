import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShoppingList, shoppingListApi } from '../api/client'

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
        <p>No shopping lists yet. Generate one from a meal plan.</p>
      ) : (
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #ccc', textAlign: 'left' }}>
              <th style={{ padding: '0.5rem 1rem 0.5rem 0' }}>Name</th>
              <th style={{ padding: '0.5rem 1rem 0.5rem 0' }}>Created</th>
              <th style={{ padding: '0.5rem 1rem 0.5rem 0' }}>Items</th>
            </tr>
          </thead>
          <tbody>
            {lists.map(list => (
              <tr
                key={list.id}
                onClick={() => navigate(`/shopping-list/${list.id}`)}
                style={{ borderBottom: '1px solid #eee', cursor: 'pointer' }}
              >
                <td style={{ padding: '0.5rem 1rem 0.5rem 0' }}>{list.name}</td>
                <td style={{ padding: '0.5rem 1rem 0.5rem 0', color: '#666' }}>
                  {new Date(list.createdAt).toLocaleDateString()}
                </td>
                <td style={{ padding: '0.5rem 1rem 0.5rem 0', color: '#666' }}>
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
