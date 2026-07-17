import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ShoppingList, ShoppingListItem, shoppingListApi } from '../api/client'

interface LocalItem extends ShoppingListItem {
  ownedLocal: boolean
}

const CATEGORY_ORDER = ['Produce', 'Meat & Fish', 'Dairy', 'Pantry', 'Frozen', 'Other']

export default function ShoppingListDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [list, setList] = useState<ShoppingList | null>(null)
  const [items, setItems] = useState<LocalItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!id) return
    shoppingListApi.getById(+id)
      .then(data => {
        setList(data)
        setItems(data.items.map(item => ({ ...item, ownedLocal: item.owned })))
      })
      .catch(() => navigate('/shopping-list'))
      .finally(() => setLoading(false))
  }, [id])

  function toggleOwned(index: number) {
    setItems(prev => prev.map((it, i) => i === index ? { ...it, ownedLocal: !it.ownedLocal } : it))
  }

  async function handleSave() {
    if (!list) return
    const dirty = items.filter(it => it.ownedLocal !== it.owned)
    if (dirty.length === 0) return
    setSaving(true)
    try {
      const updated = await Promise.all(dirty.map(it => shoppingListApi.toggleOwned(list.id, it.id)))
      const updatedMap = new Map(updated.map(it => [it.id, it]))
      setItems(prev => prev.map(it => {
        const server = updatedMap.get(it.id)
        return server ? { ...it, owned: server.owned, ownedLocal: server.owned } : it
      }))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!list) return
    setDeleting(true)
    try {
      await shoppingListApi.delete(list.id)
      navigate('/shopping-list')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) return <p>Loading…</p>
  if (!list) return null

  const isDirty = items.some(it => it.ownedLocal !== it.owned)

  const groups = items.reduce<Record<string, { item: LocalItem; index: number }[]>>((acc, item, i) => {
    const cat = item.category ?? 'Other'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push({ item, index: i })
    return acc
  }, {})

  const sortedCategories = [
    ...CATEGORY_ORDER.filter(c => groups[c]),
    ...Object.keys(groups).filter(c => !CATEGORY_ORDER.includes(c)),
  ]

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <h1 style={{ margin: 0 }}>Shopping List — {list.name}</h1>
        <button onClick={() => navigate('/shopping-list')}>← Back to lists</button>
        <button onClick={handleSave} disabled={saving || !isDirty}>
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button onClick={handleDelete} disabled={deleting}>{deleting ? 'Deleting…' : 'Delete'}</button>
      </div>

      {list.stubMode && (
        <div style={{
          background: '#fff8e1',
          border: '1px solid #ffe082',
          borderRadius: '4px',
          padding: '0.75rem 1rem',
          marginBottom: '1.25rem',
          color: '#5f4400',
        }}>
          <strong>AI generation unavailable</strong> — Anthropic API key is not configured.
          {' '}This list was built directly from your plan entries without AI processing: ingredients may be
          duplicated across recipes, quantities are not summed, and items are not grouped by category.
        </div>
      )}

      {items.length === 0 ? (
        <p>No items in this shopping list.</p>
      ) : (
        sortedCategories.map(category => (
          <div key={category} style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ margin: '0 0 0.5rem', borderBottom: '1px solid #ddd', paddingBottom: '0.25rem' }}>
              {category}
            </h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {groups[category].map(({ item, index }) => (
                <li
                  key={item.id}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}
                >
                  <input
                    type="checkbox"
                    checked={item.ownedLocal}
                    onChange={() => toggleOwned(index)}
                  />
                  <span style={{
                    textDecoration: item.ownedLocal ? 'line-through' : 'none',
                    color: item.ownedLocal ? '#999' : 'inherit',
                  }}>
                    {item.ingredient}
                    {item.quantity && (
                      <span style={{ color: item.ownedLocal ? '#bbb' : '#666', marginLeft: '0.5rem' }}>
                        {item.quantity}
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))
      )}
    </div>
  )
}
