package com.university.equipment.model;

/**
 * Concrete equipment for categories that have no dedicated subclass
 * (PRINTER, NETWORK_DEVICE, OTHER).
 */
public class GenericEquipment extends Equipment {

    public GenericEquipment(int id, String name, Category category) {
        super(id, name, category);
    }

    @Override
    public String getDescription() {
        return switch (getCategory()) {
            case PRINTER -> "Printer";
            case NETWORK_DEVICE -> "Network device";
            case COMPUTER -> "Computer";
            case PROJECTOR -> "Projector";
            case OTHER -> "Other equipment";
        };
    }
}
