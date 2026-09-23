package com.cookbook.recipe;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class RecipeIntegrationTest {

    @TempDir
    static Path tempDir;

    @DynamicPropertySource
    static void props(DynamicPropertyRegistry registry) {
        registry.add("recipes.dir", tempDir::toString);
    }

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired RecipeRepository recipeRepository;

    @BeforeEach
    void cleanUp() throws IOException {
        recipeRepository.deleteAll();
        try (Stream<Path> files = Files.list(tempDir)) {
            files.filter(p -> p.getFileName().toString().endsWith(".md"))
                 .forEach(p -> {
                     try { Files.deleteIfExists(p); } catch (IOException ignored) {}
                 });
        }
    }

    @Test
    void create_slugDerivedFromName() throws Exception {
        String body = objectMapper.writeValueAsString(recipeWith("Tomato Soup", 4));

        mockMvc.perform(post("/api/recipes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.slug").value("tomato-soup"));
    }

    @Test
    void create_writesFileToDisk() throws Exception {
        Recipe req = recipeWith("Lemon Pasta", 2);
        req.setContent("## Ingredients\n\n- 200g pasta\n\n## Instructions\n\n1. Boil pasta");
        String body = objectMapper.writeValueAsString(req);

        mockMvc.perform(post("/api/recipes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated());

        Path file = tempDir.resolve("lemon-pasta.md");
        assertThat(file).exists();
        assertThat(Files.readString(file)).contains("## Ingredients");
    }

    @Test
    void delete_removesFileFromDisk() throws Exception {
        String createBody = objectMapper.writeValueAsString(recipeWith("Garlic Bread", 6));

        String response = mockMvc.perform(post("/api/recipes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createBody))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        String slug = objectMapper.readTree(response).get("slug").asText();
        Path file = tempDir.resolve(slug + ".md");
        assertThat(file).exists();

        mockMvc.perform(delete("/api/recipes/{slug}", slug))
                .andExpect(status().isNoContent());

        assertThat(file).doesNotExist();
    }

    private Recipe recipeWith(String name, int servings) {
        Recipe r = new Recipe();
        r.setName(name);
        r.setServings(servings);
        return r;
    }
}
