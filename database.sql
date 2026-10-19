-- ====================================================================
-- WAREHOUSE INVENTORY MANAGEMENT SYSTEM - DATABASE SCHEMA
-- DBMS Course Project (B.Tech CSE)
-- Database Name: warehouse_management
-- Entities: Exactly 5
--   1. PRODUCT
--   2. WAREHOUSE_SECTION
--   3. EMPLOYEE
--   4. INVENTORY
--   5. DISPATCH
-- Named Relationships: Exactly 4
--   1. Stored In:   PRODUCT — WAREHOUSE_SECTION (implemented via INVENTORY)
--   2. Contains:    WAREHOUSE_SECTION — INVENTORY
--   3. Managed By:  EMPLOYEE — INVENTORY
--   4. Handles:     EMPLOYEE — DISPATCH
--
-- Capacity Invariant:
--   available_space = capacity - total active allocated stock units
-- ====================================================================

DROP DATABASE IF EXISTS warehouse_management;
CREATE DATABASE warehouse_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE warehouse_management;

-- --------------------------------------------------------------------
-- Entity 1: PRODUCT
-- Stores product catalog information
-- --------------------------------------------------------------------
CREATE TABLE product (
    product_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(100) NOT NULL,
    weight DECIMAL(10, 2) DEFAULT NULL,
    expiry_date DATE DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_product_weight CHECK (weight IS NULL OR weight >= 0)
) ENGINE=InnoDB;

-- --------------------------------------------------------------------
-- Entity 2: WAREHOUSE_SECTION
-- Represents physical zones/storage units in the warehouse.
-- capacity: maximum total stock units this section can hold.
-- available_space: remaining units that can be stored without exceeding capacity.
-- --------------------------------------------------------------------
CREATE TABLE warehouse_section (
    section_id INT AUTO_INCREMENT PRIMARY KEY,
    temperature DECIMAL(5, 2) DEFAULT NULL,
    capacity INT NOT NULL,
    available_space INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_section_capacity CHECK (capacity >= 0),
    CONSTRAINT chk_section_available CHECK (available_space >= 0 AND available_space <= capacity)
) ENGINE=InnoDB;

