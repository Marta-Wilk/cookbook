const BASE = '/api'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export interface Recipe {
  id: number
  name: string
  slug: string
  content: string
  tags: string
  servings: number
  prepTimeMinutes: number
}

export const MEAL_TYPES = ['BREAKFAST', 'SECOND_BREAKFAST', 'LUNCH', 'DINNER', 'SNACK', 'DESSERT', 'OTHER'] as const

export interface MealPlan {
  id: number
  name: string
  startDate: string
  durationDays: number
  entries: MealPlanEntry[]
}

export interface MealPlanEntry {
  id: number
  dayIndex: number
  mealType: string
  mealName?: string
  slotType: 'RECIPE' | 'EAT_OUT' | 'READY_PRODUCT'
  recipeSlug?: string
  recipeName?: string
  servings?: number
  productName?: string
  quantity?: string
}

export interface ShoppingListItem {
  id: number
  ingredient: string
  quantity: string | null
  category: string | null
  owned: boolean
  sortOrder: number
}

export interface ShoppingList {
  id: number
  name: string
  mealPlanId: number
  stubMode: boolean
  createdAt: string
  items: ShoppingListItem[]
}

export const recipesApi = {
  getAll: () => request<Recipe[]>('/recipes'),
  getById: (id: number) => request<Recipe>(`/recipes/${id}`),
  create: (recipe: Omit<Recipe, 'id'>) =>
    request<Recipe>('/recipes', { method: 'POST', body: JSON.stringify(recipe) }),
  update: (id: number, recipe: Partial<Recipe>) =>
    request<Recipe>(`/recipes/${id}`, { method: 'PUT', body: JSON.stringify(recipe) }),
  delete: (id: number) => request<void>(`/recipes/${id}`, { method: 'DELETE' }),
}

export const mealPlansApi = {
  getAll: () => request<MealPlan[]>('/meal-plans'),
  getById: (id: number) => request<MealPlan>(`/meal-plans/${id}`),
  create: (plan: { name: string; startDate: string; durationDays: number }) =>
    request<MealPlan>('/meal-plans', { method: 'POST', body: JSON.stringify(plan) }),
  update: (id: number, plan: { name: string; startDate: string; durationDays: number }) =>
    request<MealPlan>(`/meal-plans/${id}`, { method: 'PUT', body: JSON.stringify(plan) }),
  delete: (id: number) =>
    request<void>(`/meal-plans/${id}`, { method: 'DELETE' }),
  addEntry: (planId: number, entry: Omit<MealPlanEntry, 'id'>) =>
    request<MealPlanEntry>(`/meal-plans/${planId}/entries`, { method: 'POST', body: JSON.stringify(entry) }),
  deleteEntry: (planId: number, entryId: number) =>
    request<void>(`/meal-plans/${planId}/entries/${entryId}`, { method: 'DELETE' }),
}

export const shoppingListApi = {
  generate: (mealPlanId: number) =>
    request<ShoppingList | undefined>(`/shopping-lists/generate/${mealPlanId}`, { method: 'POST' }),
  getAll: () => request<ShoppingList[]>('/shopping-lists'),
  getById: (id: number) => request<ShoppingList>(`/shopping-lists/${id}`),
  toggleOwned: (listId: number, itemId: number) =>
    request<ShoppingListItem>(`/shopping-lists/${listId}/items/${itemId}`, { method: 'PATCH' }),
  delete: (id: number) => request<void>(`/shopping-lists/${id}`, { method: 'DELETE' }),
}
