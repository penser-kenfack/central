package com.university.equipment.model;

public class Laptop extends Equipment {

    private final int ramGB;

    public Laptop(int id, String name, int ramGB) {
        super(id, name, Category.COMPUTER);

        if (ramGB <= 0) {
            throw new IllegalArgumentException("RAM must be greater than zero.");
        }

        this.ramGB = ramGB;
    }

    public int getRamGB() {
        return ramGB;
    }

    @Override
    public String getDescription() {
        return "Laptop with " + ramGB + "GB RAM";
    }
}
