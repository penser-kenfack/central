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
