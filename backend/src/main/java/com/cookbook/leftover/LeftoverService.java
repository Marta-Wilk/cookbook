package com.cookbook.leftover;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class LeftoverService {

    private final LeftoverRepository repository;

    public List<Leftover> findAll() {
        return repository.findAllByServingsRemainingGreaterThan(0);
    }

    @Transactional
    public void replaceForPlan(Long planId, List<Leftover> data) {
        List<Leftover> existing = repository.findBySourcePlanId(planId);
        java.util.Map<String, Leftover> bySlug = existing.stream()
                .collect(Collectors.toMap(Leftover::getRecipeSlug, l -> l));

        List<String> incomingSlugs = data.stream()
                .filter(l -> l.getServingsRemaining() > 0)
                .map(Leftover::getRecipeSlug)
                .collect(Collectors.toList());

        existing.stream()
                .filter(l -> !incomingSlugs.contains(l.getRecipeSlug()))
                .forEach(l -> repository.deleteById(l.getId()));

        data.stream()
                .filter(l -> l.getServingsRemaining() > 0)
                .forEach(l -> {
                    Leftover record = bySlug.getOrDefault(l.getRecipeSlug(),
                            new Leftover(planId, l.getRecipeSlug(), l.getRecipeName(), 0));
                    record.setServingsRemaining(l.getServingsRemaining());
                    record.setRecipeName(l.getRecipeName());
                    repository.save(record);
                });
    }

    @Transactional
    public void deleteAllByPlan(Long planId) {
        repository.deleteAllBySourcePlanId(planId);
    }

    public void delete(Long id) {
        if (!repository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Leftover not found: " + id);
        }
        repository.deleteById(id);
    }
}
