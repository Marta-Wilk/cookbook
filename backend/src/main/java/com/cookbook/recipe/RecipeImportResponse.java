package com.cookbook.recipe;

import java.util.List;

public record RecipeImportResponse(
        String name,
        Integer servings,
        Integer prepTimeMinutes,
        String tags,
        List<String> ingredients,
        List<String> steps,
        String notes,
        boolean stubMode
) {}
