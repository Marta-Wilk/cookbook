package com.cookbook.mealplan;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@RequiredArgsConstructor
public class MealPlanService {

    private final MealPlanRepository repository;

    public List<MealPlan> findAll() {
        return repository.findAll();
    }

    public MealPlan findById(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Meal plan not found: " + id));
    }

    public MealPlan create(MealPlan mealPlan) {
        return repository.save(mealPlan);
    }

    public MealPlan update(Long id, MealPlan patch) {
        MealPlan existing = findById(id);
        existing.setName(patch.getName());
        existing.setWeekStartDate(patch.getWeekStartDate());
        return repository.save(existing);
    }

    public void delete(Long id) {
        findById(id);
        repository.deleteById(id);
    }
}
