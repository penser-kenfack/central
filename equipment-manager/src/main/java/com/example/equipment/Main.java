package com.example.equipment;

import java.util.Scanner;

public class Main {

    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);

        int choice;

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
                    System.out.println("Listing equipment...");
                    break;

                case 2:
                    System.out.println("Adding equipment...");
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
