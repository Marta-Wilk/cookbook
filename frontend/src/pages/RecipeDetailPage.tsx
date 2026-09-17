import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Recipe, recipesApi } from '../api/client'
import './RecipeDetailPage.css'

export default function RecipeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<Partial<Recipe>>({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    recipesApi.getById(Number(id))
      .then(r => { setRecipe(r); setForm(r) })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  function field(key: keyof Recipe, value: string | number) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function save() {
    setSaving(true)
    setSaveError(null)
    try {
      const updated = await recipesApi.update(Number(id), form)
      setRecipe({ ...updated, content: form.content ?? '' })
      setForm({ ...updated, content: form.content ?? '' })
      setEditing(false)
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  function cancelEdit() {
    setEditing(false)
    setForm(recipe ?? {})
    setSaveError(null)
  }

  if (loading) return <p>Loading…</p>
  if (error) return <p className="error-text">Error: {error}</p>
  if (!recipe) return null

  if (editing) {
    return (
      <div className="recipe-edit-form">
        <Link to="/" className="back-link">← Back to recipes</Link>
        <h1>Edit: {recipe.name}</h1>
        {saveError && <p className="error-text">{saveError}</p>}
        <div className="form-grid">
          <label className="form-label" htmlFor="name">Name</label>
          <input
            id="name"
            className="recipe-edit-input--text"
            value={form.name ?? ''}
            onChange={e => field('name', e.target.value)}
          />

          <label className="form-label" htmlFor="tags">Tags</label>
          <input
            id="tags"
            className="recipe-edit-input--text"
            value={form.tags ?? ''}
            onChange={e => field('tags', e.target.value)}
            placeholder="comma-separated"
          />

          <label className="form-label" htmlFor="servings">Servings</label>
          <input
            id="servings"
            type="number"
            min={1}
            className="recipe-edit-input--short"
            value={form.servings ?? ''}
            onChange={e => field('servings', Number(e.target.value))}
          />

          <label className="form-label" htmlFor="prep">Prep time (min)</label>
          <input
            id="prep"
            type="number"
            min={0}
            className="recipe-edit-input--short"
            value={form.prepTimeMinutes ?? ''}
            onChange={e => field('prepTimeMinutes', Number(e.target.value))}
          />

          <label className="form-label" htmlFor="content">Content</label>
          <textarea
            id="content"
            rows={24}
            className="recipe-edit-textarea"
            value={form.content ?? ''}
            onChange={e => field('content', e.target.value)}
          />
        </div>
        <div className="page-header__actions recipe-edit-actions">
          <button className="btn btn--primary" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button className="btn btn--secondary" onClick={cancelEdit} disabled={saving}>Cancel</button>
        </div>
      </div>
    )
  }

  const metaParts = [
    recipe.servings ? `Serves ${recipe.servings}` : null,
    recipe.prepTimeMinutes ? `${recipe.prepTimeMinutes} min` : null,
  ].filter(Boolean)

  const tags = recipe.tags
    ? recipe.tags.split(',').map(t => t.trim()).filter(Boolean)
    : []

  return (
    <div>
      <Link to="/" className="back-link">← Back to recipes</Link>

      <div className="recipe-header">
        <h1 className="recipe-header__title">{recipe.name}</h1>
        <div className="recipe-header__actions">
          <button className="btn btn--secondary" onClick={() => setEditing(true)}>Edit</button>
          <button
            className="btn btn--danger"
            onClick={async () => {
              if (!confirm(`Delete "${recipe.name}"?`)) return
              await recipesApi.delete(recipe.id)
              navigate('/')
            }}
          >
            Delete
          </button>
        </div>
      </div>

      <div className="meta-row">
        {metaParts.map((part, i) => (
          <span key={i}>
            {i > 0 && <span className="meta-row__sep">·</span>}
            {part}
          </span>
        ))}
        {tags.length > 0 && (
          <>
            {metaParts.length > 0 && <span className="meta-row__sep">·</span>}
            <ul className="tag-list">
              {tags.map(t => <li key={t} className="tag">{t}</li>)}
            </ul>
          </>
        )}
      </div>

      {recipe.content ? (
        <div className="recipe-content">{recipe.content}</div>
      ) : (
        <p className="empty-state">No content.</p>
      )}
    </div>
  )
}
