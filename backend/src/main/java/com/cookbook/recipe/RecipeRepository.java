package com.cookbook.recipe;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface RecipeRepository extends JpaRepository<Recipe, Long> {

    Optional<Recipe> findBySlug(String slug);

    List<Recipe> findByTagsContainingIgnoreCase(String tag);
}
