package com.example.exercises;

import java.util.Scanner;

/** Exercise 1 - Ask for a name, age and city, then display a formatted summary. */
public class Exercise1PersonalInfo {

    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);

        System.out.print("Enter your name: ");
        String name = scanner.nextLine();

        System.out.print("Enter your age: ");
        int age = Integer.parseInt(scanner.nextLine());

        System.out.print("Enter your city: ");
        String city = scanner.nextLine();

        System.out.println();
        System.out.println("=== PERSONAL SUMMARY ===");
        System.out.printf("Name : %s%n", name);
        System.out.printf("Age  : %d years old%n", age);
        System.out.printf("City : %s%n", city);
        System.out.println(name + " is " + age + " years old and lives in " + city + ".");

        scanner.close();
    }
}
