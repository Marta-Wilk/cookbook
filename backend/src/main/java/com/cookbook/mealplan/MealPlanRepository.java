package com.cookbook.mealplan;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface MealPlanRepository extends JpaRepository<MealPlan, Long> {

    List<MealPlan> findByWeekStartDateBetween(LocalDate from, LocalDate to);
}
