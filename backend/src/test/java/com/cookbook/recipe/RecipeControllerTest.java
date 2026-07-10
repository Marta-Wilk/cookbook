package com.cookbook.recipe;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

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
    void getById_notFound_returns404() throws Exception {
        when(recipeService.findById(99L))
                .thenThrow(new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.NOT_FOUND));

        mockMvc.perform(get("/api/recipes/99"))
                .andExpect(status().isNotFound());
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
}
