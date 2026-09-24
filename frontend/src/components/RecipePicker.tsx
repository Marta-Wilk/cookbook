import { useEffect, useRef, useState } from 'react'
import { Recipe } from '../api/client'
import { AvailableLeftover } from '../utils/leftovers'
import { filterRecipes } from '../utils/recipeFilter'
import './RecipePicker.css'

interface RecipePickerProps {
  recipes: Recipe[]
  leftovers: AvailableLeftover[]
  value: string
  leftoverSlug?: string
  onChange: (slug: string, leftoverSlug?: string, leftoverSourcePlanId?: number) => void
}

export default function RecipePicker({ recipes, leftovers, value, leftoverSlug, onChange }: RecipePickerProps) {
  const [filterQuery, setFilterQuery] = useState<string>(() => {
    if (leftoverSlug) {
      return leftovers.find(l => l.recipeSlug === leftoverSlug)?.recipeName
        ?? recipes.find(r => r.slug === value)?.name
        ?? ''
    }
    return recipes.find(r => r.slug === value)?.name ?? ''
  })
  const [listOpen, setListOpen] = useState(false)
  const hasInteracted = useRef(false)

  useEffect(() => {
    if (!hasInteracted.current) {
      let name: string | undefined
      if (leftoverSlug) {
        name = leftovers.find(l => l.recipeSlug === leftoverSlug)?.recipeName
      }
      if (!name) {
        name = recipes.find(r => r.slug === value)?.name
      }
      if (name) setFilterQuery(name)
    }
  }, [recipes, leftovers, value, leftoverSlug])

  const q = filterQuery.toLowerCase()
  const visibleLeftovers = leftovers.filter(l => l.recipeName.toLowerCase().includes(q))
  const visibleRecipes = filterRecipes(recipes, filterQuery, 'name')
  const noContent = recipes.length === 0 && leftovers.length === 0

  function handleFocus() {
    hasInteracted.current = true
    setFilterQuery('')
    setListOpen(true)
  }

  function handleBlur() {
    setTimeout(() => setListOpen(false), 150)
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    hasInteracted.current = true
    setFilterQuery(e.target.value)
    setListOpen(true)
  }

  function handleSelectLeftover(l: AvailableLeftover) {
    setFilterQuery(l.recipeName)
    setListOpen(false)
    onChange(l.recipeSlug, l.recipeSlug, l.sourcePlanId)
  }

  function handleSelectRecipe(r: Recipe) {
    setFilterQuery(r.name)
    setListOpen(false)
    onChange(r.slug, undefined)
  }

  return (
    <div className="recipe-picker">
      <input
        type="text"
        className="recipe-picker__input"
        placeholder="Search recipe…"
        value={filterQuery}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onChange={handleInputChange}
        aria-label="Filter recipes"
      />
      {noContent ? (
        <p className="recipe-picker__empty">No recipes available</p>
      ) : listOpen && (
        visibleLeftovers.length === 0 && visibleRecipes.length === 0 ? (
          <p className="recipe-picker__empty">No recipes match</p>
        ) : (
          <ul className="recipe-picker__list" role="list">
            {visibleLeftovers.length > 0 && (
              <>
                <li className="recipe-picker__section-header">Leftovers</li>
                {visibleLeftovers.map(l => (
                  <li key={l.recipeSlug}>
                    <button
                      type="button"
                      className={
                        'recipe-picker__item recipe-picker__item--leftover' +
                        (l.recipeSlug === leftoverSlug ? ' recipe-picker__item--selected' : '')
                      }
                      onClick={() => handleSelectLeftover(l)}
                    >
                      {l.recipeName}
                      <span className="recipe-picker__leftover-badge">leftover · {l.servingsRemaining}</span>
                    </button>
                  </li>
                ))}
              </>
            )}
            {visibleLeftovers.length > 0 && visibleRecipes.length > 0 && (
              <li className="recipe-picker__section-header">Recipes</li>
            )}
            {visibleRecipes.map(r => (
              <li key={r.slug}>
                <button
                  type="button"
                  className={
                    'recipe-picker__item' +
                    (r.slug === value && !leftoverSlug ? ' recipe-picker__item--selected' : '')
                  }
                  onClick={() => handleSelectRecipe(r)}
                >
                  {r.name}
                </button>
              </li>
            ))}
          </ul>
        )
      )}
    </div>
  )
}
