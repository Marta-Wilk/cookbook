import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Recipe, recipesApi } from '../api/client'

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
  if (error) return <p style={{ color: 'red' }}>Error: {error}</p>
  if (!recipe) return null

  if (editing) {
    return (
      <div>
        <h1>Edit: {recipe.name}</h1>
        {saveError && <p style={{ color: 'red' }}>{saveError}</p>}
        <table style={{ borderSpacing: '0.5rem 0.75rem' }}>
          <tbody>
            <tr>
              <td><label htmlFor="name">Name</label></td>
              <td>
                <input
                  id="name"
                  value={form.name ?? ''}
                  onChange={e => field('name', e.target.value)}
                  style={{ width: '20rem' }}
                />
              </td>
            </tr>
            <tr>
              <td><label htmlFor="tags">Tags</label></td>
              <td>
                <input
                  id="tags"
                  value={form.tags ?? ''}
                  onChange={e => field('tags', e.target.value)}
                  style={{ width: '20rem' }}
                  placeholder="comma-separated"
                />
              </td>
            </tr>
            <tr>
              <td><label htmlFor="servings">Servings</label></td>
              <td>
                <input
                  id="servings"
                  type="number"
                  min={1}
                  value={form.servings ?? ''}
                  onChange={e => field('servings', Number(e.target.value))}
                  style={{ width: '5rem' }}
                />
              </td>
            </tr>
            <tr>
              <td><label htmlFor="prep">Prep time (min)</label></td>
              <td>
                <input
                  id="prep"
                  type="number"
                  min={0}
                  value={form.prepTimeMinutes ?? ''}
                  onChange={e => field('prepTimeMinutes', Number(e.target.value))}
                  style={{ width: '5rem' }}
                />
              </td>
            </tr>
            <tr>
              <td style={{ verticalAlign: 'top' }}><label htmlFor="content">Content</label></td>
              <td>
                <textarea
                  id="content"
                  rows={24}
                  value={form.content ?? ''}
                  onChange={e => field('content', e.target.value)}
                  style={{ width: '50rem', fontFamily: 'monospace', fontSize: '0.9rem' }}
                />
              </td>
            </tr>
          </tbody>
        </table>
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
          <button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
          <button onClick={cancelEdit} disabled={saving}>Cancel</button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <Link to="/">← Back to recipes</Link>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={() => setEditing(true)}>Edit</button>
          <button
            onClick={async () => {
              if (!confirm(`Delete "${recipe.name}"?`)) return
              await recipesApi.delete(recipe.id)
              navigate('/')
            }}
            style={{ color: 'red' }}
          >
            Delete
          </button>
        </div>
      </div>

      <h1>{recipe.name}</h1>
      <p style={{ color: '#666', margin: '0 0 1rem' }}>
        {[
          recipe.servings && `Serves ${recipe.servings}`,
          recipe.prepTimeMinutes && `${recipe.prepTimeMinutes} min`,
          recipe.tags,
        ].filter(Boolean).join(' · ')}
      </p>

      {recipe.content ? (
        <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', lineHeight: 1.6 }}>
          {recipe.content}
        </pre>
      ) : (
        <p style={{ color: '#999' }}>No content.</p>
      )}
    </div>
  )
}
