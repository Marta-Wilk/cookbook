package com.cookbook.leftover;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface LeftoverRepository extends JpaRepository<Leftover, Long> {
    List<Leftover> findAllByServingsRemainingGreaterThan(int threshold);
    List<Leftover> findBySourcePlanId(Long sourcePlanId);
    void deleteAllBySourcePlanId(Long sourcePlanId);
}
