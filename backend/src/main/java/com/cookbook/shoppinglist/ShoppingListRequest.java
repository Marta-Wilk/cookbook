package com.cookbook.shoppinglist;

import java.util.List;

public record ShoppingListRequest(
        Long mealPlanId,
        List<String> recipeContents
) {}
