package com.university.equipment;

import com.university.equipment.repository.EquipmentRepository;
import com.university.equipment.repository.InMemoryEquipmentRepository;
import com.university.equipment.service.EquipmentService;
import com.university.equipment.ui.ConsoleMenu;

import java.util.Scanner;

public class Main {

    public static void main(String[] args) {
        // Dependency injection: the service receives its repository through its constructor.
        EquipmentRepository repository = new InMemoryEquipmentRepository();
        EquipmentService service = new EquipmentService(repository);

        try (Scanner scanner = new Scanner(System.in)) {
            new ConsoleMenu(service, scanner).start();
        }
    }
}
