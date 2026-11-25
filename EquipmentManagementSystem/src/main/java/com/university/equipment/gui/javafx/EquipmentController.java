package com.university.equipment.gui.javafx;

import javafx.beans.binding.Bindings;
import javafx.fxml.FXML;
import javafx.collections.FXCollections;
import javafx.collections.ObservableList;
import javafx.collections.transformation.FilteredList;
import javafx.collections.transformation.SortedList;

import javafx.scene.control.*;
import javafx.scene.control.cell.PropertyValueFactory;

import com.university.equipment.model.*;
import com.university.equipment.repository.*;

/**
 * TP3.2 - Controller for equipment-view.fxml.
 *
 * NOTE: as required by the TP, the application logic is INTENTIONALLY placed
 * directly inside the event handlers (addEquipment, deleteEquipment...).
 */
public class EquipmentController {

    @FXML
    private TableView<Equipment> equipmentTable;

    @FXML
    private TableColumn<Equipment, Integer> idColumn;

    @FXML
    private TableColumn<Equipment, String> nameColumn;

    @FXML
    private TableColumn<Equipment, Category> categoryColumn;

    @FXML
    private TableColumn<Equipment, Status> statusColumn;

    @FXML
    private TextField nameField;

    @FXML
    private TextField searchField;

    @FXML
    private ComboBox<Category> categoryCombo;

    @FXML
    private ComboBox<Status> statusCombo;

    @FXML
    private Label selectedEquipmentLabel;

    @FXML
    private Label selectionLabel;

    @FXML
    private Label countLabel;

    private final EquipmentRepository repository =
            new InMemoryEquipmentRepository();

    private final ObservableList<Equipment> masterData =
            FXCollections.observableArrayList();

    private FilteredList<Equipment> filteredData;

    private int nextId = 1001;

    @FXML
    public void initialize() {

        // Configure table columns
        idColumn.setCellValueFactory(
                new PropertyValueFactory<>("id")
        );

        nameColumn.setCellValueFactory(
                new PropertyValueFactory<>("name")
        );

        categoryColumn.setCellValueFactory(
                new PropertyValueFactory<>("category")
        );

        statusColumn.setCellValueFactory(
                new PropertyValueFactory<>("status")
        );

        // Populate combo boxes
        categoryCombo.setItems(
                FXCollections.observableArrayList(
                        Category.values()
                )
        );

        statusCombo.setItems(
                FXCollections.observableArrayList(
                        Status.values()
                )
        );

        categoryCombo.getSelectionModel()
                .select(Category.COMPUTER);

        statusCombo.getSelectionModel()
                .select(Status.AVAILABLE);

        // Load data from repository
        loadSampleData();
        masterData.setAll(repository.findAll());

        // Create live filtering collection
        filteredData = new FilteredList<>(
                masterData,
                equipment -> true
        );

        // Sorted view on top of the filter, so clicking a column header still sorts
        SortedList<Equipment> sortedData = new SortedList<>(filteredData);
        sortedData.comparatorProperty().bind(equipmentTable.comparatorProperty());
        equipmentTable.setItems(sortedData);
        equipmentTable.getSortOrder().add(idColumn);

        // Live search
        searchField.textProperty().addListener(
                (observable, oldValue, newValue) -> {

                    filteredData.setPredicate(equipment -> {

                        if (newValue == null
                                || newValue.isBlank()) {
                            return true;
                        }

                        return equipment.getName()
                                .toLowerCase()
                                .contains(newValue.toLowerCase());
                    });
                }
        );

        // 12.2 - Listener on an observable property (the selected row)
        equipmentTable.getSelectionModel()
                .selectedItemProperty()
                .addListener((observable, oldValue, newValue) -> {

                    if (newValue == null) {
                        selectedEquipmentLabel.setText(
                                "No equipment selected"
                        );
                    } else {
                        selectedEquipmentLabel.setText(
                                "Selected: " + newValue.getName()
                                        + " | ID: " + newValue.getId()
                        );
                    }
                });

        // 12.2 - Direct binding: the label text is computed from the selection
        selectionLabel.textProperty().bind(
                Bindings.createStringBinding(
                        () -> {

                            Equipment selected =
                                    equipmentTable.getSelectionModel()
                                            .getSelectedItem();

                            if (selected == null) {
                                return "No equipment selected";
                            }

                            return "Selected equipment: "
                                    + selected.getName()
                                    + " (ID: " + selected.getId() + ")";
                        },
                        equipmentTable.getSelectionModel()
                                .selectedItemProperty()
                )
        );

        // Binding: "Showing X of Y" follows both observable lists
        countLabel.textProperty().bind(
                Bindings.createStringBinding(
                        () -> "Showing " + filteredData.size()
                                + " of " + masterData.size() + " equipment",
                        filteredData,
                        masterData
                )
        );
    }

    @FXML
    private void addEquipment() {

        String name = nameField.getText().trim();

        if (name.isEmpty()) {

            showMessage(
                    Alert.AlertType.WARNING,
                    "Validation Error",
                    "Equipment name is required."
            );

            return;
        }

        Category category =
                categoryCombo.getValue();

        Status status =
                statusCombo.getValue();

        Equipment equipment = new GenericEquipment(
                nextId++,
                name,
                category
        );

        equipment.setStatus(status);

        repository.save(equipment);

        masterData.setAll(repository.findAll());

        nameField.clear();

        showMessage(
                Alert.AlertType.INFORMATION,
                "Success",
                "Equipment added successfully."
        );
    }

    @FXML
    private void deleteEquipment() {

        Equipment selected =
                equipmentTable.getSelectionModel()
                        .getSelectedItem();

        if (selected == null) {

            showMessage(
                    Alert.AlertType.WARNING,
                    "Selection Required",
                    "Please select equipment to delete."
            );

            return;
        }

        repository.delete(selected.getId());

        masterData.setAll(repository.findAll());

        showMessage(
                Alert.AlertType.INFORMATION,
                "Success",
                "Equipment deleted successfully."
        );
    }

    @FXML
    private void refreshEquipment() {

        masterData.setAll(repository.findAll());

        searchField.clear();
    }

    private void showMessage(
            Alert.AlertType type,
            String title,
            String message) {

        Alert alert = new Alert(type);

        alert.setTitle(title);
        alert.setHeaderText(null);
        alert.setContentText(message);

        alert.showAndWait();
    }

    /** Two sample rows so the table is not empty on start. */
    private void loadSampleData() {

        Equipment laptop = new GenericEquipment(
                nextId++, "Dell Latitude", Category.COMPUTER);

        Equipment projector = new GenericEquipment(
                nextId++, "Epson Projector", Category.PROJECTOR);
        projector.setStatus(Status.LOANED);

        repository.save(laptop);
        repository.save(projector);
    }
}
