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

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(RecipeImportController.class)
class RecipeImportControllerTest {

    @Autowired
    MockMvc mockMvc;

    @Autowired
    ObjectMapper objectMapper;

    @MockBean
    RecipeImportService importService;

    @Test
    void import_stubMode_returns200WithStubModeTrue() throws Exception {
        when(importService.parseRecipe(anyString()))
                .thenReturn(new RecipeImportResponse(null, null, null, null, List.of(), List.of(), null, true));

        mockMvc.perform(post("/api/recipes/import")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"rawText\":\"some raw recipe text\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.stubMode").value(true))
                .andExpect(jsonPath("$.name").isEmpty());
    }

    @Test
    void import_blankRawText_returns400() throws Exception {
        when(importService.parseRecipe(anyString()))
                .thenThrow(new ResponseStatusException(HttpStatus.BAD_REQUEST, "rawText must not be empty"));

        mockMvc.perform(post("/api/recipes/import")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"rawText\":\"\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void import_validText_returns200WithParsedFields() throws Exception {
        RecipeImportResponse response = new RecipeImportResponse(
                "Tomato Soup", 4, 30, "soup, vegetarian",
                List.of("400g tomatoes", "1 onion"),
                List.of("Chop onion", "Cook tomatoes"),
                null, false);
        when(importService.parseRecipe(anyString())).thenReturn(response);

        mockMvc.perform(post("/api/recipes/import")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"rawText\":\"Tomato Soup recipe...\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Tomato Soup"))
                .andExpect(jsonPath("$.servings").value(4))
                .andExpect(jsonPath("$.stubMode").value(false))
                .andExpect(jsonPath("$.ingredients[0]").value("400g tomatoes"));
    }
}
