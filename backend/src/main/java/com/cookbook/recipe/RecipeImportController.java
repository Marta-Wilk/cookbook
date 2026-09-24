package com.cookbook.recipe;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/recipes")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173")
public class RecipeImportController {

    private final RecipeImportService importService;

    @PostMapping("/import")
    public ResponseEntity<RecipeImportResponse> importFromText(@RequestBody RecipeImportRequest request) {
        return ResponseEntity.ok(importService.parseRecipe(request.rawText()));
    }
}
