import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Recipe, recipesApi } from '../api/client'
import { filterRecipes } from '../utils/recipeFilter'
import './RecipesPage.css'

export default function RecipesPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchMode, setSearchMode] = useState<'name' | 'tag'>('name')

  useEffect(() => {
    recipesApi.getAll()
      .then(setRecipes)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const filteredRecipes = filterRecipes(recipes, searchQuery, searchMode)

  if (loading) return <p>Loading recipes…</p>
  if (error) return <p className="error-text">Error: {error}</p>

  return (
    <div>
      <div className="recipes-page-header">
        <h1>Recipes</h1>
        <div className="recipes-page-header__right">
          {recipes.length > 0 && (
          <div className="recipe-search">
            <div className="recipe-search__modes">
              <label className="recipe-search__mode-label">
                <input
                  type="radio"
                  name="search-mode"
                  value="name"
                  checked={searchMode === 'name'}
                  onChange={() => setSearchMode('name')}
                />
                By name
              </label>
              <label className="recipe-search__mode-label">
                <input
                  type="radio"
                  name="search-mode"
                  value="tag"
                  checked={searchMode === 'tag'}
                  onChange={() => setSearchMode('tag')}
                />
                By tag
              </label>
            </div>
            <input
              type="text"
              className="recipe-search__input"
              placeholder={searchMode === 'name' ? 'Search by name…' : 'Search by tag…'}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Escape' && setSearchQuery('')}
              aria-label="Search recipes"
            />
          </div>
          )}
          <Link to="/recipes/new" className="btn btn--primary">+ Add Recipe</Link>
        </div>
      </div>

      {recipes.length === 0 ? (
        <p className="empty-state">No recipes yet. Add your first one!</p>
      ) : filteredRecipes.length === 0 ? (
        <p className="empty-state">No recipes match your search.</p>
      ) : (
        <ul className="recipe-list">
          {filteredRecipes.map(r => (
            <li key={r.slug}>
              <Link to={`/recipes/${r.slug}`} className="recipe-row">
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
