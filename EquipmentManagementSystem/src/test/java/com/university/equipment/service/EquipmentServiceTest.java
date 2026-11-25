package com.university.equipment.service;

import com.university.equipment.exception.EquipmentNotFoundException;
import com.university.equipment.model.*;
import com.university.equipment.repository.InMemoryEquipmentRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class EquipmentServiceTest {

    private EquipmentService service;
    private Equipment laptop;

    @BeforeEach
    void setUp() {
        service = new EquipmentService(new InMemoryEquipmentRepository());
        laptop = service.registerLaptop("Dell Latitude 5420", 16);
    }

    @Test
    void shouldGenerateSequentialIdsStartingAt1001() {
        Equipment projector = service.registerProjector("Epson", 4000);
        Equipment printer = service.registerEquipment("HP LaserJet", Category.PRINTER);

        assertEquals(1001, laptop.getId());
        assertEquals(1002, projector.getId());
        assertEquals(1003, printer.getId());
        assertEquals(Category.PRINTER, printer.getCategory());
    }

    @Test
    void shouldLoanAvailableEquipment() {
        service.loanEquipment(laptop.getId(), "John");

        assertEquals(Status.LOANED, service.findById(laptop.getId()).getStatus());
        assertEquals("John", service.getBorrower(laptop.getId()));
    }

    @Test
    void shouldRefuseToLoanAlreadyLoanedEquipment() {
        service.loanEquipment(laptop.getId(), "John");

        IllegalStateException ex = assertThrows(IllegalStateException.class,
                () -> service.loanEquipment(laptop.getId(), "Mary"));
        assertEquals("Equipment is already loaned.", ex.getMessage());
        assertEquals("John", service.getBorrower(laptop.getId()));
    }

    @Test
    void shouldRefuseToLoanBrokenEquipment() {
        service.markAsBroken(laptop.getId());

        assertThrows(IllegalStateException.class, () -> service.loanEquipment(laptop.getId()));
        assertEquals(Status.BROKEN, laptop.getStatus());
    }

    @Test
    void shouldThrowWhenLoaningNonexistentEquipment() {
        assertThrows(EquipmentNotFoundException.class, () -> service.loanEquipment(9999));
    }

    @Test
    void shouldReturnLoanedEquipment() {
        service.loanEquipment(laptop.getId(), "John");
        service.returnEquipment(laptop.getId());

        assertEquals(Status.AVAILABLE, laptop.getStatus());
        assertNull(service.getBorrower(laptop.getId()));
    }

    @Test
    void shouldRefuseToReturnEquipmentThatIsNotLoaned() {
        IllegalStateException ex = assertThrows(IllegalStateException.class,
                () -> service.returnEquipment(laptop.getId()));
        assertEquals("Equipment is not currently loaned.", ex.getMessage());
    }

    @Test
    void shouldUpdateName() {
        service.updateName(laptop.getId(), "Dell Latitude 7440");
        assertEquals("Dell Latitude 7440", service.findById(laptop.getId()).getName());
        assertThrows(IllegalArgumentException.class, () -> service.updateName(laptop.getId(), ""));
    }

    @Test
    void shouldNotDeleteLoanedEquipment() {
        service.loanEquipment(laptop.getId(), "John");
        assertThrows(IllegalStateException.class, () -> service.delete(laptop.getId()));

        service.returnEquipment(laptop.getId());
        service.delete(laptop.getId());
        assertTrue(service.findAll().isEmpty());
    }

    @Test
    void shouldComputeStatistics() {
        Equipment projector = service.registerProjector("Epson", 4000);
        Equipment printer = service.registerEquipment("HP LaserJet", Category.PRINTER);
        service.registerEquipment("Cisco Switch", Category.NETWORK_DEVICE);

        service.loanEquipment(projector.getId(), "Alice");
        service.markAsBroken(printer.getId());

        assertEquals(new EquipmentSummary(4, 2, 1, 1), service.getStatistics());
    }
}
