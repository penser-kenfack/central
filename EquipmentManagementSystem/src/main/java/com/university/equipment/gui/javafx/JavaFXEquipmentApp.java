package com.university.equipment.gui.javafx;

import javafx.application.Application;
import javafx.fxml.FXMLLoader;
import javafx.scene.Scene;
import javafx.stage.Stage;

/** TP3.2 - JavaFX launcher: loads the FXML view and the CSS stylesheet. */
public class JavaFXEquipmentApp extends Application {

    @Override
    public void start(Stage stage) throws Exception {

        FXMLLoader loader = new FXMLLoader(
                getClass().getResource("equipment-view.fxml")
        );

        Scene scene = new Scene(loader.load(), 950, 650);

        scene.getStylesheets().add(
                getClass().getResource("equipment.css")
                        .toExternalForm()
        );

        stage.setTitle("Equipment Management System - JavaFX");

        stage.setScene(scene);

        stage.show();
    }

    public static void main(String[] args) {
        launch(args);
    }
}
