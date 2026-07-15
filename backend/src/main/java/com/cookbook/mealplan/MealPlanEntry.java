package com.cookbook.mealplan;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonInclude;
import jakarta.persistence.*;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(
    name = "meal_plan_entries",
    uniqueConstraints = @UniqueConstraint(columnNames = {"meal_plan_id", "day_index", "meal_type"})
)
@JsonInclude(JsonInclude.Include.NON_NULL)
@Getter
@Setter
@NoArgsConstructor
public class MealPlanEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "meal_plan_id", nullable = false)
    @JsonIgnore
    private MealPlan mealPlan;

    @Min(1)
    private int dayIndex;

    @NotNull
    @Enumerated(EnumType.STRING)
    private MealType mealType;

    private String mealName;

    @NotNull
    @Enumerated(EnumType.STRING)
    private SlotType slotType;

    private String recipeSlug;
    private String recipeName;
    private Integer servings;
    private String productName;
    private String quantity;

    public enum MealType {
        BREAKFAST, SECOND_BREAKFAST, LUNCH, DINNER, SNACK, DESSERT, OTHER
    }

    public enum SlotType {
        RECIPE, EAT_OUT, READY_PRODUCT
    }
}
