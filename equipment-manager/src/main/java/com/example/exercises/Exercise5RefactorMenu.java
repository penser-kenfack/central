package com.example.exercises;

import java.util.Scanner;

/** Exercise 5 - A menu program whose display instructions live in a separate method. */
public class Exercise5RefactorMenu {

    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        int choice;

        do {
            displayMenu();
            choice = Integer.parseInt(scanner.nextLine());

            switch (choice) {
                case 1 -> System.out.println("Hello!");
                case 2 -> System.out.println("Java is fun.");
                case 3 -> System.out.println("Goodbye!");
                default -> System.out.println("Invalid choice.");
            }
        } while (choice != 3);

        scanner.close();
    }

    public static void displayMenu() {
        System.out.println();
        System.out.println("=== MENU ===");
        System.out.println("1. Say hello");
        System.out.println("2. Show a message");
        System.out.println("3. Quit");
        System.out.print("Choose an option: ");
    }
}
