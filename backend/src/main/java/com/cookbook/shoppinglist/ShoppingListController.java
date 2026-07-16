package com.cookbook.shoppinglist;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/shopping-lists")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173")
public class ShoppingListController {

    private final ShoppingListService service;

    @PostMapping("/generate/{mealPlanId}")
    public ResponseEntity<ShoppingList> generate(@PathVariable Long mealPlanId) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.generateForMealPlan(mealPlanId));
    }

    @GetMapping
    public List<ShoppingList> getAll() {
        return service.findAll();
    }

    @GetMapping("/{id}")
    public ShoppingList getById(@PathVariable Long id) {
        return service.findById(id);
    }

    @PatchMapping("/{id}/items/{itemId}")
    public ShoppingListItem toggleOwned(@PathVariable Long id, @PathVariable Long itemId) {
        return service.toggleOwned(id, itemId);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
