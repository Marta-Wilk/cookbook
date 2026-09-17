import { BrowserRouter, Link, Route, Routes } from 'react-router-dom'
import RecipesPage from './pages/RecipesPage'
import RecipeDetailPage from './pages/RecipeDetailPage'
import MealPlanListPage from './pages/MealPlanListPage'
import MealPlanCreatePage from './pages/MealPlanCreatePage'
import MealPlanDetailPage from './pages/MealPlanDetailPage'
import ShoppingListPage from './pages/ShoppingListPage'
import ShoppingListDetailPage from './pages/ShoppingListDetailPage'
import AboutPage from './pages/AboutPage'

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <nav className="nav">
          <Link to="/" className="nav__brand">My Cookbook</Link>
          <ul className="nav__links">
            <li><Link to="/" className="nav__link">Recipes</Link></li>
            <li><Link to="/meal-plan" className="nav__link">Meal Plans</Link></li>
            <li><Link to="/shopping-list" className="nav__link">Shopping List</Link></li>
          </ul>
        </nav>
        <main className="page">
          <Routes>
            <Route path="/" element={<RecipesPage />} />
            <Route path="/recipes/:id" element={<RecipeDetailPage />} />
            <Route path="/meal-plan" element={<MealPlanListPage />} />
            <Route path="/meal-plan/new" element={<MealPlanCreatePage />} />
            <Route path="/meal-plan/:id" element={<MealPlanDetailPage />} />
            <Route path="/meal-plan/:id/edit" element={<MealPlanDetailPage editMode />} />
            <Route path="/shopping-list" element={<ShoppingListPage />} />
            <Route path="/shopping-list/:id" element={<ShoppingListDetailPage />} />
            <Route path="/about" element={<AboutPage />} />
          </Routes>
        </main>
        <footer className="footer">
          <span className="footer__copy">© My Cookbook</span>
          <span className="footer__sep">·</span>
          <Link to="/about" className="footer__link">About</Link>
          <span className="footer__disclosure">Generated with AI, guided by humans.</span>
        </footer>
      </div>
    </BrowserRouter>
  )
}
