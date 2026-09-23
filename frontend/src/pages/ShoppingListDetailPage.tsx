import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ShoppingList, ShoppingListItem, shoppingListApi } from '../api/client'
import './ShoppingListDetailPage.css'

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
      <div className="page-header">
        <h1 className="page-header__title">Shopping List — {list.name}</h1>
        <div className="page-header__actions">
          <button className="btn btn--secondary" onClick={() => navigate('/shopping-list')}>← Back</button>
          <button className="btn btn--primary" onClick={handleSave} disabled={saving || !isDirty}>
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button className="btn btn--secondary" onClick={() => window.print()}>Print</button>
          <button className="btn btn--danger" onClick={handleDelete} disabled={deleting}>
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>

      {list.stubMode && (
        <div className="alert alert--warning">
          <strong>AI generation unavailable</strong> — Anthropic API key is not configured.
          {' '}This list was built directly from your plan entries without AI processing: ingredients may be
          duplicated across recipes, quantities are not summed, and items are not grouped by category.
        </div>
      )}

      {items.length === 0 ? (
        <p className="empty-state">No items in this shopping list.</p>
      ) : (
        sortedCategories.map(category => (
          <div key={category} className="category-section">
            <h3 className="category-title">{category}</h3>
            <ul className="checklist">
              {groups[category].map(({ item, index }) => (
                <li key={item.id} className="checklist-item">
                  <input
                    type="checkbox"
                    checked={item.ownedLocal}
                    onChange={() => toggleOwned(index)}
                  />
                  <span className={`checklist-item__text${item.ownedLocal ? ' checklist-item__text--owned' : ''}`}>
                    {item.ingredient}
                    {item.quantity && (
                      <span className={`checklist-item__qty${item.ownedLocal ? ' checklist-item__qty--owned' : ''}`}>
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
