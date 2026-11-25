# Equipment Management System (Chapter 3 – TP2)

Console-based Java 17 application: OOP, collections, Streams, exceptions and JUnit 5 tests.

## Run (Windows CMD or any terminal)

```
java -version
mvn --version
mvn clean compile       # BUILD SUCCESS
mvn test                # 24 tests, 0 failures
mvn exec:java           # interactive menu
java -cp target/classes com.university.equipment.Demo   # TP2.1–TP2.4 walkthrough
```

## Structure

| Package      | Contents |
|--------------|----------|
| `model`      | `Equipment` (abstract, encapsulated, equals/hashCode on ID), `Laptop`, `Projector`, `GenericEquipment` (printer / network device / other), `Category` & `Status` enums, `EquipmentSummary` record |
| `repository` | `EquipmentRepository` interface, `InMemoryEquipmentRepository` (`HashMap<Integer, Equipment>`, stream filters) |
| `service`    | `EquipmentService` – business rules (loan only if AVAILABLE, return only if LOANED, broken handling, ID generation from 1001, statistics) |
| `exception`  | `EquipmentNotFoundException` (unchecked) |
| `ui`         | `ConsoleMenu` – Scanner menu, options 0–11; handles invalid input (`InputMismatchException`) and business errors without crashing |

## TP checklist

- **TP2.1** Encapsulation: private fields, `final` id/category, validated `setName`, `setStatus`, `toString`, `equals`/`hashCode`, enums, default status AVAILABLE.
- **TP2.2** Repository interface + Map-based implementation; saving an existing ID updates it.
- **TP2.3** `EquipmentNotFoundException extends RuntimeException`, thrown by `findById`.
- **TP2.4** `findByStatus` / `findByCategory` with Streams.
- **TP2.5** Tests: save, find existing, find missing (throws), delete, filter by status, filter by category, update with same ID, plus service tests (refuses loaning loaned/broken equipment, returns, statistics) and model tests.

---

# Chapter 4 – TP3: Desktop GUI (Swing + JavaFX)

Both GUIs reuse the Chapter 3 model and `InMemoryEquipmentRepository`.
As the TP requires, the logic is **intentionally** written inside the event handlers
(no service layer); this is refactored in a later chapter.

| Package / file | Contents |
|---|---|
| `gui/swing/EquipmentTableModel` | `AbstractTableModel` with columns ID, Name, Category, Status |
| `gui/swing/SwingEquipmentApp` | `JFrame` + `BorderLayout`, `JTable`, **Add** opens a `JOptionPane` dialog (name, category, status), **Delete** with warning if no row, **Refresh**, live search with a `DocumentListener` |
| `gui/javafx/SimpleJavaFXApp` | Step 6.3 – first JavaFX app (label + button) |
| `gui/javafx/JavaFXEquipmentApp` | Loads `equipment-view.fxml` + `equipment.css` |
| `gui/javafx/EquipmentController` | `@FXML` fields, `TableView` columns, ComboBoxes, Add / Delete / Refresh, live search with `textProperty().addListener` + `FilteredList`, selection listener and `Bindings` labels |
| `gui/javafx/Launcher` | Plain `main` that starts the JavaFX app from the IDE |
| `resources/.../equipment-view.fxml` | `BorderPane`, `VBox`, `HBox`, `GridPane`, `TableView`, `TextField`, `ComboBox`, `Button` |
| `resources/.../equipment.css` | JavaFX styling |

## Run

**IntelliJ**
- Swing: right-click `SwingEquipmentApp` → Run.
- JavaFX: right-click **`Launcher`** → Run. (Running `JavaFXEquipmentApp` directly gives
  "JavaFX runtime components are missing" because the project has no `module-info.java`.)

**CMD**
```
mvn clean compile
mvn exec:java -Dexec.mainClass="com.university.equipment.gui.swing.SwingEquipmentApp"
mvn javafx:run
mvn javafx:run -Djavafx.mainClass=com.university.equipment.gui.javafx.SimpleJavaFXApp
```

## Test scenarios (all verified)

| # | Action | Swing | JavaFX |
|---|---|---|---|
| 1 | Add equipment with a valid name | appears in table | appears in table |
| 2 | Add with empty name | error dialog | warning alert |
| 3 | Select a row and delete | row disappears | row disappears |
| 4 | Type in Search | table filters while typing | table filters while typing |
| 5 | Refresh | full list returns, search cleared | full list returns, search cleared |
| 6 | Delete without selecting | warning dialog | warning alert |
