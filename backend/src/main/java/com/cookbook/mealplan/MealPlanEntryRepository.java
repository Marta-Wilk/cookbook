package com.cookbook.mealplan;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MealPlanEntryRepository extends JpaRepository<MealPlanEntry, Long> {

    void deleteByMealPlanIdAndDayIndexAndMealType(Long mealPlanId, int dayIndex, MealPlanEntry.MealType mealType);

    List<MealPlanEntry> findByLeftoverSourcePlanId(Long sourcePlanId);
}
