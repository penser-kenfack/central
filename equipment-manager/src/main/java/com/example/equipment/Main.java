package com.example.equipment;

import java.util.ArrayList;
import java.util.Scanner;

public class Main {

    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        ArrayList<Equipment> equipmentList = new ArrayList<>();

        int choice;
        int nextId = 1;

        do {
            System.out.println();
            System.out.println("=== EQUIPMENT MANAGER ===");
            System.out.println("1. List equipment");
            System.out.println("2. Add equipment");
            System.out.println("3. Quit");
            System.out.print("Choose an option: ");

            choice = Integer.parseInt(scanner.nextLine());

            switch (choice) {
                case 1:
                    if (equipmentList.isEmpty()) {
                        System.out.println("No equipment recorded.");
                    } else {
                        for (Equipment equipment : equipmentList) {
                            System.out.println(
                                equipment.id + " | "
                                + equipment.name + " | "
                                + equipment.category + " | "
                                + (equipment.available
                                    ? "Available"
                                    : "Unavailable")
                            );
                        }
                    }
                    break;

                case 2:
                    Equipment equipment = new Equipment();

                    equipment.id = nextId++;

                    System.out.print("Enter equipment name: ");
                    equipment.name = scanner.nextLine();

                    System.out.print("Enter category: ");
                    equipment.category = scanner.nextLine();

                    System.out.print("Is it available? (true/false): ");
                    equipment.available =
                        Boolean.parseBoolean(scanner.nextLine());

                    equipmentList.add(equipment);

                    System.out.println("Equipment added successfully.");
                    break;

                case 3:
                    System.out.println("Goodbye!");
                    break;

                default:
                    System.out.println("Invalid choice.");
            }

        } while (choice != 3);

        scanner.close();
    }
}
