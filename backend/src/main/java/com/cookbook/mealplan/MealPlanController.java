package com.cookbook.mealplan;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/meal-plans")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173")
public class MealPlanController {

    private final MealPlanService service;

    @GetMapping
    public List<MealPlan> getAll() {
        return service.findAll();
    }

    @GetMapping("/{id}")
    public MealPlan getById(@PathVariable Long id) {
        return service.findById(id);
    }

    @PostMapping
    public ResponseEntity<MealPlan> create(@Valid @RequestBody MealPlan mealPlan) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(mealPlan));
    }

    @PutMapping("/{id}")
    public MealPlan update(@PathVariable Long id, @Valid @RequestBody MealPlan mealPlan) {
        return service.update(id, mealPlan);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
