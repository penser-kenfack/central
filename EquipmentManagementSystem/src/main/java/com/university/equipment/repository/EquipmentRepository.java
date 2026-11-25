package com.university.equipment.repository;

import com.university.equipment.model.Category;
import com.university.equipment.model.Equipment;
import com.university.equipment.model.Status;

import java.util.List;

public interface EquipmentRepository {

    List<Equipment> findAll();

    Equipment findById(int id);

    void save(Equipment equipment);

    void delete(int id);

    List<Equipment> findByStatus(Status status);

    List<Equipment> findByCategory(Category category);
}
