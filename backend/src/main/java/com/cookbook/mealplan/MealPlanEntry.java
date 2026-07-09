package com.cookbook.mealplan;

import com.cookbook.recipe.Recipe;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.DayOfWeek;

@Entity
@Table(name = "meal_plan_entries")
@Getter
@Setter
@NoArgsConstructor
public class MealPlanEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "meal_plan_id", nullable = false)
    private MealPlan mealPlan;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "recipe_id", nullable = false)
    private Recipe recipe;

    @NotNull
    @Enumerated(EnumType.STRING)
    private DayOfWeek dayOfWeek;

    @NotNull
    @Enumerated(EnumType.STRING)
    private MealType mealType;

    private int servings = 1;

    public enum MealType {
        BREAKFAST, LUNCH, DINNER, SNACK
    }
}
