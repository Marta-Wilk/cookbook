import { BrowserRouter, Link, Route, Routes } from 'react-router-dom'
import RecipesPage from './pages/RecipesPage'
import RecipeDetailPage from './pages/RecipeDetailPage'
import MealPlanListPage from './pages/MealPlanListPage'
import MealPlanCreatePage from './pages/MealPlanCreatePage'
import MealPlanDetailPage from './pages/MealPlanDetailPage'
import ShoppingListPage from './pages/ShoppingListPage'

export default function App() {
  return (
    <BrowserRouter>
      <nav style={{ display: 'flex', gap: '1rem', padding: '1rem', borderBottom: '1px solid #ccc' }}>
        <Link to="/">Recipes</Link>
        <Link to="/meal-plan">Meal Plans</Link>
        <Link to="/shopping-list">Shopping List</Link>
      </nav>
      <main style={{ padding: '1rem' }}>
        <Routes>
          <Route path="/" element={<RecipesPage />} />
          <Route path="/recipes/:id" element={<RecipeDetailPage />} />
          <Route path="/meal-plan" element={<MealPlanListPage />} />
          <Route path="/meal-plan/new" element={<MealPlanCreatePage />} />
          <Route path="/meal-plan/:id" element={<MealPlanDetailPage />} />
          <Route path="/meal-plan/:id/edit" element={<MealPlanDetailPage editMode />} />
          <Route path="/shopping-list" element={<ShoppingListPage />} />
        </Routes>
      </main>
    </BrowserRouter>
  )
}
