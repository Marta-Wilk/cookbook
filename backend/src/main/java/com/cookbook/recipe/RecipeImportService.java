package com.cookbook.recipe;

import com.cookbook.shoppinglist.AnthropicClient;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@RequiredArgsConstructor
public class RecipeImportService {

    private static final String SYSTEM_PROMPT = """
            You are a kitchen assistant. Parse the provided raw recipe text into structured fields.
            Return ONLY a raw JSON object with no markdown, no code fences, and no explanation.
            Use exactly this structure:
            {
              "name": "Recipe Title",
              "servings": 4,
              "prepTimeMinutes": 30,
              "tags": "pasta, italian",
              "ingredients": ["400g spaghetti", "500g minced beef"],
              "steps": ["Bring water to boil", "Cook pasta"],
              "notes": "Optional notes"
            }
            Use null for fields you cannot determine. Ingredients and steps must be arrays of strings.
            """;

    private final AnthropicClient anthropicClient;
    private final ObjectMapper objectMapper;

    @Value("${ai.anthropic.api-key:stub}")
    private String apiKey;

    public RecipeImportResponse parseRecipe(String rawText) {
        if (rawText == null || rawText.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "rawText must not be empty");
        }
        if ("stub".equals(apiKey)) {
            return new RecipeImportResponse(null, null, null, null, List.of(), List.of(), null, true);
        }
        try {
            String text = anthropicClient.callRaw(SYSTEM_PROMPT, rawText);
            String json = stripCodeFences(text);
            RecipeDraftDto draft = objectMapper.readValue(json, RecipeDraftDto.class);
            return new RecipeImportResponse(
                    draft.name(), draft.servings(), draft.prepTimeMinutes(), draft.tags(),
                    draft.ingredients() != null ? draft.ingredients() : List.of(),
                    draft.steps() != null ? draft.steps() : List.of(),
                    draft.notes(), false);
        } catch (ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Failed to parse recipe: " + e.getMessage());
        }
    }

    private String stripCodeFences(String text) {
        String t = text.trim();
        if (t.startsWith("```")) {
            int newline = t.indexOf('\n');
            if (newline != -1) t = t.substring(newline + 1);
            if (t.endsWith("```")) t = t.substring(0, t.lastIndexOf("```"));
        }
        return t.trim();
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record RecipeDraftDto(
            String name,
            Integer servings,
            Integer prepTimeMinutes,
            String tags,
            List<String> ingredients,
            List<String> steps,
            String notes) {}
}
