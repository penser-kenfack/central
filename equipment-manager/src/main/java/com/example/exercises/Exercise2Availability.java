package com.example.exercises;

import java.util.Scanner;

/** Exercise 2 - Display the stock level for a number of available items. */
public class Exercise2Availability {

    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);

        System.out.print("Enter the number of available items: ");
        int quantity = Integer.parseInt(scanner.nextLine());

        if (quantity < 0) {
            System.out.println("Invalid quantity.");
        } else if (quantity == 0) {
            System.out.println("No stock");
        } else if (quantity <= 5) {
            System.out.println("Low stock");
        } else {
            System.out.println("Sufficient stock");
        }

        scanner.close();
    }
}
