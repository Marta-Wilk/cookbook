import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { recipesApi } from '../api/client'
import './AddRecipePage.css'

export default function AddRecipePage() {
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [servings, setServings] = useState('')
  const [prepTime, setPrepTime] = useState('')
  const [tags, setTags] = useState('')
  const [ingredients, setIngredients] = useState([''])
  const [steps, setSteps] = useState([''])
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [aiUnavailable, setAiUnavailable] = useState(false)
  const [showImportPanel, setShowImportPanel] = useState(false)
  const [importText, setImportText] = useState('')
  const [importing, setImporting] = useState(false)

  async function handleImport() {
    setImporting(true)
    setError(null)
    try {
      const result = await recipesApi.importFromText({ rawText: importText })
      if (result.stubMode) {
        setAiUnavailable(true)
        setShowImportPanel(false)
        return
      }
      setName(result.name ?? '')
      setServings(result.servings?.toString() ?? '')
      setPrepTime(result.prepTimeMinutes?.toString() ?? '')
      setTags(result.tags ?? '')
      setIngredients(result.ingredients.length > 0 ? result.ingredients : [''])
      setSteps(result.steps.length > 0 ? result.steps : [''])
      setNotes(result.notes ?? '')
      setShowImportPanel(false)
      setImportText('')
    } catch {
      setError('Failed to parse recipe. Please try again.')
    } finally {
      setImporting(false)
    }
  }

  function updateIngredient(index: number, value: string) {
    setIngredients(ingredients.map((v, i) => (i === index ? value : v)))
  }

  function removeIngredient(index: number) {
    setIngredients(ingredients.filter((_, i) => i !== index))
  }

  function updateStep(index: number, value: string) {
    setSteps(steps.map((v, i) => (i === index ? value : v)))
  }

  function removeStep(index: number) {
    setSteps(steps.filter((_, i) => i !== index))
  }

  function buildContent(): string {
    const ingredientLines = ingredients
      .filter(i => i.trim())
      .map(i => `- ${i.trim()}`)
      .join('\n')
    const stepLines = steps
      .filter(s => s.trim())
      .map((s, i) => `${i + 1}. ${s.trim()}`)
      .join('\n')
    let content = `## Ingredients\n\n${ingredientLines}\n\n## Instructions\n\n${stepLines}`
    if (notes.trim()) {
      content += `\n\n## Notes\n\n${notes.trim()}`
    }
    return content
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const recipe = await recipesApi.create({
        name: name.trim(),
        slug: '',
        content: buildContent(),
        tags: tags.trim(),
        servings: Number(servings),
        prepTimeMinutes: prepTime ? Number(prepTime) : 0,
      })
      navigate(`/recipes/${recipe.slug}`)
    } catch (err: unknown) {
      if (err instanceof Error && err.message.startsWith('409')) {
        setError('A recipe with this name already exists. Please choose a different name.')
      } else {
        setError('Failed to save recipe. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const canSubmit =
    name.trim() !== '' &&
    servings !== '' &&
    Number(servings) > 0 &&
    ingredients.some(i => i.trim() !== '') &&
    steps.some(s => s.trim() !== '')

  return (
    <div className="add-recipe-page">
      <Link to="/" className="back-link">← Recipes</Link>
      <h1>Add Recipe</h1>

      <div className="import-btn-wrapper">
        <button
          type="button"
          className="btn btn--primary"
          disabled={aiUnavailable}
          onClick={() => setShowImportPanel(!showImportPanel)}
        >
          Import from text
        </button>
        {aiUnavailable && (
          <span className="import-tooltip">AI unavailable — ANTHROPIC_API_KEY is not configured</span>
        )}
      </div>

      {showImportPanel && (
        <div className="import-panel">
          <span className="import-panel__label">Paste raw recipe text</span>
          <textarea
            className="import-panel__textarea"
            value={importText}
            onChange={e => setImportText(e.target.value)}
            placeholder="Paste any recipe text here — copied from a website, a message, or anywhere else…"
          />
          <div className="import-panel__actions">
            <button
              type="button"
              className="btn btn--primary"
              onClick={handleImport}
              disabled={importing || !importText.trim()}
            >
              {importing ? 'Parsing…' : 'Parse with AI'}
            </button>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => { setShowImportPanel(false); setImportText('') }}
              disabled={importing}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && <p className="error-text">{error}</p>}

      <form onSubmit={handleSubmit} className="add-recipe-form">
        <section className="add-recipe-section">
          <h2>Details</h2>
          <div className="form-grid">
            <label className="form-label" htmlFor="recipe-name">Name *</label>
            <input
              id="recipe-name"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              placeholder="e.g. Tomato Soup"
            />

            <label className="form-label" htmlFor="recipe-servings">Servings *</label>
            <input
              id="recipe-servings"
              type="number"
              min="1"
              value={servings}
              onChange={e => setServings(e.target.value)}
              required
              placeholder="e.g. 4"
            />

            <label className="form-label" htmlFor="recipe-prep-time">Prep time (min)</label>
            <input
              id="recipe-prep-time"
              type="number"
              min="0"
              value={prepTime}
              onChange={e => setPrepTime(e.target.value)}
              placeholder="e.g. 30"
            />

            <label className="form-label" htmlFor="recipe-tags">Tags</label>
            <input
              id="recipe-tags"
              type="text"
              value={tags}
              onChange={e => setTags(e.target.value)}
              placeholder="e.g. soup, vegetarian"
            />
          </div>
        </section>

        <section className="add-recipe-section">
          <h2>Ingredients *</h2>
          <div className="add-recipe-list">
            {ingredients.map((ingredient, index) => (
              <div key={index} className="add-recipe-list__row">
                <input
                  type="text"
                  value={ingredient}
                  onChange={e => updateIngredient(index, e.target.value)}
                  placeholder="e.g. 200 g tomatoes"
                />
                {ingredients.length > 1 && (
                  <button
                    type="button"
                    className="btn btn--ghost"
                    onClick={() => removeIngredient(index)}
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
          <button type="button" className="btn btn--secondary" onClick={() => setIngredients([...ingredients, ''])}>
            + Add ingredient
          </button>
        </section>

        <section className="add-recipe-section">
          <h2>Instructions *</h2>
          <div className="add-recipe-list">
            {steps.map((step, index) => (
              <div key={index} className="add-recipe-list__row">
                <span className="add-recipe-list__step-num">{index + 1}.</span>
                <input
                  type="text"
                  value={step}
                  onChange={e => updateStep(index, e.target.value)}
                  placeholder="Describe this step…"
                />
                {steps.length > 1 && (
                  <button
                    type="button"
                    className="btn btn--ghost"
                    onClick={() => removeStep(index)}
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
          <button type="button" className="btn btn--secondary" onClick={() => setSteps([...steps, ''])}>
            + Add step
          </button>
        </section>

        <section className="add-recipe-section">
          <h2>Notes</h2>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Any additional notes…"
            rows={4}
            className="add-recipe-notes"
          />
        </section>

        <div className="add-recipe-actions">
          <button type="submit" className="btn btn--primary" disabled={!canSubmit || submitting}>
            {submitting ? 'Saving…' : 'Save Recipe'}
          </button>
          <Link to="/" className="btn btn--secondary">Cancel</Link>
        </div>
      </form>
    </div>
  )
}
