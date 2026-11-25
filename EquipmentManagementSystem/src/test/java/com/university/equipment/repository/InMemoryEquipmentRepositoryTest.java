package com.university.equipment.repository;

import com.university.equipment.exception.EquipmentNotFoundException;
import com.university.equipment.model.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class InMemoryEquipmentRepositoryTest {

    private EquipmentRepository repository;

    @BeforeEach
    void setUp() {
        repository = new InMemoryEquipmentRepository();
    }

    @Test
    void shouldSaveEquipment() {
        Equipment laptop = new Laptop(1001, "Dell Latitude", 16);

        repository.save(laptop);

        assertEquals(1, repository.findAll().size());
        assertEquals(laptop, repository.findById(1001));
    }

    @Test
    void shouldFindAllEquipment() {
        repository.save(new Laptop(1001, "Dell Latitude", 16));
        repository.save(new Projector(1002, "Epson", 4000));

        assertEquals(2, repository.findAll().size());
    }

    @Test
    void shouldReturnCorrectEquipmentForExistingId() {
        repository.save(new Laptop(1001, "Dell Latitude", 16));
        repository.save(new Projector(1002, "Epson", 4000));

        Equipment found = repository.findById(1002);

        assertNotNull(found);
        assertEquals(1002, found.getId());
        assertEquals("Epson", found.getName());
        assertInstanceOf(Projector.class, found);
    }

    @Test
    void shouldThrowExceptionWhenEquipmentDoesNotExist() {
        EquipmentNotFoundException ex = assertThrows(
                EquipmentNotFoundException.class,
                () -> repository.findById(9999)
        );
        assertEquals("Equipment with ID 9999 was not found.", ex.getMessage());
    }

    @Test
    void shouldDeleteEquipment() {
        repository.save(new Laptop(1001, "Dell Latitude", 16));

        repository.delete(1001);

        assertEquals(0, repository.findAll().size());
        assertThrows(EquipmentNotFoundException.class, () -> repository.findById(1001));
    }

    @Test
    void shouldThrowWhenDeletingNonexistentEquipment() {
        assertThrows(EquipmentNotFoundException.class, () -> repository.delete(4242));
    }

    @Test
    void shouldUpdateEquipmentWithSameId() {
        repository.save(new Laptop(1001, "Dell Latitude", 16));
        repository.save(new Laptop(1001, "Dell Latitude Updated", 32));

        assertEquals(1, repository.findAll().size());
        assertEquals("Dell Latitude Updated", repository.findById(1001).getName());
    }

    @Test
    void shouldFilterByStatus() {
        Equipment laptop = new Laptop(1001, "Dell Latitude", 16);
        Equipment projector = new Projector(1002, "Epson", 4000);
        Equipment loaned = new Laptop(1003, "HP EliteBook", 8);
        loaned.setStatus(Status.LOANED);
        repository.save(laptop);
        repository.save(projector);
        repository.save(loaned);

        List<Equipment> available = repository.findByStatus(Status.AVAILABLE);

        assertEquals(2, available.size());
        assertTrue(available.stream().allMatch(e -> e.getStatus() == Status.AVAILABLE));
        assertEquals(List.of(loaned), repository.findByStatus(Status.LOANED));
        assertTrue(repository.findByStatus(Status.BROKEN).isEmpty());
    }

    @Test
    void shouldFilterByCategory() {
        repository.save(new Laptop(1001, "Dell Latitude", 16));
        repository.save(new Projector(1002, "Epson", 4000));
        repository.save(new Laptop(1003, "HP EliteBook", 8));

        List<Equipment> computers = repository.findByCategory(Category.COMPUTER);

        assertEquals(2, computers.size());
        assertTrue(computers.stream().allMatch(e -> e.getCategory() == Category.COMPUTER));
        assertEquals(1, repository.findByCategory(Category.PROJECTOR).size());
        assertTrue(repository.findByCategory(Category.PRINTER).isEmpty());
    }
}
