package com.cookbook.mealplan;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(MealPlanController.class)
class MealPlanControllerTest {

    @Autowired
    MockMvc mockMvc;

    @MockBean
    MealPlanService service;

    // Holdout 1: Create plan → GET returns it with entries: []
    @Test
    void createPlan_thenGetById_returnsEmptyEntries() throws Exception {
        MealPlan plan = new MealPlan();
        plan.setId(1L);
        plan.setName("15.07.2026");
        plan.setStartDate(LocalDate.of(2026, 7, 15));
        plan.setDurationDays(1);

        when(service.create(any())).thenReturn(plan);
        when(service.findById(1L)).thenReturn(plan);

        mockMvc.perform(post("/api/meal-plans")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"15.07.2026\",\"startDate\":\"2026-07-15\",\"durationDays\":1}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(1));

        mockMvc.perform(get("/api/meal-plans/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.entries").isArray())
                .andExpect(jsonPath("$.entries").isEmpty());
    }

    // Holdout 2a: durationDays = 0 → 400
    @Test
    void createPlan_durationDaysZero_returns400() throws Exception {
        when(service.create(any()))
                .thenThrow(new ResponseStatusException(HttpStatus.BAD_REQUEST, "durationDays must be between 1 and 7"));

        mockMvc.perform(post("/api/meal-plans")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"test\",\"startDate\":\"2026-07-15\",\"durationDays\":0}"))
                .andExpect(status().isBadRequest());
    }

    // Holdout 2b: durationDays = 8 → 400
    @Test
    void createPlan_durationDaysEight_returns400() throws Exception {
        when(service.create(any()))
                .thenThrow(new ResponseStatusException(HttpStatus.BAD_REQUEST, "durationDays must be between 1 and 7"));

        mockMvc.perform(post("/api/meal-plans")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"test\",\"startDate\":\"2026-07-15\",\"durationDays\":8}"))
                .andExpect(status().isBadRequest());
    }

    // Holdout 3: Add RECIPE entry with unknown recipeSlug → 404
    @Test
    void addEntry_unknownRecipeSlug_returns404() throws Exception {
        when(service.addEntry(anyLong(), any()))
                .thenThrow(new ResponseStatusException(HttpStatus.NOT_FOUND, "Recipe not found: unknown-slug"));

        mockMvc.perform(post("/api/meal-plans/1/entries")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"dayIndex\":1,\"mealType\":\"BREAKFAST\",\"slotType\":\"RECIPE\"," +
                                 "\"recipeSlug\":\"unknown-slug\",\"servings\":1}"))
                .andExpect(status().isNotFound());
    }

    // Holdout 4: Add READY_PRODUCT entry without productName → 400
    @Test
    void addEntry_readyProductWithoutProductName_returns400() throws Exception {
        when(service.addEntry(anyLong(), any()))
                .thenThrow(new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "productName is required for READY_PRODUCT"));

        mockMvc.perform(post("/api/meal-plans/1/entries")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"dayIndex\":1,\"mealType\":\"LUNCH\",\"slotType\":\"READY_PRODUCT\",\"quantity\":\"2\"}"))
                .andExpect(status().isBadRequest());
    }

    // Holdout 5: Add two entries for the same dayIndex + mealType → 409
    @Test
    void addEntry_duplicateSlot_returns409() throws Exception {
        when(service.addEntry(anyLong(), any()))
                .thenThrow(new ResponseStatusException(HttpStatus.CONFLICT,
                        "Slot already occupied: dayIndex=1 mealType=BREAKFAST"));

        mockMvc.perform(post("/api/meal-plans/1/entries")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"dayIndex\":1,\"mealType\":\"BREAKFAST\",\"slotType\":\"EAT_OUT\"}"))
                .andExpect(status().isConflict());
    }

    // Overlap — create: overlapping date range → 409
    @Test
    void createPlan_overlappingDateRange_returns409() throws Exception {
        when(service.create(any()))
                .thenThrow(new ResponseStatusException(HttpStatus.CONFLICT,
                        "Meal plan date range overlaps with an existing plan"));

        mockMvc.perform(post("/api/meal-plans")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"15.07.2026\",\"startDate\":\"2026-07-15\",\"durationDays\":3}"))
                .andExpect(status().isConflict());
    }

    // Overlap — update: overlapping date range → 409
    @Test
    void updatePlan_overlappingDateRange_returns409() throws Exception {
        when(service.update(anyLong(), any()))
                .thenThrow(new ResponseStatusException(HttpStatus.CONFLICT,
                        "Meal plan date range overlaps with an existing plan"));

        mockMvc.perform(put("/api/meal-plans/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"15.07.2026\",\"startDate\":\"2026-07-15\",\"durationDays\":3}"))
                .andExpect(status().isConflict());
    }

    // Holdout 6: Delete plan returns 204 (cascade verified in MealPlanRepositoryTest)
    @Test
    void deletePlan_returns204() throws Exception {
        doNothing().when(service).delete(1L);

        mockMvc.perform(delete("/api/meal-plans/1"))
                .andExpect(status().isNoContent());
    }

    // Holdout 7: EAT_OUT entry response has no recipeSlug, productName, or quantity fields
    @Test
    void addEatOutEntry_responseOmitsRecipeAndProductFields() throws Exception {
        MealPlanEntry entry = new MealPlanEntry();
        entry.setId(1L);
        entry.setDayIndex(1);
        entry.setMealType(MealPlanEntry.MealType.DINNER);
        entry.setSlotType(MealPlanEntry.SlotType.EAT_OUT);

        when(service.addEntry(anyLong(), any())).thenReturn(entry);

        mockMvc.perform(post("/api/meal-plans/1/entries")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"dayIndex\":1,\"mealType\":\"DINNER\",\"slotType\":\"EAT_OUT\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.recipeSlug").doesNotExist())
                .andExpect(jsonPath("$.productName").doesNotExist())
                .andExpect(jsonPath("$.quantity").doesNotExist())
                .andExpect(jsonPath("$.recipeName").doesNotExist())
                .andExpect(jsonPath("$.servings").doesNotExist());
    }
}
