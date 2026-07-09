const BASE = '/api'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
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

export interface MealPlan {
  id: number
  name: string
  weekStartDate: string
  entries: MealPlanEntry[]
}

export interface MealPlanEntry {
  id: number
  recipe: Recipe
  dayOfWeek: string
  mealType: 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK'
  servings: number
}

export interface ShoppingListResponse {
  items: string[]
  groupedMarkdown: string
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
  create: (plan: Omit<MealPlan, 'id' | 'entries'>) =>
    request<MealPlan>('/meal-plans', { method: 'POST', body: JSON.stringify(plan) }),
}

export const shoppingListApi = {
  generate: (mealPlanId: number) =>
    request<ShoppingListResponse>(`/shopping-list/generate/${mealPlanId}`, { method: 'POST' }),
}
