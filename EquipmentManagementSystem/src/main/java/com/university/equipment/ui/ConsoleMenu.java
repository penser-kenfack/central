package com.university.equipment.ui;

import com.university.equipment.exception.EquipmentNotFoundException;
import com.university.equipment.model.Category;
import com.university.equipment.model.Equipment;
import com.university.equipment.model.EquipmentSummary;
import com.university.equipment.model.Status;
import com.university.equipment.service.EquipmentService;

import java.util.InputMismatchException;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Scanner;

/** Handles user input and output in the console. Talks only to the service layer. */
public class ConsoleMenu {

    private static final String LINE = "================================================";

    private final EquipmentService service;
    private final Scanner scanner;

    public ConsoleMenu(EquipmentService service, Scanner scanner) {
        this.service = service;
        this.scanner = scanner;
    }

    public void start() {
        boolean running = true;

        while (running) {
            printMenu();
            int choice;
            try {
                choice = readInt("Choose an option: ");
            } catch (NoSuchElementException e) { // end of input stream
                break;
            }
            System.out.println();

            try {
                switch (choice) {
                    case 1 -> registerEquipment();
                    case 2 -> displayAll();
                    case 3 -> searchById();
                    case 4 -> updateEquipment();
                    case 5 -> deleteEquipment();
                    case 6 -> loanEquipment();
                    case 7 -> returnEquipment();
                    case 8 -> markAsBroken();
                    case 9 -> filterByCategory();
                    case 10 -> filterByStatus();
                    case 11 -> displayStatistics();
                    case 0 -> running = false;
                    default -> System.out.println("ERROR: Invalid option. Please choose between 0 and 11.");
                }
            } catch (EquipmentNotFoundException | IllegalArgumentException | IllegalStateException e) {
                System.out.println("ERROR: " + e.getMessage());
                System.out.println();
                System.out.println("Operation cancelled.");
            } catch (NoSuchElementException e) {
                break;
            }
            System.out.println();
        }

        System.out.println("Goodbye!");
    }

    private void printMenu() {
        System.out.println(LINE);
        System.out.println("      EQUIPMENT MANAGEMENT SYSTEM");
        System.out.println(LINE);
        System.out.println();
        System.out.println("1. Register new equipment");
        System.out.println("2. Display all equipment");
        System.out.println("3. Search equipment by ID");
        System.out.println("4. Update equipment information");
        System.out.println("5. Delete equipment");
        System.out.println("6. Loan equipment");
        System.out.println("7. Return equipment");
        System.out.println("8. Mark equipment as broken");
        System.out.println("9. Filter equipment by category");
        System.out.println("10. Filter equipment by status");
        System.out.println("11. Display inventory statistics");
        System.out.println("0. Exit");
        System.out.println();
    }

    // ---------- Actions ----------

    private void registerEquipment() {
        System.out.println("---------- REGISTER EQUIPMENT ----------");
        System.out.println();
        String name = readLine("Enter equipment name: ");
        System.out.println();
        Category category = chooseCategory();

        Equipment equipment = switch (category) {
            case COMPUTER -> service.registerLaptop(name, readInt("Enter RAM (GB): "));
            case PROJECTOR -> service.registerProjector(name, readInt("Enter brightness (lumens): "));
            default -> service.registerEquipment(name, category);
        };

        System.out.println();
        System.out.println("Equipment registered successfully!");
        System.out.println();
        printDetails(equipment);
    }

    private void displayAll() {
        System.out.println("---------- ALL EQUIPMENT ----------");
        printList(service.findAll());
    }

    private void searchById() {
        System.out.println("---------- SEARCH EQUIPMENT ----------");
        System.out.println();
        try {
            Equipment equipment = service.findById(readInt("Enter equipment ID: "));
            System.out.println();
            printDetails(equipment);
        } finally {
            System.out.println("Search operation completed.");
        }
    }

    private void updateEquipment() {
        System.out.println("---------- UPDATE EQUIPMENT ----------");
        System.out.println();
        int id = readInt("Enter equipment ID: ");
        Equipment equipment = service.findById(id);
        System.out.println("Current name: " + equipment.getName());
        String newName = readLine("Enter new name: ");
        service.updateName(id, newName);
        System.out.println();
        System.out.println("Equipment updated successfully!");
        printDetails(equipment);
    }

    private void deleteEquipment() {
        System.out.println("---------- DELETE EQUIPMENT ----------");
        System.out.println();
        int id = readInt("Enter equipment ID: ");
        Equipment equipment = service.findById(id);
        String answer = readLine("Delete \"" + equipment.getName() + "\"? (y/n): ");
        if (answer.equalsIgnoreCase("y")) {
            service.delete(id);
            System.out.println("Equipment deleted.");
        } else {
            System.out.println("Operation cancelled.");
        }
    }

