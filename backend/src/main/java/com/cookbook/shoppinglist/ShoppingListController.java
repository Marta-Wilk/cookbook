package com.cookbook.shoppinglist;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/shopping-list")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173")
public class ShoppingListController {

    private final ShoppingListService service;

    @PostMapping("/generate/{mealPlanId}")
    public ShoppingListResponse generate(@PathVariable Long mealPlanId) {
        return service.generateForMealPlan(mealPlanId);
    }
}
