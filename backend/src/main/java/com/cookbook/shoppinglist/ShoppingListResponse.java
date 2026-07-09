package com.cookbook.shoppinglist;

import java.util.List;

public record ShoppingListResponse(
        List<String> items,
        String groupedMarkdown
) {}
