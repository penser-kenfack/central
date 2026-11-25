package com.university.equipment.gui.javafx;

/**
 * Starts the JavaFX app from an IDE without "JavaFX runtime components are missing".
 *
 * When the class that has main() extends Application, the java launcher insists on
 * JavaFX being on the module path. Starting from a plain class avoids that check, so
 * in IntelliJ you can simply right-click this class and choose Run.
 */
public class Launcher {

    public static void main(String[] args) {
        JavaFXEquipmentApp.main(args);
    }
}
