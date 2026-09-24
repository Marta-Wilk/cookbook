package com.cookbook.leftover;

import jakarta.persistence.*;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(
    name = "leftovers",
    uniqueConstraints = @UniqueConstraint(columnNames = {"source_plan_id", "recipe_slug"})
)
@Getter
@Setter
@NoArgsConstructor
public class Leftover {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "source_plan_id", nullable = false)
    private Long sourcePlanId;

    @NotBlank
    @Column(name = "recipe_slug", nullable = false)
    private String recipeSlug;

    @NotBlank
    private String recipeName;

    @Min(0)
    private int servingsRemaining;

    public Leftover(Long sourcePlanId, String recipeSlug, String recipeName, int servingsRemaining) {
        this.sourcePlanId = sourcePlanId;
        this.recipeSlug = recipeSlug;
        this.recipeName = recipeName;
        this.servingsRemaining = servingsRemaining;
    }
}
