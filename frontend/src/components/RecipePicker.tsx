import { useEffect, useRef, useState } from 'react'
import { Recipe } from '../api/client'
import { filterRecipes } from '../utils/recipeFilter'
import './RecipePicker.css'

interface RecipePickerProps {
  recipes: Recipe[]
  value: string
  onChange: (slug: string) => void
}

export default function RecipePicker({ recipes, value, onChange }: RecipePickerProps) {
  const [filterQuery, setFilterQuery] = useState(
    () => recipes.find(r => r.slug === value)?.name ?? ''
  )
  const [listOpen, setListOpen] = useState(false)
  const hasInteracted = useRef(false)

  useEffect(() => {
    if (!hasInteracted.current) {
      const name = recipes.find(r => r.slug === value)?.name
      if (name) setFilterQuery(name)
    }
  }, [recipes, value])

  const visible = filterRecipes(recipes, filterQuery, 'name')

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    hasInteracted.current = true
    setFilterQuery(e.target.value)
    setListOpen(true)
  }

  function handleSelect(r: Recipe) {
    setFilterQuery(r.name)
    setListOpen(false)
    onChange(r.slug)
  }

  return (
    <div className="recipe-picker">
      <input
        type="text"
        className="recipe-picker__input"
        placeholder="Search recipe…"
        value={filterQuery}
        onChange={handleInputChange}
        aria-label="Filter recipes"
      />
      {recipes.length === 0 ? (
        <p className="recipe-picker__empty">No recipes available</p>
      ) : listOpen && (
        visible.length === 0 ? (
          <p className="recipe-picker__empty">No recipes match</p>
        ) : (
          <ul className="recipe-picker__list" role="list">
            {visible.map(r => (
              <li key={r.slug}>
                <button
                  type="button"
                  className={
                    'recipe-picker__item' +
                    (r.slug === value ? ' recipe-picker__item--selected' : '')
                  }
                  onClick={() => handleSelect(r)}
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
