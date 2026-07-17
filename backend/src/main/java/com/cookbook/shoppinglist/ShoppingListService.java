package com.cookbook.shoppinglist;

import com.cookbook.mealplan.MealPlan;
import com.cookbook.mealplan.MealPlanEntry;
import com.cookbook.mealplan.MealPlanService;
import com.cookbook.recipe.RecipeService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ShoppingListService {

    private final MealPlanService mealPlanService;
    private final RecipeService recipeService;
    private final ShoppingListRepository repository;
    private final ShoppingListItemRepository itemRepository;
    private final AnthropicClient anthropicClient;

    @Value("${ai.anthropic.api-key:stub}")
    private String apiKey;

    public ShoppingList generateForMealPlan(Long mealPlanId) {
        MealPlan plan = mealPlanService.findById(mealPlanId);

        List<MealPlanEntry> shoppableEntries = plan.getEntries().stream()
                .filter(e -> e.getSlotType() != MealPlanEntry.SlotType.EAT_OUT)
                .toList();

        if (shoppableEntries.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NO_CONTENT);
        }

        if ("stub".equals(apiKey)) {
            return persistStub(plan, shoppableEntries);
        }

        return persistFromAi(plan, shoppableEntries);
    }

    public List<ShoppingList> findAll() {
        return repository.findAll();
    }

    public ShoppingList findById(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Shopping list not found: " + id));
    }

    public ShoppingListItem toggleOwned(Long listId, Long itemId) {
        ShoppingList list = findById(listId);
        ShoppingListItem item = list.getItems().stream()
                .filter(i -> i.getId().equals(itemId))
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Item not found: " + itemId));
        item.setOwned(!item.isOwned());
        return itemRepository.save(item);
    }

    public void delete(Long id) {
        findById(id);
        repository.deleteById(id);
    }

    private ShoppingList persistFromAi(MealPlan plan, List<MealPlanEntry> entries) {
        List<MealPlanEntry> recipeEntries = entries.stream()
                .filter(e -> e.getSlotType() == MealPlanEntry.SlotType.RECIPE)
                .toList();
        List<MealPlanEntry> readyProducts = entries.stream()
                .filter(e -> e.getSlotType() == MealPlanEntry.SlotType.READY_PRODUCT)
                .toList();

        ShoppingList list = new ShoppingList();
        list.setName(plan.getName());
        list.setMealPlanId(plan.getId());
        list.setStubMode(false);

        int sortOrder = 0;

        if (!recipeEntries.isEmpty()) {
            String userMessage = buildUserMessage(recipeEntries);
            for (AnthropicClient.ItemDto dto : anthropicClient.generateItems(userMessage)) {
                ShoppingListItem item = new ShoppingListItem();
                item.setShoppingList(list);
                item.setIngredient(dto.ingredient());
                item.setQuantity(dto.quantity());
                item.setCategory(dto.category());
                item.setSortOrder(sortOrder++);
                list.getItems().add(item);
            }
        }

        for (MealPlanEntry entry : readyProducts) {
            ShoppingListItem item = new ShoppingListItem();
            item.setShoppingList(list);
            item.setIngredient(entry.getProductName());
            item.setQuantity(entry.getQuantity());
            item.setSortOrder(sortOrder++);
            list.getItems().add(item);
        }

        return repository.save(list);
    }

    private String buildUserMessage(List<MealPlanEntry> recipeEntries) {
        Map<String, Long> countBySlug = recipeEntries.stream()
                .filter(e -> e.getRecipeSlug() != null)
                .collect(Collectors.groupingBy(MealPlanEntry::getRecipeSlug, Collectors.counting()));

        StringBuilder sb = new StringBuilder("Generate a shopping list for the following recipes:\n");
        Set<String> seen = new LinkedHashSet<>();

        for (MealPlanEntry entry : recipeEntries) {
            if (entry.getRecipeSlug() == null || !seen.add(entry.getRecipeSlug())) continue;
            try {
                String content = recipeService.findBySlug(entry.getRecipeSlug()).getContent();
                List<String> ingredients = extractIngredients(content);
                if (ingredients.isEmpty()) continue;

                long count = countBySlug.get(entry.getRecipeSlug());
                String name = entry.getRecipeName() != null ? entry.getRecipeName() : entry.getRecipeSlug();
                String serves = entry.getServings() != null ? String.valueOf(entry.getServings()) : "?";
                String times = count > 1 ? ", " + count + "x this week" : "";
                sb.append("\n[RECIPE: ").append(name).append(" (serves ").append(serves).append(times).append(")]\n");
                ingredients.forEach(i -> sb.append("- ").append(i).append("\n"));
            } catch (ResponseStatusException ignored) {}
        }

        return sb.toString();
    }

    private ShoppingList persistStub(MealPlan plan, List<MealPlanEntry> entries) {
        List<String> rawItems = buildRawItems(entries);

        ShoppingList list = new ShoppingList();
        list.setName(plan.getName());
        list.setMealPlanId(plan.getId());
        list.setStubMode(true);

        for (int i = 0; i < rawItems.size(); i++) {
            ShoppingListItem item = new ShoppingListItem();
            item.setShoppingList(list);
            item.setIngredient(rawItems.get(i));
            item.setSortOrder(i);
            list.getItems().add(item);
        }

        return repository.save(list);
    }

    private List<String> buildRawItems(List<MealPlanEntry> entries) {
        List<String> items = new ArrayList<>();
        for (MealPlanEntry entry : entries) {
            if (entry.getSlotType() == MealPlanEntry.SlotType.READY_PRODUCT) {
                if (entry.getProductName() != null) {
                    items.add(entry.getQuantity() + " " + entry.getProductName());
                }
            } else if (entry.getSlotType() == MealPlanEntry.SlotType.RECIPE) {
                if (entry.getRecipeSlug() != null) {
                    try {
                        String content = recipeService.findBySlug(entry.getRecipeSlug()).getContent();
                        items.addAll(extractIngredients(content));
                    } catch (ResponseStatusException ignored) {}
                }
            }
        }
        return items;
    }

    private List<String> extractIngredients(String content) {
        if (content == null) return List.of();
        List<String> ingredients = new ArrayList<>();
        boolean inIngredients = false;
        for (String line : content.split("\\r?\\n")) {
            if (line.startsWith("## Ingredients")) {
                inIngredients = true;
            } else if (line.startsWith("## ")) {
                inIngredients = false;
            } else if (inIngredients && line.startsWith("- ")) {
                ingredients.add(line.substring(2).trim());
            }
        }
        return ingredients;
    }
}
