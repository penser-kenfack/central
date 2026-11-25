package com.university.equipment.model;

/**
 * Concrete equipment without specialised properties (no RAM, no lumens).
 * Used by the console for PRINTER / NETWORK_DEVICE / OTHER and by both GUIs for any category.
 */
public class GenericEquipment extends Equipment {

    public GenericEquipment(int id, String name, Category category) {
        super(id, name, category);
    }

    @Override
    public String getDescription() {
        return categoryDescription();
    }

    private String categoryDescription() {
        return "General equipment: " + getCategory();
    }
}
