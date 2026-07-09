package com.cookbook.shoppinglist;

import com.cookbook.mealplan.MealPlan;
import com.cookbook.mealplan.MealPlanService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ShoppingListService {

    private final MealPlanService mealPlanService;

    @Value("${ai.anthropic.api-key:stub}")
    private String apiKey;

    public ShoppingListResponse generateForMealPlan(Long mealPlanId) {
        MealPlan plan = mealPlanService.findById(mealPlanId);

        List<String> recipeContents = plan.getEntries().stream()
                .map(e -> e.getRecipe().getContent())
                .toList();

        if ("stub".equals(apiKey)) {
            return stubResponse(plan.getName());
        }

        // TODO: replace with real Anthropic API call (see specifications/features/F003-ai-shopping-list.md)
        return stubResponse(plan.getName());
    }

    private ShoppingListResponse stubResponse(String planName) {
        List<String> items = List.of(
                "400g spaghetti",
                "500g minced beef",
                "2 cans chopped tomatoes",
                "1 onion",
                "3 cloves garlic",
                "olive oil",
                "salt, pepper"
        );
        String grouped = """
                ## Produce
                - 1 onion
                - 3 cloves garlic

                ## Pantry
                - 400g spaghetti
                - 2 cans chopped tomatoes
                - olive oil, salt, pepper

                ## Meat
                - 500g minced beef
                """;
        return new ShoppingListResponse(items, grouped);
    }
}
