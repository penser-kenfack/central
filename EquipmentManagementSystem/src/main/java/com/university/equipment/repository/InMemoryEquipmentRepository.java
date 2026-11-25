package com.university.equipment.repository;

import com.university.equipment.exception.EquipmentNotFoundException;
import com.university.equipment.model.Category;
import com.university.equipment.model.Equipment;
import com.university.equipment.model.Status;

import java.util.*;

public class InMemoryEquipmentRepository implements EquipmentRepository {

    // The equipment ID is the key; saving an existing ID replaces the stored object.
    private final Map<Integer, Equipment> equipmentMap = new HashMap<>();

    @Override
    public List<Equipment> findAll() {
        return new ArrayList<>(equipmentMap.values());
    }

    @Override
    public Equipment findById(int id) {
        Equipment equipment = equipmentMap.get(id);

        if (equipment == null) {
            throw new EquipmentNotFoundException(
                    "Equipment with ID " + id + " was not found."
            );
        }

        return equipment;
    }

    @Override
    public void save(Equipment equipment) {
        Objects.requireNonNull(equipment, "Equipment cannot be null.");
        equipmentMap.put(equipment.getId(), equipment);
    }

    @Override
    public void delete(int id) {
        findById(id);
        equipmentMap.remove(id);
    }

    @Override
    public List<Equipment> findByStatus(Status status) {
        return equipmentMap.values()
                .stream()
                .filter(e -> e.getStatus() == status)
                .toList();
    }

    @Override
    public List<Equipment> findByCategory(Category category) {
        return equipmentMap.values()
                .stream()
                .filter(e -> e.getCategory() == category)
                .toList();
    }
}
