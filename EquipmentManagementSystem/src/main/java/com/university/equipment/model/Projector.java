package com.university.equipment.model;

public class Projector extends Equipment {

    private final int lumens;

    public Projector(int id, String name, int lumens) {
        super(id, name, Category.PROJECTOR);

        if (lumens <= 0) {
            throw new IllegalArgumentException("Lumens must be greater than zero.");
        }

        this.lumens = lumens;
    }

    public int getLumens() {
        return lumens;
    }

    @Override
    public String getDescription() {
        return "Projector with " + lumens + " lumens";
    }
}
