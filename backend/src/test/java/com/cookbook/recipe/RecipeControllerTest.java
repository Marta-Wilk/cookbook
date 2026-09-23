package com.cookbook.recipe;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(RecipeController.class)
class RecipeControllerTest {

    @Autowired
    MockMvc mockMvc;

    @Autowired
    ObjectMapper objectMapper;

    @MockBean
    RecipeService recipeService;

    @Test
    void getAll_returnsEmptyList() throws Exception {
        when(recipeService.findAll()).thenReturn(List.of());

        mockMvc.perform(get("/api/recipes"))
                .andExpect(status().isOk())
                .andExpect(content().json("[]"));
    }

    @Test
    void create_validRecipe_returns201() throws Exception {
        Recipe recipe = new Recipe();
        recipe.setName("Tomato Soup");
        recipe.setSlug("tomato-soup");
        recipe.setContent("# Tomato Soup\n\n## Ingredients\n- 400g tomatoes");

        Recipe saved = new Recipe();
        saved.setId(1L);
        saved.setName("Tomato Soup");
        saved.setSlug("tomato-soup");
        saved.setContent(recipe.getContent());

        when(recipeService.create(any())).thenReturn(saved);

        mockMvc.perform(post("/api/recipes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(recipe)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.slug").value("tomato-soup"));
    }

    @Test
    void create_missingName_returns400() throws Exception {
        Recipe recipe = new Recipe();
        recipe.setServings(2);

        mockMvc.perform(post("/api/recipes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(recipe)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void create_duplicateSlug_returns409() throws Exception {
        Recipe recipe = new Recipe();
        recipe.setName("Tomato Soup");
        recipe.setServings(4);

        when(recipeService.create(any()))
                .thenThrow(new ResponseStatusException(HttpStatus.CONFLICT, "Recipe already exists: tomato-soup"));

        mockMvc.perform(post("/api/recipes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(recipe)))
                .andExpect(status().isConflict());
    }

    @Test
    void getBySlug_notFound_returns404() throws Exception {
        when(recipeService.findBySlug("nonexistent"))
                .thenThrow(new ResponseStatusException(HttpStatus.NOT_FOUND, "Recipe not found: nonexistent"));

        mockMvc.perform(get("/api/recipes/nonexistent"))
                .andExpect(status().isNotFound());
    }
}
