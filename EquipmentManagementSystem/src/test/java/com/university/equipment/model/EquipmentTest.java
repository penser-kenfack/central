package com.university.equipment.model;

import org.junit.jupiter.api.Test;

import java.util.HashSet;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

class EquipmentTest {

    @Test
    void newEquipmentShouldBeAvailable() {
        assertEquals(Status.AVAILABLE, new Laptop(1001, "Dell Latitude", 16).getStatus());
    }

    @Test
    void equalityShouldBeBasedOnId() {
        Equipment a = new Laptop(1001, "Dell Latitude", 16);
        Equipment b = new Laptop(1001, "Another name", 8);

        assertEquals(a, b);
        assertEquals(a.hashCode(), b.hashCode());

        Set<Equipment> set = new HashSet<>();
        set.add(a);
        set.add(b);
        assertEquals(1, set.size());
    }

    @Test
    void shouldRejectInvalidValues() {
        assertThrows(IllegalArgumentException.class, () -> new Laptop(1001, " ", 16));
        assertThrows(IllegalArgumentException.class, () -> new Laptop(1001, "Dell", 0));
        assertThrows(IllegalArgumentException.class, () -> new Projector(1002, "Epson", -1));
        assertThrows(NullPointerException.class, () -> new Laptop(1001, "Dell", 16).setStatus(null));
    }

    @Test
    void descriptionShouldBePolymorphic() {
        Equipment laptop = new Laptop(1001, "Dell Latitude", 16);
        Equipment projector = new Projector(1002, "Epson Projector", 4000);

        assertEquals("Laptop with 16GB RAM", laptop.getDescription());
        assertEquals("Projector with 4000 lumens", projector.getDescription());
    }

    @Test
    void toStringShouldContainAllFields() {
        assertEquals("ID: 1001, Name: Dell Latitude, Category: COMPUTER, Status: AVAILABLE",
                new Laptop(1001, "Dell Latitude", 16).toString());
    }
}
