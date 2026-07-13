package com.cookbook.recipe;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Stream;

@Slf4j
@Service
@RequiredArgsConstructor
public class RecipeService {

    private final RecipeRepository repository;

    @Value("${recipes.dir:../recipes}")
    private String recipesDir;

    @PostConstruct
    void syncRecipesFromDisk() {
        Path dir = Paths.get(recipesDir);
        if (!Files.isDirectory(dir)) {
            log.warn("Recipes directory not found, skipping startup sync: {}", dir.toAbsolutePath());
            return;
        }
        try (Stream<Path> files = Files.list(dir)) {
            files.filter(p -> p.getFileName().toString().endsWith(".md"))
                 .forEach(this::indexIfAbsent);
        } catch (IOException e) {
            log.error("Failed to scan recipes directory: {}", dir.toAbsolutePath(), e);
        }
    }

    private void indexIfAbsent(Path file) {
        String slug = file.getFileName().toString().replaceAll("\\.md$", "");
        if (repository.findBySlug(slug).isPresent()) {
            return;
        }
        try {
            Recipe recipe = parseMetadata(Files.readString(file));
            recipe.setSlug(slug);
            repository.save(recipe);
            log.info("Indexed recipe from disk: {}", slug);
        } catch (IOException e) {
            log.error("Failed to read recipe file: {}", file, e);
        }
    }

    private Recipe parseMetadata(String content) {
        Recipe recipe = new Recipe();
        for (String line : content.split("\\r?\\n")) {
            String t = line.trim();
            if (recipe.getName() == null && t.startsWith("# ")) {
                recipe.setName(t.substring(2).trim());
            } else if (t.startsWith("**Tags:**")) {
                recipe.setTags(t.replaceFirst("\\*\\*Tags:\\*\\*\\s*", "").trim());
            } else if (t.startsWith("**Serves:**")) {
                try {
                    recipe.setServings(Integer.parseInt(t.replaceFirst("\\*\\*Serves:\\*\\*\\s*", "").trim()));
                } catch (NumberFormatException ignored) {}
            } else if (t.startsWith("**Time:**")) {
                Matcher m = Pattern.compile("(\\d+)\\s*min").matcher(t);
                if (m.find()) {
                    recipe.setPrepTimeMinutes(Integer.parseInt(m.group(1)));
                }
            }
        }
        return recipe;
    }

    public List<Recipe> findAll() {
        return repository.findAll();
    }

    public Recipe findById(Long id) {
        Recipe recipe = repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Recipe not found: " + id));
        attachContent(recipe);
        return recipe;
    }

    public Recipe findBySlug(String slug) {
        Recipe recipe = repository.findBySlug(slug)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Recipe not found: " + slug));
        attachContent(recipe);
        return recipe;
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
        try {
            writeRecipeFile(existing);
        } catch (IOException e) {
            log.error("Failed to write recipe file for slug '{}'", existing.getSlug(), e);
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to write recipe file");
        }
        return repository.save(existing);
    }

    public void delete(Long id) {
        findById(id);
        repository.deleteById(id);
    }

    private void writeRecipeFile(Recipe recipe) throws IOException {
        StringBuilder sb = new StringBuilder();
        sb.append("# ").append(recipe.getName()).append("\n");

        boolean hasMeta = recipe.getServings() != null
                || recipe.getPrepTimeMinutes() != null
                || (recipe.getTags() != null && !recipe.getTags().isBlank());
        if (hasMeta) {
            sb.append("\n");
            if (recipe.getServings() != null)
                sb.append("**Serves:** ").append(recipe.getServings()).append("\n");
            if (recipe.getPrepTimeMinutes() != null)
                sb.append("**Time:** ").append(recipe.getPrepTimeMinutes()).append(" min\n");
            if (recipe.getTags() != null && !recipe.getTags().isBlank())
                sb.append("**Tags:** ").append(recipe.getTags()).append("\n");
        }

        if (recipe.getContent() != null && !recipe.getContent().isBlank()) {
            sb.append("\n").append(recipe.getContent());
        }

        Files.writeString(Paths.get(recipesDir, recipe.getSlug() + ".md"), sb.toString());
    }

    private void attachContent(Recipe recipe) {
        Path file = Paths.get(recipesDir, recipe.getSlug() + ".md");
        try {
            String raw = Files.readString(file);
            int firstSection = raw.indexOf("\n## ");
            recipe.setContent(firstSection >= 0 ? raw.substring(firstSection + 1) : raw);
        } catch (IOException e) {
            log.warn("Could not read content for recipe '{}': {}", recipe.getSlug(), e.getMessage());
        }
    }

    private String toSlug(String name) {
        return name.toLowerCase().replaceAll("[^a-z0-9]+", "-").replaceAll("^-|-$", "");
    }
}
