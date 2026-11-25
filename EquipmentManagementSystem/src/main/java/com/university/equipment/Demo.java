package com.university.equipment;

import com.university.equipment.exception.EquipmentNotFoundException;
import com.university.equipment.model.*;
import com.university.equipment.repository.EquipmentRepository;
import com.university.equipment.repository.InMemoryEquipmentRepository;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Non-interactive walkthrough of TP2.1 - TP2.4.
 * Run with (after mvn compile): java -cp target/classes com.university.equipment.Demo
 */
public class Demo {

    public static void main(String[] args) {

        System.out.println("=== TP2.1 - Encapsulation & polymorphism ===");
        Equipment e1 = new Laptop(1001, "Dell Latitude", 16);
        Equipment e2 = new Projector(1002, "Epson Projector", 4000);
        System.out.println(e1);
        System.out.println(e2);
        System.out.println(e1.getStatus());
        System.out.println(e1.getDescription());
        System.out.println(e2.getDescription());

        Equipment sameId = new Laptop(1001, "Another name", 8);
        System.out.println("e1.equals(sameId) -> " + e1.equals(sameId));

        Set<Equipment> set = new HashSet<>();
        set.add(e1);
        set.add(sameId);
        System.out.println("Set size after adding two objects with the same ID: " + set.size());

        try {
            e1.setName("   ");
        } catch (IllegalArgumentException ex) {
            System.out.println("Validation: " + ex.getMessage());
        }

        System.out.println();
        System.out.println("=== TP2.2 - Repository ===");
        EquipmentRepository repository = new InMemoryEquipmentRepository();
        repository.save(e1);
        repository.save(e2);
        repository.save(new Laptop(1003, "HP EliteBook", 32));
        repository.findAll().forEach(System.out::println);

        System.out.println();
        System.out.println("=== TP2.3 - Custom exception ===");
        try {
            Equipment e = repository.findById(5000);
            System.out.println(e);
        } catch (EquipmentNotFoundException e) {
            System.out.println(e.getMessage());
        } finally {
            System.out.println("Search operation completed.");
        }

        System.out.println();
        System.out.println("=== TP2.4 - Streams ===");
        repository.findById(1003).setStatus(Status.LOANED);

        List<Equipment> available = repository.findByStatus(Status.AVAILABLE);
        List<Equipment> computers = repository.findByCategory(Category.COMPUTER);

        System.out.println("Available:");
        available.forEach(System.out::println);
        System.out.println("Computers:");
        computers.forEach(System.out::println);

        List<String> names = repository.findAll().stream()
                .map(Equipment::getName)
                .toList();
        System.out.println("Names: " + names);

        Set<String> categories = repository.findAll().stream()
                .map(e -> e.getCategory().name())
                .collect(Collectors.toSet());
        System.out.println("Categories: " + categories);

        long availableCount = repository.findAll().stream()
                .filter(e -> e.getStatus() == Status.AVAILABLE)
                .count();
        System.out.println("Available count: " + availableCount);
    }
}
