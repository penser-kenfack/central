package com.university.equipment.gui.swing;

import javax.swing.table.AbstractTableModel;
import java.util.List;

import com.university.equipment.model.Equipment;

/** Supplies the JTable with its columns and the equipment to display. */
public class EquipmentTableModel extends AbstractTableModel {

    private final String[] columns = {
            "ID", "Name", "Category", "Status"
    };

    private List<Equipment> equipmentList;

    public EquipmentTableModel(List<Equipment> equipmentList) {
        this.equipmentList = equipmentList;
    }

    @Override
    public int getRowCount() {
        return equipmentList.size();
    }

    @Override
    public int getColumnCount() {
        return columns.length;
    }

    @Override
    public String getColumnName(int column) {
        return columns[column];
    }

    @Override
    public Object getValueAt(int row, int column) {

        Equipment equipment = equipmentList.get(row);

        return switch (column) {
            case 0 -> equipment.getId();
            case 1 -> equipment.getName();
            case 2 -> equipment.getCategory();
            case 3 -> equipment.getStatus();
            default -> null;
        };
    }

    public Equipment getEquipmentAt(int row) {
        return equipmentList.get(row);
    }

    public void setEquipmentList(List<Equipment> equipmentList) {
        this.equipmentList = equipmentList;
        fireTableDataChanged();
    }
}
