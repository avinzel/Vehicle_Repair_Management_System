CREATE DATABASE IF NOT EXISTS VehicleRepair;
USE VehicleRepair;

-- =====================================================================
-- ROLES
-- Defines system login roles (Admin, Manager, Service Advisor, Mechanic,
-- Cashier). Referenced by: users.role_id
-- =====================================================================
CREATE TABLE roles (
    role_id         INT PRIMARY KEY AUTO_INCREMENT,
    role_name       VARCHAR(50) NOT NULL UNIQUE,
    description     VARCHAR(255)
);

-- =====================================================================
-- USERS
-- System accounts / login credentials for all staff.
-- References: roles (role_id)
-- Referenced by: mechanics.user_id, repair_orders.created_by,
--                invoices.issued_by, invoices.received_by
-- =====================================================================
CREATE TABLE users (
    user_id         INT PRIMARY KEY AUTO_INCREMENT,
    username        VARCHAR(50) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    first_name      VARCHAR(75) NOT NULL,
    middle_name     VARCHAR(75),
    last_name       VARCHAR(75) NOT NULL,
    contact_no      VARCHAR(20),
    email           VARCHAR(100),
    role_id         INT NOT NULL,
    status          ENUM('ACTIVE','INACTIVE') DEFAULT 'ACTIVE',
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles(role_id)
);

-- =====================================================================
-- MECHANIC_POSITIONS
-- Defines the job title a mechanic holds on a specific repair order
-- (Diagnostician, Lead Mechanic, Assistant, Electrical Specialist).
-- Referenced by: repair_order_mechanics.position_id
-- =====================================================================
CREATE TABLE mechanic_positions (
    position_id     INT PRIMARY KEY AUTO_INCREMENT,
    position_name   VARCHAR(50) NOT NULL UNIQUE,
    description     VARCHAR(255)
);