-- --------------------------------------------------------------------
-- Entity 3: EMPLOYEE
-- Warehouse staff managing inventory intake, storage, and dispatches.
-- --------------------------------------------------------------------
CREATE TABLE employee (
    employee_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    designation VARCHAR(100) NOT NULL,
    phone VARCHAR(15) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- --------------------------------------------------------------------
-- Entity 4: INVENTORY
-- Represents stock allocated inside a warehouse section.
-- Connects:
--   - PRODUCT (Stored In relationship)
--   - WAREHOUSE_SECTION (Contains relationship)
--   - EMPLOYEE (Managed By relationship)
-- --------------------------------------------------------------------
CREATE TABLE inventory (
    inventory_id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    section_id INT NOT NULL,
    employee_id INT NOT NULL,
    quantity INT NOT NULL,
    entry_date DATE NOT NULL,
    exit_date DATE DEFAULT NULL,
    status VARCHAR(30) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_inventory_qty CHECK (quantity >= 0),
    CONSTRAINT fk_inventory_product FOREIGN KEY (product_id)
        REFERENCES product (product_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_inventory_section FOREIGN KEY (section_id)
        REFERENCES warehouse_section (section_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_inventory_employee FOREIGN KEY (employee_id)
        REFERENCES employee (employee_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE=InnoDB;

-- --------------------------------------------------------------------
-- Entity 5: DISPATCH
-- Outbound shipments handled by employees for specific inventory batches.
-- Connects:
--   - EMPLOYEE (Handles relationship)
--   - INVENTORY (Outbound dispatch from stored stock)
-- --------------------------------------------------------------------
CREATE TABLE dispatch (
    dispatch_id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    inventory_id INT NOT NULL,
    vehicle_no VARCHAR(30) NOT NULL,
    date DATE NOT NULL,
    destination VARCHAR(200) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_dispatch_employee FOREIGN KEY (employee_id)
        REFERENCES employee (employee_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_dispatch_inventory FOREIGN KEY (inventory_id)
        REFERENCES inventory (inventory_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE=InnoDB;

-- --------------------------------------------------------------------
-- INDEXES FOR FREQUENTLY SEARCHED / FILTERED COLUMNS
-- --------------------------------------------------------------------
CREATE INDEX idx_product_name_category ON product (name, category);
CREATE INDEX idx_inventory_product ON inventory (product_id);
CREATE INDEX idx_inventory_section ON inventory (section_id);
CREATE INDEX idx_inventory_employee ON inventory (employee_id);
CREATE INDEX idx_inventory_status ON inventory (status);
CREATE INDEX idx_dispatch_employee ON dispatch (employee_id);
CREATE INDEX idx_dispatch_inventory ON dispatch (inventory_id);
CREATE INDEX idx_dispatch_date ON dispatch (date);

-- ====================================================================
-- REALISTIC SAMPLE DATA FOR COLLEGE VIVA & EVALUATION DEMONSTRATION
-- ====================================================================

-- 1. Insert Products across distinct categories (dry goods, cold chain, electronics, chemical)
INSERT INTO product (product_id, name, category, weight, expiry_date) VALUES
(1, 'Frozen Salmon Fillets', 'Seafood', 1.50, '2026-12-15'),
(2, 'Dairy Fresh Milk (Cartons)', 'Dairy', 12.00, '2026-11-05'),
(3, 'Whole Grain Basmati Rice 25kg', 'Grains', 25.00, '2027-08-30'),
(4, 'Organic Green Apples (Crate)', 'Produce', 15.00, '2026-10-31'),
(5, 'Industrial Lithium Battery Pack', 'Electronics', 8.20, NULL),
(6, 'Refined Sunflower Oil 15L Tin', 'Oils & Fats', 14.50, '2027-03-20'),
(7, 'Pharmaceutical Antibiotic Vials', 'Medical', 0.85, '2027-01-10'),
(8, 'Corrugated Cardboard Packing Boxes', 'Packaging', 5.00, NULL);

-- 2. Insert Warehouse Sections
-- Section 1: Deep Freeze Cold Room (-18.5 C), Capacity: 1000, Allocated initially: 250 -> Available: 750
-- Section 2: Chilled Dairy Room (3.5 C), Capacity: 800, Allocated initially: 180 -> Available: 620
-- Section 3: Ambient Dry Storage Room A (24.0 C), Capacity: 2500, Allocated initially: 700 -> Available: 1800
-- Section 4: Climate Controlled Tech Room (18.0 C), Capacity: 600, Allocated initially: 90 -> Available: 510
-- Section 5: High-Density Pallet Zone B (22.0 C), Capacity: 4000, Allocated initially: 850 -> Available: 3150
INSERT INTO warehouse_section (section_id, temperature, capacity, available_space) VALUES
(1, -18.50, 1000, 750),
(2, 3.50, 800, 620),
(3, 24.00, 2500, 1800),
(4, 18.00, 600, 510),
(5, 22.00, 4000, 3150);

-- 3. Insert Employees
INSERT INTO employee (employee_id, name, designation, phone) VALUES
(1, 'Rajesh Kumar', 'Warehouse Operations Manager', '9876543210'),
(2, 'Priya Sharma', 'Cold Chain Supervisor', '9812345678'),
(3, 'Amit Verma', 'Inventory Controller', '9823456789'),
(4, 'Sneha Patel', 'Dispatch Officer', '9834567890'),
(5, 'Vikram Singh', 'Logistics Coordinator', '9845678901');

-- 4. Insert Inventory
-- Note: 'Stored' records occupy space in the section.
-- Section 1: Product 1 (Frozen Salmon) -> 250 units (Section 1 has 1000 - 250 = 750 available)
-- Section 2: Product 2 (Dairy Milk) -> 120 units + Product 4 (Apples) -> 60 units (Total = 180; 800 - 180 = 620 available)
-- Section 3: Product 3 (Rice) -> 400 units + Product 6 (Sunflower Oil) -> 300 units (Total = 700; 2500 - 700 = 1800 available)
-- Section 4: Product 5 (Lithium Battery) -> 50 units + Product 7 (Antibiotics) -> 40 units (Total = 90; 600 - 90 = 510 available)
-- Section 5: Product 8 (Boxes) -> 850 units (Total = 850; 4000 - 850 = 3150 available)
-- Inventory record 8 & 9 are previous batches that exited/dispatched, so exit_date is set.
INSERT INTO inventory (inventory_id, product_id, section_id, employee_id, quantity, entry_date, exit_date, status) VALUES
(1, 1, 1, 2, 250, '2026-09-10', NULL, 'Stored'),
(2, 2, 2, 2, 120, '2026-10-01', NULL, 'Stored'),
(3, 4, 2, 3, 60,  '2026-10-12', NULL, 'Stored'),
(4, 3, 3, 3, 400, '2026-08-15', NULL, 'Stored'),
(5, 6, 3, 1, 300, '2026-09-20', NULL, 'Stored'),
(6, 5, 4, 1, 50,  '2026-09-01', NULL, 'Stored'),
(7, 7, 4, 3, 40,  '2026-10-05', NULL, 'Stored'),
(8, 8, 5, 1, 850, '2026-08-01', NULL, 'Stored'),
(9, 2, 2, 4, 50,  '2026-09-01', '2026-09-15', 'Dispatched'),
(10, 3, 3, 5, 100, '2026-08-01', '2026-08-25', 'Dispatched');

-- 5. Insert Dispatches
-- Handles dispatches of inventory batches by authorized dispatch/logistics employees
INSERT INTO dispatch (dispatch_id, employee_id, inventory_id, vehicle_no, date, destination) VALUES
(1, 4, 9, 'KA-01-AB-1234', '2026-09-15', 'Metro Supermarket Central Hub, Bangalore'),
(2, 5, 10, 'MH-12-CD-5678', '2026-08-25', 'Wholesale Grains Depot, Pune'),
(3, 4, 1, 'DL-04-EF-9012', '2026-10-18', 'Apex Cold Storage Regional Branch, Gurgaon'),
(4, 5, 5, 'TN-09-GH-3456', '2026-10-19', 'Evergreen Hypermarket Distribution Center, Chennai');

-- Reset Auto-Increment counters to next available ID
ALTER TABLE product AUTO_INCREMENT = 9;
ALTER TABLE warehouse_section AUTO_INCREMENT = 6;
ALTER TABLE employee AUTO_INCREMENT = 6;
ALTER TABLE inventory AUTO_INCREMENT = 11;
ALTER TABLE dispatch AUTO_INCREMENT = 5;
