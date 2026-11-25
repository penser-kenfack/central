package com.example.equipment;

import java.util.ArrayList;
import java.util.Scanner;

public class Main {

    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        ArrayList<Equipment> equipmentList = new ArrayList<>();

        int nextId = 1;
        int choice;

        do {
            System.out.println();
            System.out.println("=== EQUIPMENT MANAGER ===");
            System.out.println("1. List equipment");
            System.out.println("2. Add equipment");
            System.out.println("3. Search equipment by name");
            System.out.println("4. Quit");
            System.out.print("Choose an option: ");

            choice = Integer.parseInt(scanner.nextLine());

            switch (choice) {
                case 1:
                    if (equipmentList.isEmpty()) {
                        System.out.println("No equipment recorded.");
                    } else {
                        for (Equipment equipment : equipmentList) {
                            displayEquipment(equipment);
                        }
                    }
                    break;

                case 2:
                    Equipment equipment = new Equipment();

                    equipment.id = nextId++;

                    System.out.print("Enter equipment name: ");
                    String name = scanner.nextLine().trim();

                    // Exercise 6: an empty name is not accepted.
                    while (name.isEmpty()) {
                        System.out.println("Equipment name cannot be empty.");
                        System.out.print("Enter equipment name: ");
                        name = scanner.nextLine().trim();
                    }
                    equipment.name = name;

                    System.out.print("Enter category: ");
                    equipment.category = scanner.nextLine();

                    System.out.print("Is it available? (true/false): ");
                    equipment.available =
                        Boolean.parseBoolean(scanner.nextLine());

                    equipmentList.add(equipment);

                    System.out.println("Equipment added successfully.");
                    break;

                case 3:
                    System.out.print("Enter equipment name to search: ");
                    String searchName = scanner.nextLine();

                    Equipment found =
                        findEquipmentByName(equipmentList, searchName);

                    if (found != null) {
                        System.out.println("Equipment found:");
                        displayEquipment(found);
                    } else {
                        System.out.println(
                            "No equipment found with that name."
                        );
                    }
                    break;

                case 4:
                    System.out.println("Goodbye!");
                    break;

                default:
                    System.out.println("Invalid choice.");
            }

        } while (choice != 4);

        scanner.close();
    }

    public static Equipment findEquipmentByName(
            ArrayList<Equipment> equipmentList,
            String searchName) {

        for (Equipment equipment : equipmentList) {
            if (equipment.name != null
                    && equipment.name.equalsIgnoreCase(searchName)) {
                return equipment;
            }
        }

        return null;
    }

    public static void displayEquipment(Equipment equipment) {
        System.out.println(
            equipment.id + " | "
            + equipment.name + " | "
            + equipment.category + " | "
            + (equipment.available ? "Available" : "Unavailable")
        );
    }
}