    private void loanEquipment() {
        System.out.println("---------- LOAN EQUIPMENT ----------");
        System.out.println();
        int id = readInt("Enter equipment ID: ");
        Equipment equipment = service.findById(id);

        // Check rules before asking for the borrower name.
        if (equipment.getStatus() != Status.AVAILABLE) {
            service.loanEquipment(id); // throws with the appropriate message
        }

        System.out.println();
        System.out.println("Equipment: " + equipment.getName());
        System.out.println("Current status: " + equipment.getStatus());
        System.out.println();
        String borrower = readLine("Enter borrower name: ");
        service.loanEquipment(id, borrower);

        System.out.println();
        System.out.println("Equipment successfully loaned to " + borrower.trim() + ".");
        System.out.println();
        System.out.println("New status: " + equipment.getStatus());
    }

    private void returnEquipment() {
        System.out.println("---------- RETURN EQUIPMENT ----------");
        System.out.println();
        int id = readInt("Enter equipment ID: ");
        String borrower = service.getBorrower(id);
        service.returnEquipment(id);
        Equipment equipment = service.findById(id);
        System.out.println();
        System.out.println("Equipment \"" + equipment.getName() + "\" returned"
                + (borrower != null ? " by " + borrower : "") + ".");
        System.out.println("New status: " + equipment.getStatus());
    }

    private void markAsBroken() {
        System.out.println("---------- MARK AS BROKEN ----------");
        System.out.println();
        int id = readInt("Enter equipment ID: ");
        service.markAsBroken(id);
        Equipment equipment = service.findById(id);
        System.out.println();
        System.out.println("Equipment \"" + equipment.getName() + "\" marked as broken.");
        System.out.println("New status: " + equipment.getStatus());
    }

    private void filterByCategory() {
        System.out.println("---------- FILTER BY CATEGORY ----------");
        System.out.println();
        Category category = chooseCategory();
        System.out.println();
        printList(service.filterByCategory(category));
    }

    private void filterByStatus() {
        System.out.println("---------- FILTER BY STATUS ----------");
        System.out.println();
        Status[] statuses = Status.values();
        System.out.println("Select status:");
        for (int i = 0; i < statuses.length; i++) {
            System.out.println((i + 1) + ". " + statuses[i]);
        }
        System.out.println();
        int choice = readInt("Choose status: ");
        if (choice < 1 || choice > statuses.length) {
            throw new IllegalArgumentException("Invalid status choice.");
        }
        System.out.println();
        printList(service.filterByStatus(statuses[choice - 1]));
    }

    private void displayStatistics() {
        EquipmentSummary s = service.getStatistics();
        System.out.println("---------- INVENTORY STATISTICS ----------");
        System.out.println();
        System.out.println("Total equipment : " + s.total());
        System.out.println("Available       : " + s.available());
        System.out.println("Loaned          : " + s.loaned());
        System.out.println("Broken          : " + s.broken());
    }

    // ---------- Helpers ----------

    private Category chooseCategory() {
        Category[] categories = Category.values();
        System.out.println("Select category:");
        for (int i = 0; i < categories.length; i++) {
            System.out.println((i + 1) + ". " + categories[i]);
        }
        System.out.println();
        int choice = readInt("Choose category: ");
        if (choice < 1 || choice > categories.length) {
            throw new IllegalArgumentException("Invalid category choice.");
        }
        return categories[choice - 1];
    }

    private void printDetails(Equipment e) {
        System.out.println("ID: " + e.getId());
        System.out.println("Name: " + e.getName());
        System.out.println("Category: " + e.getCategory());
        System.out.println("Status: " + e.getStatus());
        System.out.println("Description: " + e.getDescription());
        String borrower = service.getBorrower(e.getId());
        if (borrower != null) {
            System.out.println("Borrower: " + borrower);
        }
    }

    private void printList(List<Equipment> list) {
        if (list.isEmpty()) {
            System.out.println("No equipment found.");
            return;
        }
        list.forEach(System.out::println);
        System.out.println("(" + list.size() + " item(s))");
    }

    /** Reads an integer, re-prompting on invalid input (InputMismatchException). */
    private int readInt(String prompt) {
        while (true) {
            System.out.print(prompt);
            try {
                int value = scanner.nextInt();
                scanner.nextLine(); // consume end of line
                return value;
            } catch (InputMismatchException e) {
                scanner.nextLine(); // discard the invalid token
                System.out.println("ERROR: Please enter a valid number.");
            }
        }
    }

    private String readLine(String prompt) {
        System.out.print(prompt);
        return scanner.nextLine();
    }
}
