import './AboutPage.css'

export default function AboutPage() {
  return (
    <div className="about">
      <h1 className="about__title">About My Cookbook</h1>
      <p className="about__lead">
        A personal kitchen companion for organising recipes, planning meals, and generating shopping lists.
      </p>

      <div className="about__features">
        <div className="about__feature">
          <h3>Recipes</h3>
          <p>Store and manage your recipes in a plain text format that is readable anywhere — no lock-in, no proprietary files.</p>
        </div>
        <div className="about__feature">
          <h3>Meal Planning</h3>
          <p>Plan your meals day by day. Assign recipes, ready-made products, or eating-out slots to each meal of the week.</p>
        </div>
        <div className="about__feature">
          <h3>Shopping Lists</h3>
          <p>Generate a shopping list straight from your meal plan. Ingredients are consolidated, grouped by category, and ready to take to the shop.</p>
        </div>
      </div>
    </div>
  )
}
