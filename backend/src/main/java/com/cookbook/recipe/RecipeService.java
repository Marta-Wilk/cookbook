package com.cookbook.recipe;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@RequiredArgsConstructor
public class RecipeService {

    private final RecipeRepository repository;

    public List<Recipe> findAll() {
        return repository.findAll();
    }

    public Recipe findById(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Recipe not found: " + id));
    }

    public Recipe findBySlug(String slug) {
        return repository.findBySlug(slug)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Recipe not found: " + slug));
    }

    public Recipe create(Recipe recipe) {
        if (recipe.getSlug() == null || recipe.getSlug().isBlank()) {
            recipe.setSlug(toSlug(recipe.getName()));
        }
        return repository.save(recipe);
    }

    public Recipe update(Long id, Recipe patch) {
        Recipe existing = findById(id);
        existing.setName(patch.getName());
        existing.setContent(patch.getContent());
        existing.setTags(patch.getTags());
        existing.setServings(patch.getServings());
        existing.setPrepTimeMinutes(patch.getPrepTimeMinutes());
        return repository.save(existing);
    }

    public void delete(Long id) {
        findById(id);
        repository.deleteById(id);
    }

    private String toSlug(String name) {
        return name.toLowerCase().replaceAll("[^a-z0-9]+", "-").replaceAll("^-|-$", "");
    }
}
