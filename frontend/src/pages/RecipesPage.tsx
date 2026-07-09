import { useEffect, useState } from 'react'
import { Recipe, recipesApi } from '../api/client'

export default function RecipesPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    recipesApi.getAll()
      .then(setRecipes)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p>Loading recipes…</p>
  if (error) return <p style={{ color: 'red' }}>Error: {error}</p>

  return (
    <div>
      <h1>Recipes</h1>
      {recipes.length === 0 ? (
        <p>No recipes yet. Add your first one!</p>
      ) : (
        <ul>
          {recipes.map(r => (
            <li key={r.id}>
              <strong>{r.name}</strong>
              {r.tags && <span> — {r.tags}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
