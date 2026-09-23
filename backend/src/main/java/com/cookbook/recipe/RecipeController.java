package com.cookbook.recipe;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/recipes")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173")
public class RecipeController {

    private final RecipeService service;

    @GetMapping
    public List<Recipe> getAll() {
        return service.findAll();
    }

    @GetMapping("/{slug}")
    public Recipe getBySlug(@PathVariable String slug) {
        return service.findBySlug(slug);
    }

    @PostMapping
    public ResponseEntity<Recipe> create(@Valid @RequestBody Recipe recipe) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(recipe));
    }

    @PutMapping("/{slug}")
    public Recipe update(@PathVariable String slug, @Valid @RequestBody Recipe recipe) {
        return service.update(slug, recipe);
    }

    @DeleteMapping("/{slug}")
    public ResponseEntity<Void> delete(@PathVariable String slug) {
        service.delete(slug);
        return ResponseEntity.noContent().build();
    }
}
