package com.university.equipment.gui.javafx;

import javafx.application.Application;
import javafx.geometry.Pos;
import javafx.scene.Scene;
import javafx.scene.control.Button;
import javafx.scene.control.Label;
import javafx.scene.layout.VBox;
import javafx.stage.Stage;

/** Step 6.3 - first JavaFX application, built in Java code (no FXML). */
public class SimpleJavaFXApp extends Application {

    @Override
    public void start(Stage stage) {

        Label label = new Label("Welcome to JavaFX");

        Button button = new Button("Click me");

        button.setOnAction(e ->
                label.setText("Button clicked!")
        );

        VBox root = new VBox(15, label, button);
        root.setAlignment(Pos.CENTER);

        Scene scene = new Scene(root, 400, 250);

        stage.setTitle("JavaFX Introduction");
        stage.setScene(scene);
        stage.show();
    }

    public static void main(String[] args) {
        launch(args);
    }
}
