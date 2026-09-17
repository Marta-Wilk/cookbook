import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Recipe, recipesApi } from '../api/client'
import './RecipesPage.css'

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
  if (error) return <p className="error-text">Error: {error}</p>

  return (
    <div>
      <h1>Recipes</h1>
      {recipes.length === 0 ? (
        <p className="empty-state">No recipes yet. Add your first one!</p>
      ) : (
        <ul className="recipe-list">
          {recipes.map(r => (
            <li key={r.id}>
              <Link to={`/recipes/${r.id}`} className="recipe-row">
                <span className="recipe-row__name">{r.name}</span>
                <span className="recipe-row__meta">
                  {r.prepTimeMinutes > 0 && (
                    <span className="recipe-row__meta-item">{r.prepTimeMinutes} min</span>
                  )}
                  {r.servings > 0 && (
                    <span className="recipe-row__meta-item">
                      {r.servings} {r.servings === 1 ? 'serving' : 'servings'}
                    </span>
                  )}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
