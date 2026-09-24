package com.cookbook.leftover;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/leftovers")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173")
public class LeftoverController {

    private final LeftoverService service;

    @GetMapping
    public List<Leftover> getAll() {
        return service.findAll();
    }

    @PutMapping("/plan/{planId}")
    public ResponseEntity<Void> replaceForPlan(@PathVariable Long planId, @RequestBody List<Leftover> leftovers) {
        service.replaceForPlan(planId, leftovers);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
