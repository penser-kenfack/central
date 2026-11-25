package com.example.exercises;

/** Exercise 3 - An array of five categories, displayed with both kinds of for loop. */
public class Exercise3Categories {

    public static void main(String[] args) {
        String[] categories = {"Computer", "Printer", "Projector", "Network device", "Other"};

        System.out.println("Standard for loop:");
        for (int i = 0; i < categories.length; i++) {
            System.out.println((i + 1) + ". " + categories[i]);
        }

        System.out.println();
        System.out.println("Enhanced for loop:");
        for (String category : categories) {
            System.out.println("- " + category);
        }
    }
}
