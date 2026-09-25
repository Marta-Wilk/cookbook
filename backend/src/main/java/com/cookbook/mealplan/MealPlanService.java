package com.cookbook.mealplan;

import com.cookbook.leftover.LeftoverService;
import com.cookbook.recipe.RecipeRepository;
import com.cookbook.shoppinglist.ShoppingListRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MealPlanService {

    private final MealPlanRepository repository;
    private final MealPlanEntryRepository entryRepository;
    private final RecipeRepository recipeRepository;
    private final LeftoverService leftoverService;
    private final ShoppingListRepository shoppingListRepository;

    public List<MealPlan> findAll() {
        return repository.findAll();
    }

    public MealPlan findById(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Meal plan not found: " + id));
    }

    public MealPlan create(MealPlan mealPlan) {
        validateDurationDays(mealPlan.getDurationDays());
        validateNoOverlap(mealPlan.getStartDate(), mealPlan.getDurationDays(), null);
        return repository.save(mealPlan);
    }

    public MealPlan update(Long id, MealPlan patch) {
        validateDurationDays(patch.getDurationDays());
        MealPlan existing = findById(id);
        validateNoOverlap(patch.getStartDate(), patch.getDurationDays(), id);
        existing.setName(patch.getName());
        existing.setStartDate(patch.getStartDate());
        existing.setDurationDays(patch.getDurationDays());
        MealPlan saved = repository.save(existing);
        deprecateShoppingList(id, "DEPRECATED_PLAN_EDITED");
        return saved;
    }

    @Transactional
    public void delete(Long id) {
        findById(id);
        List<MealPlanEntry> dependents = entryRepository.findByLeftoverSourcePlanId(id);
        if (!dependents.isEmpty()) {
            String planNames = dependents.stream()
                    .map(e -> e.getMealPlan().getName())
                    .distinct()
                    .sorted()
                    .collect(Collectors.joining(", "));
            boolean multiple = planNames.contains(",");
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "This plan cannot be deleted because its leftovers are planned as meals in: " + planNames + ". " +
                    "Open " + (multiple ? "those plans" : "that plan") + ", replace or remove the leftover meals " +
                    "that come from this plan, then try deleting again.");
        }
        leftoverService.deleteAllByPlan(id);
        deprecateShoppingList(id, "DEPRECATED_PLAN_DELETED");
        repository.deleteById(id);
    }

    @Transactional
    public MealPlanEntry addEntry(Long planId, MealPlanEntry entry) {
        MealPlan plan = findById(planId);

        if (entry.getDayIndex() < 1 || entry.getDayIndex() > plan.getDurationDays()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "dayIndex must be between 1 and " + plan.getDurationDays());
        }

        if (entry.getSlotType() == MealPlanEntry.SlotType.RECIPE) {
            if (entry.getServings() == null || entry.getServings() < 1) {
                entry.setServings(1);
            }
            String slug = entry.getRecipeSlug();
            com.cookbook.recipe.Recipe recipe = (slug == null) ? null
                    : recipeRepository.findBySlug(slug).orElse(null);
            if (recipe == null) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Recipe not found: " + slug);
            }
            entry.setRecipeName(recipe.getName());
        } else {
            entry.setServings(null);
            entry.setRecipeSlug(null);
            entry.setRecipeName(null);
            entry.setLeftoverSlug(null);
        }

        if (entry.getSlotType() == MealPlanEntry.SlotType.READY_PRODUCT) {
            if (entry.getProductName() == null || entry.getProductName().isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "productName is required for READY_PRODUCT");
            }
            if (entry.getQuantity() == null || entry.getQuantity().isBlank()) {
                entry.setQuantity("1");
            }
        } else {
            entry.setProductName(null);
            entry.setQuantity(null);
        }

        if (entry.getMealType() != MealPlanEntry.MealType.OTHER) {
            entry.setMealName(null);
        }

        entryRepository.deleteByMealPlanIdAndDayIndexAndMealType(planId, entry.getDayIndex(), entry.getMealType());

        entry.setMealPlan(plan);
        MealPlanEntry saved = entryRepository.save(entry);
        deprecateShoppingList(planId, "DEPRECATED_PLAN_EDITED");
        return saved;
    }

    @Transactional
    public void replaceEntries(Long planId, List<MealPlanEntry> incoming) {
        MealPlan plan = findById(planId);
        plan.getEntries().clear();
        repository.saveAndFlush(plan);

        for (MealPlanEntry entry : incoming) {
            if (entry.getDayIndex() < 1 || entry.getDayIndex() > plan.getDurationDays()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "dayIndex must be between 1 and " + plan.getDurationDays());
            }
            if (entry.getSlotType() == MealPlanEntry.SlotType.RECIPE) {
                if (entry.getServings() == null || entry.getServings() < 1) entry.setServings(1);
                String slug = entry.getRecipeSlug();
                com.cookbook.recipe.Recipe recipe = (slug == null) ? null
                        : recipeRepository.findBySlug(slug).orElse(null);
                if (recipe == null)
                    throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Recipe not found: " + slug);
                entry.setRecipeName(recipe.getName());
            } else {
                entry.setServings(null);
                entry.setRecipeSlug(null);
                entry.setRecipeName(null);
                entry.setLeftoverSlug(null);
            }
            if (entry.getSlotType() == MealPlanEntry.SlotType.READY_PRODUCT) {
                if (entry.getProductName() == null || entry.getProductName().isBlank())
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "productName is required for READY_PRODUCT");
                if (entry.getQuantity() == null || entry.getQuantity().isBlank()) entry.setQuantity("1");
            } else {
                entry.setProductName(null);
                entry.setQuantity(null);
            }
            if (entry.getMealType() != MealPlanEntry.MealType.OTHER) entry.setMealName(null);
            entry.setMealPlan(plan);
            entryRepository.save(entry);
        }
        deprecateShoppingList(planId, "DEPRECATED_PLAN_EDITED");
    }

    @Transactional
    public void deleteEntry(Long planId, Long entryId) {
        findById(planId);
        MealPlanEntry entry = entryRepository.findById(entryId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Entry not found: " + entryId));
        if (!entry.getMealPlan().getId().equals(planId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Entry " + entryId + " not found in plan " + planId);
        }
        entryRepository.deleteById(entryId);
        deprecateShoppingList(planId, "DEPRECATED_PLAN_EDITED");
    }

    private void deprecateShoppingList(Long mealPlanId, String status) {
        shoppingListRepository.findByMealPlanId(mealPlanId).ifPresent(list -> {
            list.setStatus(status);
            shoppingListRepository.save(list);
        });
    }

    private void validateDurationDays(int durationDays) {
        if (durationDays < 1 || durationDays > 7) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "durationDays must be between 1 and 7");
        }
    }

    private void validateNoOverlap(LocalDate startDate, int durationDays, Long excludeId) {
        LocalDate endDate = startDate.plusDays(durationDays - 1);
        boolean overlaps = repository.findAll().stream()
                .filter(p -> !p.getId().equals(excludeId))
                .anyMatch(p -> {
                    LocalDate pEnd = p.getStartDate().plusDays(p.getDurationDays() - 1);
                    return !startDate.isAfter(pEnd) && !endDate.isBefore(p.getStartDate());
                });
        if (overlaps) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Meal plan date range overlaps with an existing plan");
        }
    }
}
