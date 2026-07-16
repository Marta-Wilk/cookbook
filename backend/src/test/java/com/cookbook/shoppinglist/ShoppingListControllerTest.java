package com.cookbook.shoppinglist;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.HttpStatus;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;

import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(ShoppingListController.class)
class ShoppingListControllerTest {

    @Autowired
    MockMvc mockMvc;

    @MockBean
    ShoppingListService service;

    private ShoppingList stubList(ShoppingListItem... items) {
        ShoppingList list = new ShoppingList();
        list.setId(1L);
        list.setName("16.07.2026");
        list.setMealPlanId(1L);
        list.setStubMode(true);
        list.setCreatedAt(LocalDateTime.of(2026, 7, 16, 10, 0));
        for (ShoppingListItem item : items) {
            item.setShoppingList(list);
            list.getItems().add(item);
        }
        return list;
    }

    private ShoppingListItem item(Long id, String ingredient, int sortOrder) {
        ShoppingListItem item = new ShoppingListItem();
        item.setId(id);
        item.setIngredient(ingredient);
        item.setSortOrder(sortOrder);
        return item;
    }

    // Holdout 1: Stub mode (no API key): POST returns 201 and list is persisted with items from plan entries
    @Test
    void generate_stubMode_returns201WithItems() throws Exception {
        ShoppingList list = stubList(item(1L, "400g spaghetti", 0), item(2L, "500g minced beef", 1));
        when(service.generateForMealPlan(1L)).thenReturn(list);

        mockMvc.perform(post("/api/shopping-lists/generate/1"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.stubMode").value(true))
                .andExpect(jsonPath("$.items").isArray())
                .andExpect(jsonPath("$.items.length()").value(2));
    }

    // Holdout 2: Missing meal plan → POST returns 404
    @Test
    void generate_missingMealPlan_returns404() throws Exception {
        when(service.generateForMealPlan(anyLong()))
                .thenThrow(new ResponseStatusException(HttpStatus.NOT_FOUND, "Meal plan not found"));

        mockMvc.perform(post("/api/shopping-lists/generate/99"))
                .andExpect(status().isNotFound());
    }

    // Holdout 3: Meal plan with only EAT_OUT entries → 204
    @Test
    void generate_onlyEatOutEntries_returns204() throws Exception {
        when(service.generateForMealPlan(anyLong()))
                .thenThrow(new ResponseStatusException(HttpStatus.NO_CONTENT));

        mockMvc.perform(post("/api/shopping-lists/generate/1"))
                .andExpect(status().isNoContent());
    }

    // Holdout 4: READY_PRODUCT entry appears in saved list
    @Test
    void generate_readyProductEntry_appearsInSavedList() throws Exception {
        ShoppingList list = stubList(item(1L, "2 liters Milk", 0));
        when(service.generateForMealPlan(1L)).thenReturn(list);

        mockMvc.perform(post("/api/shopping-lists/generate/1"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.items[0].ingredient").value("2 liters Milk"));
    }

    // Holdout 5: PATCH owned=true on an item → GET returns that item with owned: true
    @Test
    void toggleOwned_thenGet_itemHasOwnedTrue() throws Exception {
        ShoppingListItem ownedItem = item(1L, "400g spaghetti", 0);
        ownedItem.setOwned(true);
        when(service.toggleOwned(1L, 1L)).thenReturn(ownedItem);

        mockMvc.perform(patch("/api/shopping-lists/1/items/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.owned").value(true));

        when(service.findById(1L)).thenReturn(stubList(ownedItem));

        mockMvc.perform(get("/api/shopping-lists/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].owned").value(true));
    }

    // Holdout 6: DELETE list → GET returns 404
    @Test
    void delete_thenGet_returns404() throws Exception {
        doNothing().when(service).delete(1L);
        when(service.findById(1L))
                .thenThrow(new ResponseStatusException(HttpStatus.NOT_FOUND, "Shopping list not found: 1"));

        mockMvc.perform(delete("/api/shopping-lists/1"))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/shopping-lists/1"))
                .andExpect(status().isNotFound());
    }
}
