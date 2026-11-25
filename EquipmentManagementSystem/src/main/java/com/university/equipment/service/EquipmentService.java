package com.university.equipment.service;

import com.university.equipment.model.*;
import com.university.equipment.repository.EquipmentRepository;

import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Business rules. The repository stores equipment; the service enforces
 * operational rules; the console menu only talks to the service.
 */
public class EquipmentService {

    private static final int FIRST_ID = 1001;

    private final EquipmentRepository repository;
    private final Map<Integer, String> borrowers = new HashMap<>();

    public EquipmentService(EquipmentRepository repository) {
        this.repository = repository;
    }

    // ---------- Registration / CRUD ----------

    public Equipment registerLaptop(String name, int ramGB) {
        return store(new Laptop(nextId(), name, ramGB));
    }

    public Equipment registerProjector(String name, int lumens) {
        return store(new Projector(nextId(), name, lumens));
    }

    public Equipment registerEquipment(String name, Category category) {
        return store(new GenericEquipment(nextId(), name, category));
    }

    private Equipment store(Equipment equipment) {
        repository.save(equipment);
        return equipment;
    }

    private int nextId() {
        return repository.findAll().stream()
                .mapToInt(Equipment::getId)
                .max()
                .orElse(FIRST_ID - 1) + 1;
    }

    public List<Equipment> findAll() {
        return repository.findAll().stream()
                .sorted(Comparator.comparingInt(Equipment::getId))
                .toList();
    }

    public Equipment findById(int id) {
        return repository.findById(id);
    }

    public Equipment updateName(int id, String newName) {
        Equipment equipment = repository.findById(id);
        equipment.setName(newName);
        repository.save(equipment);
        return equipment;
    }

    public void delete(int id) {
        Equipment equipment = repository.findById(id);
        if (equipment.getStatus() == Status.LOANED) {
            throw new IllegalStateException("Cannot delete equipment that is currently loaned.");
        }
        repository.delete(id);
        borrowers.remove(id);
    }

    // ---------- Loans ----------

    public void loanEquipment(int id) {
        loanEquipment(id, null);
    }

    /**
     * Rules: equipment must exist (EquipmentNotFoundException otherwise),
     * must be AVAILABLE and not BROKEN; once borrowed its status becomes LOANED.
     */
    public void loanEquipment(int id, String borrower) {
        Equipment equipment = repository.findById(id);

        switch (equipment.getStatus()) {
            case LOANED -> throw new IllegalStateException("Equipment is already loaned.");
            case BROKEN -> throw new IllegalStateException("Equipment is broken and cannot be loaned.");
            case AVAILABLE -> { /* ok */ }
        }

        if (borrower != null) {
            if (borrower.isBlank()) {
                throw new IllegalArgumentException("Borrower name cannot be empty.");
            }
            borrowers.put(id, borrower.trim());
        }

        equipment.setStatus(Status.LOANED);
        repository.save(equipment);
    }

    public void returnEquipment(int id) {
        Equipment equipment = repository.findById(id);

        if (equipment.getStatus() != Status.LOANED) {
            throw new IllegalStateException("Equipment is not currently loaned.");
        }

        borrowers.remove(id);
        equipment.setStatus(Status.AVAILABLE);
        repository.save(equipment);
    }

    public void markAsBroken(int id) {
        Equipment equipment = repository.findById(id);

        if (equipment.getStatus() == Status.BROKEN) {
            throw new IllegalStateException("Equipment is already marked as broken.");
        }

        borrowers.remove(id);
        equipment.setStatus(Status.BROKEN);
        repository.save(equipment);
    }

    public String getBorrower(int id) {
        return borrowers.get(id);
    }

    // ---------- Filters & statistics ----------

    public List<Equipment> filterByCategory(Category category) {
        return repository.findByCategory(category).stream()
                .sorted(Comparator.comparingInt(Equipment::getId))
                .toList();
    }

    public List<Equipment> filterByStatus(Status status) {
        return repository.findByStatus(status).stream()
                .sorted(Comparator.comparingInt(Equipment::getId))
                .toList();
    }

    public EquipmentSummary getStatistics() {
        List<Equipment> all = repository.findAll();
        return new EquipmentSummary(
                all.size(),
                all.stream().filter(e -> e.getStatus() == Status.AVAILABLE).count(),
                all.stream().filter(e -> e.getStatus() == Status.LOANED).count(),
                all.stream().filter(e -> e.getStatus() == Status.BROKEN).count()
        );
    }
}
