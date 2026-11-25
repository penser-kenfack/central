package com.university.equipment.gui.swing;

import javax.swing.*;
import javax.swing.event.DocumentEvent;
import javax.swing.event.DocumentListener;
import java.awt.*;
import java.util.Comparator;
import java.util.List;

import com.university.equipment.model.*;
import com.university.equipment.repository.*;

/**
 * TP3.1 - Swing version.
 *
 * NOTE: as required by the TP, the application logic (validation, object creation,
 * repository access) is INTENTIONALLY written directly inside the event handlers.
 * This will be refactored into a controller/service layer in a later chapter.
 */
public class SwingEquipmentApp {

    private final EquipmentRepository repository =
            new InMemoryEquipmentRepository();

    private JFrame frame;

    private JTable table;
    private EquipmentTableModel tableModel;

    private JTextField searchField;

    private int nextId = 1001;

    public static void main(String[] args) {

        // All Swing work happens on the Event Dispatch Thread (EDT).
        SwingUtilities.invokeLater(() -> {
            new SwingEquipmentApp().createGUI();
        });
    }

    private void createGUI() {

        loadSampleData();

        frame = new JFrame(
                "Equipment Management System - Swing"
        );

        frame.setSize(900, 600);
        frame.setMinimumSize(new Dimension(650, 400));
        frame.setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
        frame.setLocationRelativeTo(null);

        frame.setLayout(new BorderLayout(10, 10));

        // TOP: title + search panel
        JPanel topPanel = new JPanel(new BorderLayout());

        JLabel title = new JLabel("Equipment Management System");
        title.setFont(title.getFont().deriveFont(Font.BOLD, 20f));
        title.setBorder(BorderFactory.createEmptyBorder(10, 10, 0, 10));
        topPanel.add(title, BorderLayout.NORTH);

        JPanel searchPanel = new JPanel(new FlowLayout(FlowLayout.LEFT));

        searchPanel.add(new JLabel("Search equipment:"));

        searchField = new JTextField(25);

        searchPanel.add(searchField);

        topPanel.add(searchPanel, BorderLayout.SOUTH);

        frame.add(topPanel, BorderLayout.NORTH);

        // CENTER: Table
        tableModel = new EquipmentTableModel(
                sortedById(repository.findAll())
        );

        table = new JTable(tableModel);
        table.setSelectionMode(ListSelectionModel.SINGLE_SELECTION);
        table.setRowHeight(24);

        JScrollPane scrollPane = new JScrollPane(table);

        frame.add(scrollPane, BorderLayout.CENTER);

        // SOUTH: Buttons
        JPanel buttonPanel = new JPanel(
                new FlowLayout(FlowLayout.CENTER)
        );

        JButton addButton = new JButton("Add");
        JButton deleteButton = new JButton("Delete");
        JButton refreshButton = new JButton("Refresh");

        buttonPanel.add(addButton);
        buttonPanel.add(deleteButton);
        buttonPanel.add(refreshButton);

        frame.add(buttonPanel, BorderLayout.SOUTH);

        // EVENT HANDLERS
        addButton.addActionListener(
                e -> addEquipmentWithDialog()
        );

        deleteButton.addActionListener(e -> deleteEquipment());

        refreshButton.addActionListener(e -> refreshTable());

        // Live search: the table updates while the user types.
        searchField.getDocument().addDocumentListener(
                new DocumentListener() {

                    @Override
                    public void insertUpdate(DocumentEvent e) {
                        searchEquipment();
                    }

                    @Override
                    public void removeUpdate(DocumentEvent e) {
                        searchEquipment();
                    }

                    @Override
                    public void changedUpdate(DocumentEvent e) {
                        searchEquipment();
                    }
                }
        );

        frame.setVisible(true);
    }

    /** "Add" opens a dialog (TP3 step 1). */
    private void addEquipmentWithDialog() {

        JTextField nameInput = new JTextField(15);

        JComboBox<Category> categoryInput =
                new JComboBox<>(Category.values());

        JComboBox<Status> statusInput =
                new JComboBox<>(Status.values());

        JPanel panel = new JPanel(new GridLayout(3, 2, 5, 5));

        panel.add(new JLabel("Equipment name:"));
        panel.add(nameInput);

        panel.add(new JLabel("Category:"));
        panel.add(categoryInput);

        panel.add(new JLabel("Status:"));
        panel.add(statusInput);

        int result = JOptionPane.showConfirmDialog(
                frame,
                panel,
                "Add Equipment",
                JOptionPane.OK_CANCEL_OPTION,
                JOptionPane.PLAIN_MESSAGE
        );

        if (result == JOptionPane.OK_OPTION) {

            String name = nameInput.getText().trim();

            if (name.isEmpty()) {

                JOptionPane.showMessageDialog(
                        frame,
                        "Name is required.",
                        "Validation Error",
                        JOptionPane.ERROR_MESSAGE
                );

                return;
            }

            Category category =
                    (Category) categoryInput.getSelectedItem();

            Status status =
                    (Status) statusInput.getSelectedItem();

            Equipment equipment = new GenericEquipment(
                    nextId++,
                    name,
                    category
            );

            equipment.setStatus(status);

            repository.save(equipment);

            refreshTable();

            JOptionPane.showMessageDialog(
                    frame,
                    "Equipment added successfully."
            );
        }
    }

    private void deleteEquipment() {

        int selectedRow = table.getSelectedRow();

        if (selectedRow == -1) {
            JOptionPane.showMessageDialog(
                    frame,
                    "Please select an equipment row.",
                    "Selection Required",
                    JOptionPane.WARNING_MESSAGE
            );
            return;
        }

        int modelRow = table.convertRowIndexToModel(selectedRow);

        Equipment equipment =
                tableModel.getEquipmentAt(modelRow);

        repository.delete(equipment.getId());

        searchEquipment(); // keeps the current search filter applied

        JOptionPane.showMessageDialog(
                frame,
                "Equipment deleted."
        );
    }

    private void refreshTable() {

        searchField.setText(""); // triggers the DocumentListener

        tableModel.setEquipmentList(
                sortedById(repository.findAll())
        );
    }

    private void searchEquipment() {

        String keyword = searchField.getText().trim().toLowerCase();

        List<Equipment> filtered = repository.findAll()
                .stream()
                .filter(e ->
                        e.getName().toLowerCase()
                                .contains(keyword)
                )
                .sorted(Comparator.comparingInt(Equipment::getId))
                .toList();

        tableModel.setEquipmentList(filtered);
    }

    private List<Equipment> sortedById(List<Equipment> list) {
        return list.stream()
                .sorted(Comparator.comparingInt(Equipment::getId))
                .toList();
    }

    /** Two sample rows so the table is not empty on start (TP3.1 Task 2). */
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
