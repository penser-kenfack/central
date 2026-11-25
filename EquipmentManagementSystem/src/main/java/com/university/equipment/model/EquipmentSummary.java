package com.university.equipment.model;

/** Immutable data carrier for inventory statistics. */
public record EquipmentSummary(
        long total,
        long available,
        long loaned,
        long broken
) {}
