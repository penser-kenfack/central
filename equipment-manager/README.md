# Equipment Manager (Chapter 2 – TP1)

Java 21 console application: `Equipment` (fields only) + `Main` (menu with `switch`,
`ArrayList<Equipment>`, search by name with a loop, `Scanner` input).

## Run

```
mvn compile
java -cp target/classes com.example.equipment.Main
```

Or in IntelliJ: right-click `Main` → Run 'Main.main()'.

## Git history (one commit per TP step)

1. Create Equipment class with basic fields
2. Add console menu for equipment management
3. Store equipment in ArrayList
4. Implement equipment search by name
5. Add chapter 2 coding exercises 1-5
6. Validate that equipment name is not empty (exercise 6)

## Final test plan (all passing)

| Test | Action | Result |
|------|--------|--------|
| T1 | Start the program | Menu appears |
| T2 | List with an empty list | "No equipment recorded." |
| T3 | Add a laptop | "Equipment added successfully." |
| T4 | List equipment | `1 \| Laptop \| Computer \| Available` |
| T5 | Search for Laptop | Item is found |
| T6 | Search for LAPTOP | Item is found |
| T7 | Search for an unknown name | "No equipment found with that name." |
| T8 | Quit | "Goodbye!" |

## Exercises (`com.example.exercises`)

| Class | Exercise |
|-------|----------|
| `Exercise1PersonalInfo` | Name, age, city → formatted summary |
| `Exercise2Availability` | No stock / Low stock (1–5) / Sufficient stock (>5) |
| `Exercise3Categories` | Array of 5 categories with standard and enhanced for loops |
| `Exercise4SearchList` | Case-insensitive search in an `ArrayList<String>` |
| `Exercise5RefactorMenu` | Menu display extracted into `displayMenu()` |
| Exercise 6 | In `Main`: empty equipment names are rejected |
