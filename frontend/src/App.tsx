import { BrowserRouter, Link, Route, Routes } from 'react-router-dom'
import RecipesPage from './pages/RecipesPage'
import MealPlanPage from './pages/MealPlanPage'
import ShoppingListPage from './pages/ShoppingListPage'

export default function App() {
  return (
    <BrowserRouter>
      <nav style={{ display: 'flex', gap: '1rem', padding: '1rem', borderBottom: '1px solid #ccc' }}>
        <Link to="/">Recipes</Link>
        <Link to="/meal-plan">Meal Plan</Link>
        <Link to="/shopping-list">Shopping List</Link>
      </nav>
      <main style={{ padding: '1rem' }}>
        <Routes>
          <Route path="/" element={<RecipesPage />} />
          <Route path="/meal-plan" element={<MealPlanPage />} />
          <Route path="/shopping-list" element={<ShoppingListPage />} />
        </Routes>
      </main>
    </BrowserRouter>
  )
}
