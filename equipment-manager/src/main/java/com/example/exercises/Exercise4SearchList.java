package com.example.exercises;

import java.util.ArrayList;
import java.util.Scanner;

/** Exercise 4 - Search an ArrayList<String> of names without case sensitivity. */
public class Exercise4SearchList {

    public static void main(String[] args) {
        ArrayList<String> names = new ArrayList<>();
        names.add("Laptop");
        names.add("Printer");
        names.add("Projector");
        names.add("Router");

        Scanner scanner = new Scanner(System.in);
        System.out.print("Enter a name to search: ");
        String searchName = scanner.nextLine();

        boolean found = false;
        for (int i = 0; i < names.size(); i++) {
            if (names.get(i).equalsIgnoreCase(searchName)) {
                System.out.println("Found \"" + names.get(i) + "\" at position " + i + ".");
                found = true;
                break;
            }
        }

        if (!found) {
            System.out.println("\"" + searchName + "\" is not in the list.");
        }

        scanner.close();
    }
}