-- =====================================================================
-- MECHANICS
-- Employee profile for each mechanic.
-- References: users (user_id)
-- Referenced by: repair_order_mechanics.mechanic_id
-- =====================================================================
CREATE TABLE mechanics (
    mechanic_id     INT PRIMARY KEY AUTO_INCREMENT,
    user_id         INT NOT NULL UNIQUE,
    specialization  VARCHAR(100),
    date_hired      DATE,
    status          ENUM('ACTIVE','ON_LEAVE','INACTIVE') DEFAULT 'ACTIVE',
    CONSTRAINT fk_mechanics_user FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- =====================================================================
-- CUSTOMERS
-- Customer contact and identity records.
-- Referenced by: vehicles.customer_id
-- =====================================================================
CREATE TABLE customers (
    customer_id     INT PRIMARY KEY AUTO_INCREMENT,
    first_name      VARCHAR(75) NOT NULL,
    middle_name     VARCHAR(75),
    last_name       VARCHAR(75) NOT NULL,
    contact_no      VARCHAR(20) NOT NULL,
    email           VARCHAR(100),
    address         VARCHAR(255),
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================================
-- VEHICLES
-- Vehicles owned by customers, brought in for service.
-- References: customers (customer_id)
-- Referenced by: repair_orders.vehicle_id
-- =====================================================================
CREATE TABLE vehicles (
    vehicle_id      INT PRIMARY KEY AUTO_INCREMENT,
    customer_id     INT NOT NULL,
    plate_number    VARCHAR(20) NOT NULL UNIQUE,
	vehicle_type ENUM('CAR','MOTORCYCLE','TRICYCLE') NOT NULL DEFAULT 'CAR',
    manufacturer    VARCHAR(50) NOT NULL,
    model           VARCHAR(50) NOT NULL,
    year_model      YEAR,
    color           VARCHAR(30),		
    vin_number      VARCHAR(50) UNIQUE,
    current_mileage INT DEFAULT 0,
    date_registered DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_vehicles_customer FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
);

-- =====================================================================
-- PARTS_INVENTORY
-- Stock of parts available for use on repair orders.
-- Referenced by: repair_order_parts.part_id
-- =====================================================================
CREATE TABLE parts_inventory (
    part_id         INT PRIMARY KEY AUTO_INCREMENT,
    part_code       VARCHAR(30) NOT NULL UNIQUE,
    part_name       VARCHAR(150) NOT NULL,
    category        VARCHAR(50),
    unit            VARCHAR(20) DEFAULT 'pc',
    unit_price      DECIMAL(10,2) NOT NULL,
    quantity_on_hand INT NOT NULL DEFAULT 0,
    reorder_level   INT DEFAULT 5,
    batch_number    VARCHAR(50) NOT NULL,
    date_added      DATETIME DEFAULT CURRENT_TIMESTAMP,
    status          ENUM('ACTIVE','DISCONTINUED') DEFAULT 'ACTIVE'
);

-- =====================================================================
-- REPAIR_ORDERS
-- Central transaction table: one row per vehicle service job, tracked
-- through its full lifecycle via status.
-- References: vehicles (vehicle_id), users (created_by)
-- Referenced by: repair_order_services.order_id,
--                repair_order_mechanics.order_id,
--                repair_order_parts.order_id,
--                maintenance_history.order_id,
--                invoices.order_id
-- =====================================================================
CREATE TABLE repair_orders (
    order_id        INT PRIMARY KEY AUTO_INCREMENT,
    vehicle_id      INT NOT NULL,
    date_received   DATETIME DEFAULT CURRENT_TIMESTAMP,
    date_completed  DATETIME NULL,
    mileage_at_service INT,
    complaint       VARCHAR(500),
    status          ENUM(
                        'PENDING_DIAGNOSIS',
                        'AWAITING_DIAGNOSIS',
                        'PENDING_MECHANICS',
                        'IN_PROGRESS',
                        'READY_TO_INVOICE',
                        'AWAITING_PAYMENT',
                        'READY_FOR_RELEASE',
                        'FULFILLED',
                        'CANCELLED'
                    ) DEFAULT 'PENDING_DIAGNOSIS',
    diagnosis_notes TEXT NULL,
    diagnosis_completed_at DATETIME NULL,
    priority ENUM('STANDARD','URGENT','RUSH') NOT NULL DEFAULT 'STANDARD',
    created_by      INT NOT NULL,
    CONSTRAINT fk_order_vehicle  FOREIGN KEY (vehicle_id)  REFERENCES vehicles(vehicle_id),
    CONSTRAINT fk_order_user     FOREIGN KEY (created_by)  REFERENCES users(user_id)
);

-- =====================================================================
-- REPAIR_ORDER_SERVICES
-- Labor / service line items billed on a repair order.
-- References: repair_orders (order_id)
-- =====================================================================
CREATE TABLE repair_order_services (
    order_service_id INT PRIMARY KEY AUTO_INCREMENT,
    order_id        INT NOT NULL,
    service_name    VARCHAR(150) NOT NULL,
    service_description VARCHAR(255),
    labor_cost      DECIMAL(10,2) NOT NULL DEFAULT 0,
    CONSTRAINT fk_ros_order FOREIGN KEY (order_id) REFERENCES repair_orders(order_id)
);

-- =====================================================================
-- REPAIR_ORDER_MECHANICS
-- Junction table assigning mechanics to a repair order, each with a
-- position for that specific job.
-- References: repair_orders (order_id), mechanics (mechanic_id),
--             mechanic_positions (position_id)
-- =====================================================================
CREATE TABLE repair_order_mechanics (
    assignment_id   INT PRIMARY KEY AUTO_INCREMENT,
    order_id        INT NOT NULL,
    mechanic_id     INT NOT NULL,
    position_id     INT NOT NULL,
    date_assigned   DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_rom_order    FOREIGN KEY (order_id)    REFERENCES repair_orders(order_id),
    CONSTRAINT fk_rom_mechanic FOREIGN KEY (mechanic_id) REFERENCES mechanics(mechanic_id),
    CONSTRAINT fk_rom_position FOREIGN KEY (position_id) REFERENCES mechanic_positions(position_id)
);

-- =====================================================================
-- REPAIR_ORDER_PARTS
-- Parts consumed on a repair order, with unit_price captured at time
-- of use.
-- References: repair_orders (order_id), parts_inventory (part_id)
-- =====================================================================
CREATE TABLE repair_order_parts (
    order_part_id INT PRIMARY KEY AUTO_INCREMENT,
    order_id      INT NOT NULL,
    part_id       INT NOT NULL,
    batch_number  VARCHAR(50) NOT NULL,
    quantity_used INT NOT NULL,
    unit_price    DECIMAL(10,2) NOT NULL,
    CONSTRAINT fk_rop_order FOREIGN KEY (order_id) REFERENCES repair_orders(order_id),
    CONSTRAINT fk_rop_part  FOREIGN KEY (part_id)  REFERENCES parts_inventory(part_id)
);

-- =====================================================================
-- MAINTENANCE_HISTORY
-- Service history record generated per completed repair order, used
-- for tracking a vehicle's next-due maintenance.
-- References: repair_orders (order_id)
-- =====================================================================
CREATE TABLE maintenance_history (
    history_id      INT PRIMARY KEY AUTO_INCREMENT,
    order_id        INT NOT NULL,
    service_date    DATETIME NOT NULL,
    service_summary VARCHAR(500),
    next_service_due_date DATE,
    next_service_due_mileage INT,
    CONSTRAINT fk_mh_order   FOREIGN KEY (order_id)   REFERENCES repair_orders(order_id)
);

-- =====================================================================
-- INVOICES
-- Billing record for a repair order, with labor/parts totals snapshot
-- at invoice time and payment tracking.
-- References: repair_orders (order_id), users (issued_by, received_by)
-- =====================================================================
CREATE TABLE invoices (
    invoice_id      INT PRIMARY KEY AUTO_INCREMENT,
    order_id        INT NOT NULL UNIQUE,
    invoice_date    DATETIME DEFAULT CURRENT_TIMESTAMP,
    labor_total     DECIMAL(10,2) NOT NULL DEFAULT 0,
    parts_total     DECIMAL(10,2) NOT NULL DEFAULT 0,
    discount        DECIMAL(10,2) NOT NULL DEFAULT 0,
    tax_amount      DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_amount    DECIMAL(10,2) NOT NULL DEFAULT 0,
    payment_method  ENUM('CASH','GCASH','BANK_TRANSFER') NULL,
    payment_reference VARCHAR(100) NULL,
    payment_date    DATETIME NULL,
    status          ENUM('UNPAID','PAID','VOID') DEFAULT 'UNPAID',
    issued_by       INT NOT NULL,
    received_by     INT NULL,
    CONSTRAINT fk_invoice_order    FOREIGN KEY (order_id)    REFERENCES repair_orders(order_id),
    CONSTRAINT fk_invoice_issuer   FOREIGN KEY (issued_by)   REFERENCES users(user_id),
    CONSTRAINT fk_invoice_receiver FOREIGN KEY (received_by) REFERENCES users(user_id)
);

-- =====================================================================
-- SEED DATA (reference/lookup rows — insert once during setup)
-- =====================================================================
INSERT INTO roles (role_name, description) VALUES
('Admin', 'Full system access, user & inventory management'),
('Manager', 'Read access across all orders, mechanics, and reports'),
('Service Advisor', 'Handles intake, order assignment, customer records'),
('Mechanic', 'Handles diagnosis, repairs, and parts logging on assigned jobs'),
('Cashier', 'Handles billing and payment processing');

INSERT INTO mechanic_positions (position_name, description) VALUES
('Diagnostician', 'Performs initial inspection and logs diagnostic notes'),
('Lead Mechanic', 'Leads the repair job, can mark job complete'),
('Assistant', 'Supports the lead mechanic on the job'),
('Electrical Specialist', 'Handles electrical system repairs');