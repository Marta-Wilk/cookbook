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

    @GetMapping("/{id}")
    public Recipe getById(@PathVariable Long id) {
        return service.findById(id);
    }

    @GetMapping("/slug/{slug}")
    public Recipe getBySlug(@PathVariable String slug) {
        return service.findBySlug(slug);
    }

    @PostMapping
    public ResponseEntity<Recipe> create(@Valid @RequestBody Recipe recipe) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(recipe));
    }

    @PutMapping("/{id}")
    public Recipe update(@PathVariable Long id, @Valid @RequestBody Recipe recipe) {
        return service.update(id, recipe);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
