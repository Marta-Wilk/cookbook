package com.cookbook.leftover;

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

@WebMvcTest(LeftoverController.class)
class LeftoverControllerTest {

    @Autowired
    MockMvc mockMvc;

    @MockBean
    LeftoverService service;

    @Test
    void getAll_returnsLeftovers() throws Exception {
        Leftover leftover = new Leftover(1L, "bolognese", "Spaghetti Bolognese", 2);
        when(service.findAll()).thenReturn(List.of(leftover));

        mockMvc.perform(get("/api/leftovers"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].sourcePlanId").value(1))
                .andExpect(jsonPath("$[0].recipeSlug").value("bolognese"))
                .andExpect(jsonPath("$[0].recipeName").value("Spaghetti Bolognese"))
                .andExpect(jsonPath("$[0].servingsRemaining").value(2));
    }

    @Test
    void getAll_emptyList_returnsEmptyArray() throws Exception {
        when(service.findAll()).thenReturn(List.of());

        mockMvc.perform(get("/api/leftovers"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$").isEmpty());
    }

    @Test
    void replaceForPlan_withList_returns204() throws Exception {
        doNothing().when(service).replaceForPlan(eq(1L), anyList());

        mockMvc.perform(put("/api/leftovers/plan/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                            [{"recipeSlug":"bolognese","recipeName":"Spaghetti Bolognese","servingsRemaining":2}]
                            """))
                .andExpect(status().isNoContent());

        verify(service).replaceForPlan(eq(1L), anyList());
    }

    @Test
    void replaceForPlan_withEmptyList_returns204() throws Exception {
        doNothing().when(service).replaceForPlan(eq(1L), anyList());

        mockMvc.perform(put("/api/leftovers/plan/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("[]"))
                .andExpect(status().isNoContent());

        verify(service).replaceForPlan(eq(1L), anyList());
    }

    @Test
    void delete_existingLeftover_returns204() throws Exception {
        doNothing().when(service).delete(1L);

        mockMvc.perform(delete("/api/leftovers/1"))
                .andExpect(status().isNoContent());
    }

    @Test
    void delete_unknownLeftover_returns404() throws Exception {
        doThrow(new ResponseStatusException(HttpStatus.NOT_FOUND, "Leftover not found: 999"))
                .when(service).delete(999L);

        mockMvc.perform(delete("/api/leftovers/999"))
                .andExpect(status().isNotFound());
    }
}
