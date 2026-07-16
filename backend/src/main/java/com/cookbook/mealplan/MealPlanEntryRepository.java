package com.cookbook.mealplan;

import org.springframework.data.jpa.repository.JpaRepository;

public interface MealPlanEntryRepository extends JpaRepository<MealPlanEntry, Long> {

    boolean existsByMealPlanIdAndDayIndexAndMealType(Long mealPlanId, int dayIndex, MealPlanEntry.MealType mealType);
}
