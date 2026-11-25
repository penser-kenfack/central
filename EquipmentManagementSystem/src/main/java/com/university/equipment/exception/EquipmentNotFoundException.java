package com.university.equipment.exception;

/** Unchecked exception thrown when an equipment ID does not exist. */
public class EquipmentNotFoundException extends RuntimeException {

    public EquipmentNotFoundException(String message) {
        super(message);
    }
}
