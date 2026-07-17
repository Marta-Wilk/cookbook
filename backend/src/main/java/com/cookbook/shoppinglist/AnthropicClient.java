package com.cookbook.shoppinglist;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.List;

@Component
public class AnthropicClient {

    private static final Logger log = LoggerFactory.getLogger(AnthropicClient.class);

    private static final String SYSTEM_PROMPT = """
            You are a helpful kitchen assistant. Given a list of recipe ingredient sections,
            consolidate all ingredients into a single shopping list.
            - Remove duplicates; sum quantities where possible
            - Group by supermarket category: Produce, Meat & Fish, Dairy, Pantry, Frozen, Other
            - Return ONLY a raw JSON object with no markdown, no code fences, and no explanation.
            - Use exactly this structure:
            {"items": [{"ingredient": "...", "quantity": "...", "category": "..."}]}
            """;

    private final String model;
    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    public AnthropicClient(
            @Value("${ai.anthropic.api-key:stub}") String apiKey,
            @Value("${ai.anthropic.model:claude-sonnet-5}") String model,
            ObjectMapper objectMapper) {
        this.model = model;
        this.restClient = RestClient.builder()
                .baseUrl("https://api.anthropic.com")
                .defaultHeader("x-api-key", apiKey)
                .defaultHeader("anthropic-version", "2023-06-01")
                .defaultHeader("Content-Type", "application/json")
                .build();
        this.objectMapper = objectMapper;
    }

    public List<ItemDto> generateItems(String userMessage) {
        var requestBody = new MessagesRequest(
                model, 2048, SYSTEM_PROMPT,
                List.of(new Message("user", userMessage)),
                List.of());
        try {
            String requestJson = objectMapper.writeValueAsString(requestBody);
            log.info("Anthropic request: {}", requestJson);

            String raw = restClient.post()
                    .uri("/v1/messages")
                    .body(requestBody)
                    .retrieve()
                    .body(String.class);

            log.info("Anthropic raw response: {}", raw);

            MessagesResponse response = objectMapper.readValue(raw, MessagesResponse.class);

            String text = response.content().stream()
                    .filter(b -> "text".equals(b.type()))
                    .findFirst()
                    .map(ContentBlock::text)
                    .orElseThrow(() -> new IllegalStateException("No text block in Anthropic response"));

            String json = stripCodeFences(text);
            log.info("Anthropic extracted JSON: {}", json);

            return parseItems(json);
        } catch (ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            log.error("Anthropic API error: {}", e.getMessage(), e);
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Anthropic API error: " + e.getMessage());
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

    private List<ItemDto> parseItems(String json) throws Exception {
        JsonNode root = objectMapper.readTree(json);

        // Flat format: {"items": [...]}
        if (root.has("items") && root.get("items").isArray()) {
            List<ItemDto> items = new ArrayList<>();
            for (JsonNode node : root.get("items")) {
                String ingredient = nodeText(node, "ingredient", "item");
                String quantity   = nodeText(node, "quantity");
                String category   = nodeText(node, "category");
                if (ingredient != null) items.add(new ItemDto(ingredient, quantity, category));
            }
            return items;
        }

        // Grouped format: {"shopping_list": {"Category": [{"item": "...", "quantity": "..."}]}}
        JsonNode grouped = root.has("shopping_list") ? root.get("shopping_list") : root;
        List<ItemDto> items = new ArrayList<>();
        grouped.fields().forEachRemaining(entry -> {
            String category = entry.getKey();
            entry.getValue().forEach(node -> {
                String ingredient = nodeText(node, "ingredient", "item");
                String quantity   = nodeText(node, "quantity");
                if (ingredient != null && !ingredient.isBlank())
                    items.add(new ItemDto(ingredient, quantity, category));
            });
        });
        return items;
    }

    private String nodeText(JsonNode node, String... keys) {
        for (String key : keys) {
            if (node.has(key) && !node.get(key).isNull()) return node.get(key).asText();
        }
        return null;
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    @JsonInclude(JsonInclude.Include.NON_NULL)
    record MessagesRequest(String model, int max_tokens, String system, List<Message> messages, List<String> stop_sequences) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    record Message(String role, String content) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    record MessagesResponse(List<ContentBlock> content) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    record ContentBlock(String type, String text) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    record ItemsResponse(List<ItemDto> items) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    record ItemDto(String ingredient, String quantity, String category) {}
}
