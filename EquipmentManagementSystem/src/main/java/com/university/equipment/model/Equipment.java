package com.university.equipment.model;

import java.util.Objects;

public abstract class Equipment {

    private final int id;
    private String name;
    private final Category category;
    private Status status;

    public Equipment(int id, String name, Category category) {
        if (id <= 0) {
            throw new IllegalArgumentException("Equipment ID must be greater than zero.");
        }
        this.id = id;
        setName(name);
        this.category = Objects.requireNonNull(category, "Category cannot be null.");
        this.status = Status.AVAILABLE;
    }

    public int getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("Equipment name cannot be empty.");
        }
        this.name = name.trim();
    }

    public Category getCategory() {
        return category;
    }

    public Status getStatus() {
        return status;
    }

    public void setStatus(Status status) {
        this.status = Objects.requireNonNull(status);
    }

    @Override
    public String toString() {
        return "ID: " + id
                + ", Name: " + name
                + ", Category: " + category
                + ", Status: " + status;
    }

    @Override
    public boolean equals(Object obj) {
        if (this == obj) return true;

        if (!(obj instanceof Equipment other)) {
            return false;
        }

        return id == other.id;
    }

    @Override
    public int hashCode() {
        return Integer.hashCode(id);
    }

    public abstract String getDescription();
}
