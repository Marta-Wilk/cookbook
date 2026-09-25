package com.cookbook.mealplan;

import com.cookbook.leftover.LeftoverService;
import com.cookbook.recipe.Recipe;
import com.cookbook.recipe.RecipeRepository;
import com.cookbook.shoppinglist.ShoppingList;
import com.cookbook.shoppinglist.ShoppingListRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.http.HttpStatus.NOT_FOUND;

@ExtendWith(MockitoExtension.class)
class MealPlanServiceTest {

    @Mock MealPlanRepository repository;
    @Mock MealPlanEntryRepository entryRepository;
    @Mock RecipeRepository recipeRepository;
    @Mock LeftoverService leftoverService;
    @Mock ShoppingListRepository shoppingListRepository;

    @InjectMocks MealPlanService service;

    private MealPlan plan() {
        MealPlan p = new MealPlan();
        p.setId(1L);
        p.setName("Test Plan");
        p.setStartDate(LocalDate.now());
        p.setDurationDays(7);
        return p;
    }

    private Recipe recipe(String slug) {
        Recipe r = new Recipe();
        r.setId(1L);
        r.setName("Test Recipe");
        r.setSlug(slug);
        r.setServings(4);
        return r;
    }

    @Test
    void addEntry_validRecipe_setsRecipeName() {
        when(repository.findById(1L)).thenReturn(Optional.of(plan()));
        when(recipeRepository.findBySlug("pasta")).thenReturn(Optional.of(recipe("pasta")));
        doNothing().when(entryRepository).deleteByMealPlanIdAndDayIndexAndMealType(any(), anyInt(), any());
        when(entryRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        MealPlanEntry entry = new MealPlanEntry();
        entry.setDayIndex(1);
        entry.setMealType(MealPlanEntry.MealType.DINNER);
        entry.setSlotType(MealPlanEntry.SlotType.RECIPE);
        entry.setRecipeSlug("pasta");
        entry.setServings(2);

        MealPlanEntry result = service.addEntry(1L, entry);

        assert result.getRecipeName().equals("Test Recipe");
    }

    @Test
    void addEntry_unknownRecipeSlug_throws404() {
        when(repository.findById(1L)).thenReturn(Optional.of(plan()));
        when(recipeRepository.findBySlug("unknown")).thenReturn(Optional.empty());

        MealPlanEntry entry = new MealPlanEntry();
        entry.setDayIndex(1);
        entry.setMealType(MealPlanEntry.MealType.DINNER);
        entry.setSlotType(MealPlanEntry.SlotType.RECIPE);
        entry.setRecipeSlug("unknown");
        entry.setServings(2);

        var ex = assertThrows(org.springframework.web.server.ResponseStatusException.class,
                () -> service.addEntry(1L, entry));
        assert ex.getStatusCode() == org.springframework.http.HttpStatus.NOT_FOUND;
    }

    @Test
    void delete_existingPlan_deletesLeftoversAndPlan() {
        when(repository.findById(1L)).thenReturn(Optional.of(plan()));
        when(entryRepository.findByLeftoverSourcePlanId(1L)).thenReturn(List.of());
        doNothing().when(leftoverService).deleteAllByPlan(1L);
        doNothing().when(repository).deleteById(1L);

        service.delete(1L);

        verify(leftoverService).deleteAllByPlan(1L);
        verify(repository).deleteById(1L);
    }

    @Test
    void delete_withDependentEntries_throws409() {
        MealPlan otherPlan = new MealPlan();
        otherPlan.setId(2L);
        otherPlan.setName("Plan B");
        MealPlanEntry dep = new MealPlanEntry();
        dep.setMealPlan(otherPlan);

        when(repository.findById(1L)).thenReturn(Optional.of(plan()));
        when(entryRepository.findByLeftoverSourcePlanId(1L)).thenReturn(List.of(dep));

        var ex = assertThrows(org.springframework.web.server.ResponseStatusException.class,
                () -> service.delete(1L));
        assert ex.getStatusCode() == org.springframework.http.HttpStatus.CONFLICT;
        verify(repository, never()).deleteById(any());
        verify(leftoverService, never()).deleteAllByPlan(any());
    }

    @Test
    void replaceEntries_clearsAndSavesAll() {
        when(repository.findById(1L)).thenReturn(Optional.of(plan()));
        when(repository.saveAndFlush(any())).thenAnswer(i -> i.getArgument(0));
        when(recipeRepository.findBySlug("pasta")).thenReturn(Optional.of(recipe("pasta")));
        when(entryRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        MealPlanEntry entry = new MealPlanEntry();
        entry.setDayIndex(1);
        entry.setMealType(MealPlanEntry.MealType.BREAKFAST);
        entry.setSlotType(MealPlanEntry.SlotType.RECIPE);
        entry.setRecipeSlug("pasta");
        entry.setServings(2);

        service.replaceEntries(1L, List.of(entry));

        verify(repository).saveAndFlush(any());
        verify(entryRepository).save(any());
    }

    @Test
    void replaceEntries_invalidDayIndex_throws400() {
        when(repository.findById(1L)).thenReturn(Optional.of(plan()));
        when(repository.saveAndFlush(any())).thenAnswer(i -> i.getArgument(0));

        MealPlanEntry entry = new MealPlanEntry();
        entry.setDayIndex(99);
        entry.setMealType(MealPlanEntry.MealType.BREAKFAST);
        entry.setSlotType(MealPlanEntry.SlotType.EAT_OUT);

        var ex = assertThrows(org.springframework.web.server.ResponseStatusException.class,
                () -> service.replaceEntries(1L, List.of(entry)));
        assert ex.getStatusCode() == org.springframework.http.HttpStatus.BAD_REQUEST;
    }

    @Test
    void addEntry_leftoverSlug_storesItWithoutValidation() {
        when(repository.findById(1L)).thenReturn(Optional.of(plan()));
        when(recipeRepository.findBySlug("pasta")).thenReturn(Optional.of(recipe("pasta")));
        doNothing().when(entryRepository).deleteByMealPlanIdAndDayIndexAndMealType(any(), anyInt(), any());
        when(entryRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        MealPlanEntry entry = new MealPlanEntry();
        entry.setDayIndex(1);
        entry.setMealType(MealPlanEntry.MealType.DINNER);
        entry.setSlotType(MealPlanEntry.SlotType.RECIPE);
        entry.setRecipeSlug("pasta");
        entry.setLeftoverSlug("pasta");
        entry.setServings(2);

        MealPlanEntry result = service.addEntry(1L, entry);

        assert "pasta".equals(result.getLeftoverSlug());
        assert "Test Recipe".equals(result.getRecipeName());
    }
}
