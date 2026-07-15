package com.cookbook.mealplan;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;

import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.assertFalse;

@DataJpaTest
class MealPlanRepositoryTest {

    @Autowired
    TestEntityManager em;

    @Autowired
    MealPlanRepository mealPlanRepository;

    @Autowired
    MealPlanEntryRepository entryRepository;

    // Holdout 6: Delete plan → all entries also deleted (cascade)
    @Test
    void deletePlan_cascadesEntriesToDatabase() {
        MealPlan plan = new MealPlan();
        plan.setName("15.07.2026");
        plan.setStartDate(LocalDate.of(2026, 7, 15));
        plan.setDurationDays(1);

        MealPlanEntry entry = new MealPlanEntry();
        entry.setDayIndex(1);
        entry.setMealType(MealPlanEntry.MealType.BREAKFAST);
        entry.setSlotType(MealPlanEntry.SlotType.EAT_OUT);
        entry.setMealPlan(plan);
        plan.getEntries().add(entry);

        plan = em.persistAndFlush(plan);
        Long planId = plan.getId();
        Long entryId = plan.getEntries().get(0).getId();

        mealPlanRepository.deleteById(planId);
        em.flush();
        em.clear();

        assertFalse(entryRepository.existsById(entryId));
    }
}
