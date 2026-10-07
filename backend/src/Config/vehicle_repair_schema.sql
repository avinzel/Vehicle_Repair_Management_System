	DROP DATABASE IF EXISTS VehicleRepair;
	CREATE DATABASE IF NOT EXISTS VehicleRepair;
	USE VehicleRepair;

	-- =====================================================================
	-- ROLES
	-- =====================================================================
	CREATE TABLE roles (
		role_id         INT PRIMARY KEY AUTO_INCREMENT,
		role_name       VARCHAR(50) NOT NULL UNIQUE,
		description     VARCHAR(255)
	);

	-- =====================================================================
	-- USERS
	-- =====================================================================
	CREATE TABLE users (
		user_id         INT PRIMARY KEY AUTO_INCREMENT,
		username        VARCHAR(50) NOT NULL UNIQUE,
		password_hash   VARCHAR(255) NOT NULL,
		first_name      VARCHAR(75) NOT NULL,
		middle_name     VARCHAR(75),
		last_name       VARCHAR(75) NOT NULL,
		contact_no      VARCHAR(20),
		email           VARCHAR(100) unique,
		role_id         INT NOT NULL,
		status          ENUM('ACTIVE','INACTIVE') DEFAULT 'ACTIVE',
		created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
		CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles(role_id)
	);

	-- =====================================================================
	-- MECHANIC_POSITIONS
	-- =====================================================================
	CREATE TABLE mechanic_positions (
		position_id     INT PRIMARY KEY AUTO_INCREMENT,
		position_name   VARCHAR(50) NOT NULL UNIQUE,
		description     VARCHAR(255)
	);

	-- =====================================================================
	-- MECHANICS
	-- =====================================================================


    -- =====================================================================
    -- MECHANICS
    -- position_id removed — position is no longer fixed to the mechanic,
    -- it varies per assignment again (see repair_order_mechanics below).
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
	-- =====================================================================
	CREATE TABLE customers (
		customer_id     INT PRIMARY KEY AUTO_INCREMENT,
		first_name      VARCHAR(75) NOT NULL,
		middle_name     VARCHAR(75),
		last_name       VARCHAR(75) NOT NULL,
		contact_no      VARCHAR(20) NOT NULL,
		email           VARCHAR(100) unique,
		address         VARCHAR(255),
		created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	-- =====================================================================
	-- VEHICLES
	-- =====================================================================
	CREATE TABLE vehicles (
		vehicle_id      INT PRIMARY KEY AUTO_INCREMENT,
		customer_id     INT NOT NULL,
		plate_number    VARCHAR(20) NOT NULL UNIQUE,
		vehicle_type    ENUM('CAR','MOTORCYCLE','TRICYCLE') NOT NULL DEFAULT 'CAR',
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
	-- =====================================================================
	CREATE TABLE parts_inventory (
		part_id          INT PRIMARY KEY AUTO_INCREMENT,
		part_code        VARCHAR(30) NOT NULL UNIQUE,
		part_name        VARCHAR(150) NOT NULL,
		category         VARCHAR(50),
		unit             VARCHAR(20) DEFAULT 'pc',
		unit_price       DECIMAL(10,2) NOT NULL,
		quantity_on_hand INT NOT NULL DEFAULT 0,
		reorder_level    INT DEFAULT 5,
		batch_number     VARCHAR(50) NOT NULL,
		date_added       DATETIME DEFAULT CURRENT_TIMESTAMP,
		status           ENUM('ACTIVE','DISCONTINUED') DEFAULT 'ACTIVE'
	);

	-- =====================================================================
	-- REPAIR_ORDERS
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
							'CANCELLED',
							"AWAITING_PARTS"
						) DEFAULT 'PENDING_DIAGNOSIS',
		diagnosis_notes TEXT NULL,
		diagnosis_completed_at DATETIME NULL,
		priority        ENUM('STANDARD','URGENT','RUSH') NOT NULL DEFAULT 'STANDARD',
		created_by      INT NOT NULL,
		CONSTRAINT fk_order_vehicle  FOREIGN KEY (vehicle_id)  REFERENCES vehicles(vehicle_id),
		CONSTRAINT fk_order_user     FOREIGN KEY (created_by)  REFERENCES users(user_id)
	);

	-- =====================================================================
	-- SERVICE_CATALOG
	-- =====================================================================
	CREATE TABLE service_catalog (
		service_catalog_id INT PRIMARY KEY AUTO_INCREMENT,
		service_name        VARCHAR(150) NOT NULL UNIQUE,
		description         VARCHAR(255),
		standard_labor_cost DECIMAL(10,2) NOT NULL
	);

	-- =====================================================================
	-- REPAIR_ORDER_SERVICES
	-- =====================================================================
	CREATE TABLE repair_order_services (
		order_service_id   INT PRIMARY KEY AUTO_INCREMENT,
		order_id            INT NOT NULL,
		service_catalog_id  INT NOT NULL,
		CONSTRAINT fk_ros_order   FOREIGN KEY (order_id)           REFERENCES repair_orders(order_id),
		CONSTRAINT fk_ros_catalog FOREIGN KEY (service_catalog_id) REFERENCES service_catalog(service_catalog_id)
	);


    -- =====================================================================
    -- REPAIR_ORDER_MECHANICS
    -- position_id back here — same mechanic can hold different positions
    -- on different orders.
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
	-- =====================================================================
	CREATE TABLE repair_order_parts (
		order_part_id INT PRIMARY KEY AUTO_INCREMENT,
		order_id      INT NOT NULL,
		part_id       INT NOT NULL,
		batch_number  VARCHAR(50) NOT NULL,
		quantity_used INT NOT NULL,
		unit_price    DECIMAL(10,2) NOT NULL,
		status ENUM('ISSUED', 'PENDING_PARTS', 'CANCELLED') DEFAULT 'ISSUED',
		CONSTRAINT fk_rop_order FOREIGN KEY (order_id) REFERENCES repair_orders(order_id),
		CONSTRAINT fk_rop_part  FOREIGN KEY (part_id)  REFERENCES parts_inventory(part_id)
	);

	-- =====================================================================
	-- MAINTENANCE_HISTORY
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
-- MYSQL DATABASE USERS & PRIVILEGES
-- =====================================================================
 
DROP USER IF EXISTS 'admin_user'@'localhost';
DROP USER IF EXISTS 'service_advisor'@'localhost';
DROP USER IF EXISTS 'mechanic'@'localhost';
 
CREATE USER 'admin_user'@'localhost'      IDENTIFIED BY 'admin123';
CREATE USER 'service_advisor'@'localhost' IDENTIFIED BY 'advisor123';
CREATE USER 'mechanic'@'localhost'        IDENTIFIED BY 'mechanic123';

-- ---------------------------------------------------------------------
-- ADMIN: buong access
-- ---------------------------------------------------------------------
GRANT ALL PRIVILEGES ON VehicleRepair.* TO 'admin_user'@'localhost';
 
 
-- ---------------------------------------------------------------------
-- SERVICE ADVISOR
-- Screens: Dashboard, New Vehicle Intake, Active Repair Orders,
--          Customer Records, Billing & Invoicing, Order History
--
-- Read access sa lahat ng kailangan ipakita sa screen.
-- Ang pagsulat (intake, invoice, payment) ay via stored procedure.
-- ---------------------------------------------------------------------
GRANT SELECT ON VehicleRepair.customers              TO 'service_advisor'@'localhost';
GRANT SELECT ON VehicleRepair.vehicles               TO 'service_advisor'@'localhost';
GRANT SELECT ON VehicleRepair.repair_orders          TO 'service_advisor'@'localhost';
GRANT SELECT ON VehicleRepair.repair_order_services  TO 'service_advisor'@'localhost';
GRANT SELECT ON VehicleRepair.repair_order_parts     TO 'service_advisor'@'localhost';
GRANT SELECT ON VehicleRepair.repair_order_mechanics TO 'service_advisor'@'localhost';
GRANT SELECT ON VehicleRepair.invoices               TO 'service_advisor'@'localhost';
GRANT SELECT ON VehicleRepair.maintenance_history    TO 'service_advisor'@'localhost';
GRANT SELECT ON VehicleRepair.parts_inventory        TO 'service_advisor'@'localhost';
GRANT SELECT ON VehicleRepair.mechanics              TO 'service_advisor'@'localhost';
GRANT SELECT ON VehicleRepair.mechanic_positions     TO 'service_advisor'@'localhost';
GRANT SELECT ON VehicleRepair.service_catalog        TO 'service_advisor'@'localhost';
GRANT SELECT ON VehicleRepair.users                  TO 'service_advisor'@'localhost';
GRANT SELECT ON VehicleRepair.roles                  TO 'service_advisor'@'localhost';
 
GRANT EXECUTE ON VehicleRepair.* TO 'service_advisor'@'localhost';
 
 
-- ---------------------------------------------------------------------
-- MECHANIC
-- Ginagawa: tingnan ang naka-assign na jobs, i-update ang order
--           (diagnosis notes at status).
--
-- UPDATE sa repair_orders LANG ang direktang ibinibigay. Walang direktang
-- write sa repair_order_parts, repair_order_services, parts_inventory,
-- o maintenance_history — via stored procedure lahat iyon.
-- ---------------------------------------------------------------------
GRANT SELECT, UPDATE ON VehicleRepair.repair_orders TO 'mechanic'@'localhost';
 
GRANT SELECT ON VehicleRepair.repair_order_mechanics TO 'mechanic'@'localhost';
GRANT SELECT ON VehicleRepair.repair_order_services  TO 'mechanic'@'localhost';
GRANT SELECT ON VehicleRepair.repair_order_parts     TO 'mechanic'@'localhost';
GRANT SELECT ON VehicleRepair.parts_inventory        TO 'mechanic'@'localhost';
GRANT SELECT ON VehicleRepair.vehicles               TO 'mechanic'@'localhost';
GRANT SELECT ON VehicleRepair.customers              TO 'mechanic'@'localhost';
GRANT SELECT ON VehicleRepair.maintenance_history    TO 'mechanic'@'localhost';
GRANT SELECT ON VehicleRepair.service_catalog        TO 'mechanic'@'localhost';
GRANT SELECT ON VehicleRepair.mechanics              TO 'mechanic'@'localhost';
GRANT SELECT ON VehicleRepair.mechanic_positions     TO 'mechanic'@'localhost';
GRANT SELECT ON VehicleRepair.users                  TO 'mechanic'@'localhost';
 
GRANT EXECUTE ON VehicleRepair.* TO 'mechanic'@'localhost';
 
-- Walang access ang Mechanic sa invoices at roles.
 
FLUSH PRIVILEGES;
 
SHOW GRANTS FOR 'admin_user'@'localhost';
SHOW GRANTS FOR 'service_advisor'@'localhost';
SHOW GRANTS FOR 'mechanic'@'localhost';
INSERT INTO roles (role_id, role_name, description) VALUES
(1, 'Admin', 'Full system access, user & inventory management'),
(2, 'Service Advisor', 'Handles intake, order assignment, customer records, and billing/payment'),
(3, 'Mechanic', 'Handles diagnosis, repairs, and parts logging on assigned jobs');

INSERT INTO mechanic_positions (position_id, position_name, description) VALUES
(1, 'Diagnostician', 'Performs initial inspection and logs diagnostic notes'),
(2, 'Lead Mechanic', 'Leads the repair job, can mark job complete'),
(3, 'Electrical Specialist', 'Handles electrical system repairs');

-- =====================================================================
-- SERVICE CATALOG
-- =====================================================================
INSERT INTO service_catalog (service_catalog_id, service_name, description, standard_labor_cost) VALUES
(1, 'Starter Motor Overhaul', 'Complete starter motor tear down, cleaning, and brush replacement.', 1500.00),
(2, 'Routine Maintenance Service', 'General checkup, oil change, and filter inspection.', 1000.00);

-- =====================================================================
-- USERS
-- role_id: 1=Admin, 2=Service Advisor, 3=Mechanic
-- =====================================================================
INSERT INTO users (user_id, username, password_hash, first_name, middle_name, last_name, contact_no, email, role_id, status, created_at) VALUES
(1, 'mkay',       '$2y$12$L.5FB1jubPnhDH2rAGLEgerl8zDinIdj0KzBjUFQvckF4jfzyK2YG', 'Mkay',    'Lakan',   'Malaro',   '09493156781', 'mkay@gmail.com',        3, 'ACTIVE', '2026-09-14 16:44:43'),
(4, 'lean',       '$2y$12$nQu26E7giBxGxMY7/b1K4.S0TcAHxbN4MKg4Ru.3Epn2x1vKSlkgC', 'Leann',    'Janelle',   'Marie',   '09493156782', 'lean@gmail.com',     3, 'ACTIVE', '2026-09-14 16:48:02'),
(5, 'kruu',       '$2y$12$lfqiNWlNLbvjiejTKD.VbO76nQFEqhuZb9CZTNnbM3tf/7E85EZ62', 'Kruu',    'Patrik',   'Malana',   '09493156783', 'kruu@gmail.com', 3, 'ACTIVE', '2026-09-14 16:48:21'),
(6, 'vinzel',     '$2y$12$HAw./A6cusUN2DreFRvTKeWLTzoowIQADPRg1Iwt9qsTHNqm.wVfW', 'Vincent',   'Tubice',   'Mandap',   '09423456784', 'vinzel@gmail.com',     2, 'ACTIVE', '2026-09-06 15:52:16'),
(7, 'bananabeam', '$2y$12$Tu4T3taD14qPLjdlVUe40.E3xb.vE66opjqKzjOkLTkPOGH/Rt7Ce', 'Noel',      'Enseymada','Mercadal', '09423456785', 'bananabeam@gmail.com', 1, 'ACTIVE', '2026-09-06 15:53:07'),
(8, 'joleks',     '$2y$12$rQUt/5Asy2zEUIF13jcDI.NLTzeyOSnAc890RV/E030FIIHTVq8yS', 'John Aleks','Wasuo',    'Lumpay',   '09423156786', 'joleks@gmail.com',    3, 'ACTIVE', '2026-09-06 15:56:46');

-- =====================================================================
-- MECHANICS
-- position_id REMOVED — position is no longer fixed to the mechanic,
-- it's chosen per assignment again (see repair_order_mechanics below).
-- specialization stays as advisory info for the Service Advisor's
-- judgment call, not a hard restriction on what position they can hold.
-- =====================================================================
INSERT INTO mechanics (mechanic_id, user_id, specialization, date_hired, status) VALUES
(1, 1, 'Engine Diagnostics', '2025-02-01', 'ACTIVE'), -- mkay
(2, 4, 'General Repair',     '2025-04-15', 'ACTIVE'), -- lean
(3, 5, 'Electrical Systems', '2025-06-10', 'ACTIVE'), -- kruu
(4, 8, 'General Repair',     '2025-01-15', 'ACTIVE'); -- joleks

-- =====================================================================
-- CUSTOMERS
-- =====================================================================
INSERT INTO customers (customer_id, first_name, middle_name, last_name, contact_no, email, address, created_at) VALUES
(1, 'Liam',  NULL, 'Johnson',  '0917-123-4567', 'liam.j@email.com',  'Blk 4 Lot 12, Cabuyao, Laguna',   '2026-08-27 09:00:00'),
(2, 'Olivia',NULL, 'Smith',    '0918-234-5678', 'olivia.s@email.com','Purok 3, Sta. Rosa, Laguna',      '2026-08-26 10:15:00'),
(3, 'Noah',  NULL, 'Williams', '0919-345-6789', 'noah.w@email.com',  'Brgy. Banay-banay, Cabuyao',      '2026-08-25 11:30:00'),
(4, 'Emma',  NULL, 'Brown',    '0920-456-7890', 'emma.b@email.com',  'Km 21, National Hwy, Cabuyao',    '2026-08-24 13:45:00'),
(5, 'James', NULL, 'Davis',    '0921-567-8901', 'james.d@email.com', 'Brgy. Mamatid, Cabuyao, Laguna',  '2026-08-23 08:20:00');

-- =====================================================================
-- VEHICLES
-- =====================================================================
INSERT INTO vehicles (vehicle_id, customer_id, plate_number, vehicle_type, manufacturer, model, year_model, color, vin_number, current_mileage, date_registered) VALUES
(1, 1, 'ABC-1234', 'CAR',        'Toyota',   'Vios',        2021, 'Silver', 'VIN-ABC1234XX', 32000, '2026-08-27 09:05:00'),
(2, 2, 'XYZ-5678', 'MOTORCYCLE', 'Honda',    'Click 125i',  2022, 'Red',    'VIN-XYZ5678XX', 8500,  '2026-08-26 10:20:00'),
(3, 3, 'DEF-9012', 'MOTORCYCLE', 'Yamaha',   'Mio i125',    2020, 'Blue',   'VIN-DEF9012XX', 12100, '2026-08-25 11:35:00'),
(4, 4, 'GHI-3456', 'CAR',        'Toyota',   'Vios',        2019, 'White',  'VIN-GHI3456XX', 51200, '2026-08-24 13:50:00'),
(5, 5, 'JKL-7890', 'MOTORCYCLE', 'Kawasaki', 'Barako 175',  2021, 'Black',  'VIN-JKL7890XX', 15300, '2026-08-23 08:25:00');

-- =====================================================================
-- PARTS INVENTORY
-- =====================================================================
INSERT INTO parts_inventory (part_id, part_code, part_name, category, unit, unit_price, quantity_on_hand, reorder_level, batch_number, date_added, status) VALUES
(1, 'PRT-001', 'Engine Oil (1L)',       'Engine',     'liter', 380.00,  48, 10, 'BATCH-2026-01', '2026-07-01 09:00:00', 'ACTIVE'),
(2, 'PRT-002', 'Brake Pads (set)',      'Brake',      'set',   1200.00, 12, 5,  'BATCH-2026-01', '2026-07-01 09:00:00', 'ACTIVE'),
(3, 'PRT-003', 'Air Filter',            'Engine',     'pc',    380.00,  20, 8,  'BATCH-2026-01', '2026-07-01 09:00:00', 'ACTIVE'),
(4, 'PRT-004', 'Spark Plugs (set of 4)','Engine',     'set',   950.00,  18, 6,  'BATCH-2026-01', '2026-07-01 09:00:00', 'ACTIVE'),
(5, 'PRT-005', 'Car Battery (12V)',     'Electrical', 'pc',    3800.00, 8,  5,  'BATCH-2026-02', '2026-07-15 09:00:00', 'ACTIVE'),
(6, 'PRT-006', 'Wiper Blade (pair)',    'Body',       'pair',  650.00,  22, 8,  'BATCH-2026-01', '2026-07-01 09:00:00', 'ACTIVE'),
(7, 'PRT-007', 'Coolant (1L)',          'Engine',     'liter', 280.00,  30, 10, 'BATCH-2026-02', '2026-07-15 09:00:00', 'ACTIVE'),
(8, 'PRT-008', 'Timing Belt',           'Engine',     'pc',    1850.00, 6,  5,  'BATCH-2026-02', '2026-07-15 09:00:00', 'ACTIVE');

-- =====================================================================
-- REPAIR ORDERS
-- created_by = 6 (vinzel, Service Advisor)
-- RO-1: fresh intake, no mechanic touched yet
-- RO-2: Diagnostician (mkay) assigned, diagnosis not yet logged
-- RO-3: Diagnostician (mkay) finished diagnosis, awaiting mechanic assignment
-- RO-4: Full team assigned (Diagnostician + Lead + Electrical), in progress
-- RO-5: Completed, invoiced, paid
-- =====================================================================
INSERT INTO repair_orders (order_id, vehicle_id, date_received, date_completed, mileage_at_service, complaint, status, diagnosis_notes, diagnosis_completed_at, priority, created_by) VALUES
(1, 1, '2026-08-27 09:10:00', NULL, 32000, 'Engine makes knocking noise when accelerating.', 'PENDING_DIAGNOSIS', NULL, NULL, 'STANDARD', 6),
(2, 2, '2026-08-26 10:25:00', NULL, 8500,  'Brake lever feels spongy, brake fade during test ride.', 'AWAITING_DIAGNOSIS', NULL, NULL, 'URGENT', 6),
(3, 3, '2026-08-25 11:40:00', NULL, 12100, 'Customer reports difficulty starting in the morning.', 'PENDING_MECHANICS', 'Weak battery output and corroded terminals found. Recommend battery cleaning/replacement.', '2026-08-25 14:00:00', 'STANDARD', 6),
(4, 4, '2026-08-24 13:55:00', NULL, 51200, 'Vehicle will not start. Battery voltage reads 9.2V (dead).', 'IN_PROGRESS', 'Battery voltage reads 9.2V (dead). Starter motor draws excessive current — likely worn brushes. Recommend battery replacement and starter motor overhaul.', '2026-08-24 16:10:00', 'RUSH', 6),
(5, 5, '2026-08-23 08:30:00', '2026-08-23 17:00:00', 15300, 'Routine 10,000km service.', 'FULFILLED', 'Routine 10,000km service. Oil change, filter replacement, chain adjustment, and general inspection completed. All systems nominal.', '2026-08-23 09:00:00', 'STANDARD', 6);

-- =====================================================================
-- REPAIR ORDER SERVICES
-- service_catalog_id: 1=Starter Motor Overhaul, 2=Routine Maintenance Service
-- =====================================================================
INSERT INTO repair_order_services (order_service_id, order_id, service_catalog_id) VALUES
(1, 4, 1),
(2, 5, 2);

-- =====================================================================
-- REPAIR ORDER MECHANICS
-- position_id is BACK — chosen per assignment, not fixed to the mechanic.
-- position_id: 1=Diagnostician, 2=Lead Mechanic, 3=Electrical Specialist
-- mechanic_id: 1=mkay, 2=lean, 3=kruu, 4=joleks
-- Note: mkay (mechanic 1) is Diagnostician on every order here, but
-- nothing stops him from being assigned a different position on a
-- future order — that's the whole point of this table shape.
-- =====================================================================
INSERT INTO repair_order_mechanics (assignment_id, order_id, mechanic_id, position_id, date_assigned) VALUES
(1, 2, 1, 1, '2026-08-26 10:30:00'), -- mkay as Diagnostician on RO-2
(2, 3, 1, 1, '2026-08-25 13:50:00'), -- mkay as Diagnostician on RO-3
(3, 4, 1, 1, '2026-08-24 15:00:00'), -- mkay as Diagnostician on RO-4
(4, 4, 2, 2, '2026-08-24 16:15:00'), -- lean as Lead Mechanic on RO-4
(5, 4, 3, 3, '2026-08-24 16:20:00'), -- kruu as Electrical Specialist on RO-4
(6, 5, 1, 1, '2026-08-23 08:35:00'), -- mkay as Diagnostician on RO-5
(7, 5, 4, 2, '2026-08-23 09:05:00'); -- joleks as Lead Mechanic on RO-5

-- =====================================================================
-- REPAIR ORDER PARTS
-- status: ISSUED = part was pulled from inventory and used;
-- PENDING_PARTS = requested but not yet available; CANCELLED = voided.
-- All 3 rows here are ISSUED — actual parts used on RO-4 and RO-5.
-- =====================================================================
INSERT INTO repair_order_parts (order_part_id, order_id, part_id, batch_number, quantity_used, unit_price, status) VALUES
(1, 4, 5, 'BATCH-2026-02', 1, 3800.00, 'ISSUED'), -- Car Battery on RO-4
(2, 5, 1, 'BATCH-2026-01', 3, 380.00, 'ISSUED'),  -- Engine Oil on RO-5
(3, 5, 3, 'BATCH-2026-01', 1, 380.00, 'ISSUED');  -- Air Filter on RO-5

-- =====================================================================
-- MAINTENANCE HISTORY
-- =====================================================================
INSERT INTO maintenance_history (history_id, order_id, service_date, service_summary, next_service_due_date, next_service_due_mileage) VALUES
(1, 5, '2026-08-23 17:00:00', 'Routine 10,000km service completed — oil change, filter, chain adjustment.', '2026-11-23', 25300);

-- =====================================================================
-- INVOICES
-- issued_by / received_by = 6 (vinzel, Service Advisor)
-- =====================================================================
INSERT INTO invoices (invoice_id, order_id, invoice_date, labor_total, parts_total, discount, tax_amount, total_amount, payment_method, payment_reference, payment_date, status, issued_by, received_by) VALUES
(2, 5, '2026-08-23 17:05:00', 1000.00, 920.00, 0.00, 0.00, 1920.00, 'CASH', NULL, '2026-08-23 17:10:00', 'PAID', 6, 6);
DELIMITER //

DROP PROCEDURE IF EXISTS get_all_mechanics //

CREATE PROCEDURE get_all_mechanics(
    IN p_search VARCHAR(255),
    IN p_status VARCHAR(20),
    IN p_sort_by VARCHAR(50),
    IN p_sort_order VARCHAR(4)
)
BEGIN
    -- Sanitize search input
    IF p_search IS NOT NULL THEN
        SET p_search = TRIM(p_search);
        IF p_search = '' THEN SET p_search = NULL; END IF;
    END IF;

    -- Sanitize status filter (Default to 'ACTIVE' if empty/ALL)
    IF p_status IS NOT NULL THEN
        SET p_status = TRIM(p_status);
        IF p_status = '' OR p_status = 'ALL' THEN SET p_status = NULL; END IF;
    END IF;

    -- Sanitize sort parameters
    SET p_sort_by = LOWER(IFNULL(TRIM(p_sort_by), 'mechanic_id'));
    SET p_sort_order = UPPER(IFNULL(TRIM(p_sort_order), 'ASC'));

    IF p_sort_order NOT IN ('ASC', 'DESC') THEN
        SET p_sort_order = 'ASC';
    END IF;

    SELECT 
        CONCAT('M-', LPAD(m.mechanic_id, 3, '0')) AS formatted_mechanic_id,
        m.mechanic_id,
        CONCAT(u.first_name, ' ', IFNULL(CONCAT(u.middle_name, ' '), ''), u.last_name) AS full_name,
        u.username,
        u.email,
        u.contact_no,
        r.role_name,
        m.specialization,
        m.date_hired,
        m.status AS mechanic_status
    FROM mechanics m
    JOIN users u ON m.user_id = u.user_id
    JOIN roles r ON u.role_id = r.role_id
    WHERE 
        -- Status Filter
        (p_status IS NULL OR m.status = p_status)

        -- Search Filter (Matches exact mechanic_id, formatted M-001 ID, name, email, phone, username, or specialization)
        AND (
            p_search IS NULL
            OR CAST(m.mechanic_id AS CHAR) = p_search
            OR CONCAT('M-', LPAD(m.mechanic_id, 3, '0')) LIKE CONCAT('%', p_search, '%')
            OR CONCAT(u.first_name, ' ', IFNULL(CONCAT(u.middle_name, ' '), ''), u.last_name) LIKE CONCAT('%', p_search, '%')
            OR u.username LIKE CONCAT('%', p_search, '%')
            OR u.email LIKE CONCAT('%', p_search, '%')
            OR u.contact_no LIKE CONCAT('%', p_search, '%')
            OR m.specialization LIKE CONCAT('%', p_search, '%')
        )
    ORDER BY 
        -- Sort by Full Name
        CASE WHEN p_sort_by = 'full_name' AND p_sort_order = 'ASC' THEN CONCAT(u.first_name, ' ', u.last_name) END ASC,
        CASE WHEN p_sort_by = 'full_name' AND p_sort_order = 'DESC' THEN CONCAT(u.first_name, ' ', u.last_name) END DESC,

        -- Sort by Date Hired
        CASE WHEN (p_sort_by = 'date_hired' OR p_sort_by = 'date') AND p_sort_order = 'ASC' THEN m.date_hired END ASC,
        CASE WHEN (p_sort_by = 'date_hired' OR p_sort_by = 'date') AND p_sort_order = 'DESC' THEN m.date_hired END DESC,

        -- Default Fallback
        m.mechanic_id ASC;
END //

DELIMITER ;
DELIMITER //
	CREATE PROCEDURE sp_populate_dashboard_cards()
	BEGIN	
		SELECT 
			SUM(status = 'PENDING_DIAGNOSIS') AS needs_diagnostician,
			SUM(status = 'AWAITING_DIAGNOSIS') AS awaiting_diagnosis,
			SUM(status = 'PENDING_MECHANICS') AS needs_mechanics,
			SUM(status = 'READY_TO_INVOICE') AS ready_to_invoice,
			SUM(status = 'AWAITING_PARTS') AS awaiting_parts
		FROM repair_orders;
	END //

	
DELIMITER //
	DROP PROCEDURE IF EXISTS sp_populate_dashboard_table; //
	CREATE PROCEDURE sp_populate_dashboard_table()
	BEGIN
		SELECT 
			CONCAT('RO-', ro.order_id) AS order_id,
			CONCAT(c.first_name, ' ', c.last_name) AS customer,
			CONCAT(v.manufacturer, ' ', v.model, ' ', v.year_model) AS vehicle,
			ro.status,
			IFNULL(CONCAT('₱', FORMAT(i.total_amount, 2)), '—') AS amount
		FROM repair_orders ro
		JOIN vehicles v ON ro.vehicle_id = v.vehicle_id
		JOIN customers c ON v.customer_id = c.customer_id
		LEFT JOIN invoices i ON ro.order_id = i.order_id
		ORDER BY ro.order_id ASC;
	END //

	DELIMITER ;

DELIMITER //

CREATE PROCEDURE sp_create_vehicle_intake(
    -- Customer Inputs (Step 1)
    IN p_first_name VARCHAR(75),
    IN p_middle_name VARCHAR(75),
    IN p_last_name VARCHAR(75),
    IN p_contact_no VARCHAR(20),
    IN p_email VARCHAR(100),
    IN p_address VARCHAR(255),
    
    -- Vehicle Inputs (Step 2)
    IN p_plate_number VARCHAR(20),
    IN p_vehicle_type ENUM('CAR','MOTORCYCLE','TRICYCLE'),
    IN p_manufacturer VARCHAR(50),
    IN p_model VARCHAR(50),
    IN p_year_model YEAR,
    IN p_color VARCHAR(30),
    IN p_vin_number VARCHAR(50),
    IN p_current_mileage INT,
    
    -- Repair Order Inputs (Step 3)
    IN p_complaint VARCHAR(500),
    IN p_priority ENUM('STANDARD','URGENT','RUSH'),
    IN p_created_by INT,
    
    -- Output Parameters
    OUT p_order_id INT,
    OUT p_customer_id INT,
    OUT p_vehicle_id INT
)
BEGIN
    -- Declare local variable to hold sanitized VIN
    DECLARE v_vin VARCHAR(50);

    START TRANSACTION;

    -- Converts "" (empty string) to NULL
    SET v_vin = NULLIF(TRIM(p_vin_number), '');

    -- 1. Check if vehicle exists by plate number
    SELECT vehicle_id, customer_id 
    INTO p_vehicle_id, p_customer_id 
    FROM vehicles 
    WHERE plate_number = p_plate_number 
    LIMIT 1;

    -- 2. If vehicle was not found, search for customer by contact number or email
    IF p_customer_id IS NULL THEN
        SELECT customer_id INTO p_customer_id 
        FROM customers 
        WHERE contact_no = p_contact_no 
           OR (email IS NOT NULL AND email = p_email) 
        LIMIT 1;
    END IF;

    -- 3. Handle Customer (Insert if new, Sync details if existing)
    IF p_customer_id IS NULL THEN
        INSERT INTO customers (first_name, middle_name, last_name, contact_no, email, address)
        VALUES (p_first_name, p_middle_name, p_last_name, p_contact_no, p_email, p_address);
        
        SET p_customer_id = LAST_INSERT_ID();
    ELSE
        -- Update contact info / address in case they changed
        UPDATE customers 
        SET contact_no = p_contact_no,
            email      = IFNULL(p_email, email),
            address    = IFNULL(p_address, address)
        WHERE customer_id = p_customer_id;
    END IF;

    -- 4. Handle Vehicle (Insert if new, Sync mileage & color if existing)
    IF p_vehicle_id IS NULL THEN
        -- Use v_vin here instead of p_vin_number
        INSERT INTO vehicles (customer_id, plate_number, vehicle_type, manufacturer, model, year_model, color, vin_number, current_mileage)
        VALUES (p_customer_id, p_plate_number, p_vehicle_type, p_manufacturer, p_model, p_year_model, p_color, v_vin, p_current_mileage);
        
        SET p_vehicle_id = LAST_INSERT_ID();
    ELSE
        -- Update mileage and color for returning vehicles
        UPDATE vehicles 
        SET current_mileage = p_current_mileage,
            color           = IFNULL(p_color, color)
        WHERE vehicle_id = p_vehicle_id;
    END IF;

    -- 5. Create Repair Order
    INSERT INTO repair_orders (vehicle_id, mileage_at_service, complaint, status, priority, created_by)
    VALUES (p_vehicle_id, p_current_mileage, p_complaint, 'PENDING_DIAGNOSIS', p_priority, p_created_by);

    SET p_order_id = LAST_INSERT_ID();

    COMMIT;
END //

DELIMITER ;
DELIMITER //

DROP PROCEDURE IF EXISTS sp_get_active_repair_orders //

CREATE PROCEDURE sp_get_active_repair_orders(
    IN p_status VARCHAR(100),
    IN p_search VARCHAR(255)
)
BEGIN
    -- Prepare wildcard pattern for search
    SET p_search = IF(p_search IS NULL OR TRIM(p_search) = '', NULL, CONCAT('%', TRIM(p_search), '%'));

    SELECT 
        CONCAT('RO-', ro.order_id) AS order_id,
        ro.order_id AS raw_order_id,
        CONCAT(c.first_name, ' ', c.last_name) AS customer_name,
        CONCAT(v.manufacturer, ' ', v.model, ' ', v.year_model, ' · ', v.plate_number, ' · ', v.vehicle_type) AS vehicle_info,
        ro.status,
        ro.priority,
        DATE_FORMAT(ro.date_received, '%b %d, %Y') AS formatted_date,
        
        IFNULL(
            GROUP_CONCAT(
                DISTINCT CONCAT(u.first_name, ' ', u.last_name) 
                SEPARATOR ', '
            ), 
            'Unassigned'
        ) AS assigned_mechanics,
        
        i.total_amount AS invoice_amount

    FROM repair_orders ro
    JOIN vehicles v ON ro.vehicle_id = v.vehicle_id
    JOIN customers c ON v.customer_id = c.customer_id
    
    LEFT JOIN repair_order_mechanics rom ON ro.order_id = rom.order_id
    LEFT JOIN mechanics m ON rom.mechanic_id = m.mechanic_id
    LEFT JOIN users u ON m.user_id = u.user_id
    LEFT JOIN invoices i ON ro.order_id = i.order_id
    
    WHERE ro.status NOT IN ('FULFILLED', 'CANCELLED' , "AWAITING_PAYMENT")
      -- Status Filter
      AND (p_status = 'ALL' OR p_status IS NULL OR ro.status = p_status)
      -- Search Bar Filter
      AND (
            p_search IS NULL
            OR CONCAT('RO-', ro.order_id) LIKE p_search
            OR ro.order_id LIKE p_search
            OR c.first_name LIKE p_search
            OR c.last_name LIKE p_search
            OR CONCAT(c.first_name, ' ', c.last_name) LIKE p_search
            OR v.plate_number LIKE p_search
            OR v.manufacturer LIKE p_search
            OR v.model LIKE p_search
      )
      
    GROUP BY ro.order_id
    ORDER BY ro.date_received DESC;
END //

DELIMITER ;

DELIMITER //

DROP PROCEDURE IF EXISTS sp_get_customer_directory //

CREATE PROCEDURE sp_get_customer_directory(
    IN p_search VARCHAR(255)
)
BEGIN
    -- Standardize empty search strings to NULL for easier SQL checking
    IF p_search IS NOT NULL THEN
        SET p_search = TRIM(p_search);
        IF p_search = '' THEN
            SET p_search = NULL;
        END IF;
    END IF;

    SELECT 
        c.customer_id,
        CONCAT('C-', LPAD(c.customer_id, 3, '0')) AS formatted_customer_id,
        CONCAT(c.first_name, ' ', c.last_name) AS full_name, 
        c.contact_no,
        c.email,
        COUNT(DISTINCT v.vehicle_id) AS vehicle_count,
        DATE_FORMAT(MAX(r.date_received), '%b %d, %Y') AS last_visit

    FROM customers c
    LEFT JOIN vehicles v ON c.customer_id = v.customer_id
    LEFT JOIN repair_orders r ON v.vehicle_id = r.vehicle_id

    WHERE 
        p_search IS NULL
        OR CONCAT('C-', LPAD(c.customer_id, 3, '0')) LIKE CONCAT('%', p_search, '%')
        OR CONCAT(c.first_name, ' ', c.last_name) LIKE CONCAT('%', p_search, '%')
        OR c.first_name LIKE CONCAT('%', p_search, '%')
        OR c.last_name LIKE CONCAT('%', p_search, '%')
        OR c.contact_no LIKE CONCAT('%', p_search, '%')
        OR c.email LIKE CONCAT('%', p_search, '%')
        OR v.plate_number LIKE CONCAT('%', p_search, '%')
        OR v.manufacturer LIKE CONCAT('%', p_search, '%')
        OR v.model LIKE CONCAT('%', p_search, '%')

    GROUP BY 
        c.customer_id,
        c.first_name,
        c.last_name,
        c.contact_no,
        c.email

    ORDER BY MAX(r.date_received) DESC;
END //

DELIMITER ;

USE VehicleRepair;

DELIMITER //

DROP PROCEDURE IF EXISTS sp_get_billing_and_invoicing //

CREATE PROCEDURE sp_get_billing_and_invoicing(
    IN p_search VARCHAR(255)
)
BEGIN
    IF p_search IS NOT NULL THEN
        SET p_search = TRIM(p_search);
        IF p_search = '' THEN SET p_search = NULL; END IF;
    END IF;

    SELECT 
        CONCAT('RO-', ro.order_id) AS order_id,
        ro.order_id AS raw_order_id,
        CONCAT(c.first_name, ' ', c.last_name) AS customer_name,
        TRIM(CONCAT(v.manufacturer, ' ', v.model, ' ', IFNULL(v.year_model, ''))) AS vehicle_name,
        v.plate_number,
        v.vehicle_type,
        DATE_FORMAT(ro.date_received, '%b %d, %Y') AS formatted_date,
        ro.status,
        IFNULL(i.total_amount,
            (IFNULL(sc_sum.labor_cost, 0) + IFNULL(parts_sum.parts_cost, 0))
        ) AS total_amount
    FROM repair_orders ro
    JOIN vehicles v ON ro.vehicle_id = v.vehicle_id
    JOIN customers c ON v.customer_id = c.customer_id
    LEFT JOIN invoices i ON ro.order_id = i.order_id
    
    -- Subquery for services/labor total from catalog
    LEFT JOIN (
        SELECT ros.order_id, SUM(sc.standard_labor_cost) AS labor_cost
        FROM repair_order_services ros
        JOIN service_catalog sc ON ros.service_catalog_id = sc.service_catalog_id
        GROUP BY ros.order_id
    ) sc_sum ON ro.order_id = sc_sum.order_id

    -- Subquery for parts total using quantity_used (ISSUED parts only)
    LEFT JOIN (
        SELECT order_id, SUM(unit_price * quantity_used) AS parts_cost
        FROM repair_order_parts
        WHERE status = 'ISSUED'
        GROUP BY order_id
    ) parts_sum ON ro.order_id = parts_sum.order_id

    WHERE ro.status IN ('READY_TO_INVOICE', 'AWAITING_PAYMENT', 'READY_FOR_RELEASE')
      AND (
            p_search IS NULL
            OR CONCAT('RO-', ro.order_id) LIKE CONCAT('%', p_search, '%')
            OR ro.order_id LIKE CONCAT('%', p_search, '%')
            OR CONCAT(c.first_name, ' ', c.last_name) LIKE CONCAT('%', p_search, '%')
            OR c.first_name LIKE CONCAT('%', p_search, '%')
            OR c.last_name LIKE CONCAT('%', p_search, '%')
            OR v.manufacturer LIKE CONCAT('%', p_search, '%')
            OR v.model LIKE CONCAT('%', p_search, '%')
            OR v.plate_number LIKE CONCAT('%', p_search, '%')
      )

    ORDER BY ro.date_received DESC;
END //

DELIMITER ;

DROP PROCEDURE IF EXISTS sp_get_order_history //

CREATE PROCEDURE sp_get_order_history(
    IN p_search VARCHAR(255)
)
BEGIN
    IF p_search IS NOT NULL THEN
        SET p_search = TRIM(p_search);
        IF p_search = '' THEN
            SET p_search = NULL;
        END IF;
    END IF;

    SELECT 
        CONCAT('RO-', ro.order_id) AS order_id,
        ro.order_id AS raw_order_id,
        CONCAT(c.first_name, ' ', c.last_name) AS customer_name,
        v.manufacturer AS vehicle_brand,
        v.model AS vehicle_model,
        v.vehicle_type,
        v.plate_number,
        DATE_FORMAT(ro.date_completed, '%b %d, %Y') AS completed_date,
        
        -- COALESCE handles missing mechanics or converts multiple into comma-separated list
        COALESCE(
            GROUP_CONCAT(DISTINCT CONCAT(u.first_name, ' ', u.last_name) SEPARATOR ', '), 
            'Unassigned'
        ) AS mechanics_list,

        -- COALESCE ensures financial totals never return NULL
        COALESCE(i.total_amount, 0.00) AS raw_total_paid,
        CONCAT('₱', FORMAT(COALESCE(i.total_amount, 0.00), 2)) AS formatted_total_paid

    FROM repair_orders ro
    JOIN vehicles v ON ro.vehicle_id = v.vehicle_id
    JOIN customers c ON v.customer_id = c.customer_id
    LEFT JOIN invoices i ON ro.order_id = i.order_id
    LEFT JOIN repair_order_mechanics rom ON ro.order_id = rom.order_id
    LEFT JOIN mechanics m ON rom.mechanic_id = m.mechanic_id
    LEFT JOIN users u ON m.user_id = u.user_id

    WHERE ro.status = 'FULFILLED'
      AND (
            p_search IS NULL
            OR CONCAT('RO-', ro.order_id) LIKE CONCAT('%', p_search, '%')
            OR CONCAT(c.first_name, ' ', c.last_name) LIKE CONCAT('%', p_search, '%')
            OR v.manufacturer LIKE CONCAT('%', p_search, '%')
            OR v.model LIKE CONCAT('%', p_search, '%')
            OR v.plate_number LIKE CONCAT('%', p_search, '%')
            OR u.first_name LIKE CONCAT('%', p_search, '%')
            OR u.last_name LIKE CONCAT('%', p_search, '%')
      )

    GROUP BY 
        ro.order_id,
        c.first_name,
        c.last_name,
        v.manufacturer,
        v.model,
        v.vehicle_type,
        v.plate_number,
        ro.date_completed,
        i.total_amount

    ORDER BY ro.date_completed DESC;
END //

DELIMITER ;



DELIMITER //

DROP PROCEDURE IF EXISTS sp_get_repair_order_details //

CREATE PROCEDURE sp_get_repair_order_details(
    IN p_order_id INT
)
BEGIN
    SELECT 
        CONCAT('RO-', ro.order_id) AS order_id,
        ro.order_id AS raw_order_id,
        DATE_FORMAT(ro.date_received, '%b %d, %Y') AS formatted_date,
        ro.status,
        ro.complaint,
        ro.mileage_at_service, 
        ro.diagnosis_notes,
        DATE_FORMAT(ro.diagnosis_completed_at, '%b %d, %Y %h:%i %p') AS formatted_diagnosis_date,
        CONCAT(c.first_name, ' ', c.last_name) AS customer_name,
        CONCAT(v.manufacturer, ' ', v.model, ' ', IFNULL(v.year_model, '')) AS vehicle_name,
        v.plate_number,
        v.vehicle_type,
        v.vin_number,    

        -- 1. Assigned Mechanics Array
        CONCAT('[', 
            IFNULL(
                (
                    SELECT GROUP_CONCAT(
                        CONCAT(
                            '{"assignment_id":', rom.assignment_id,
                            ',"mechanic_id":', rom.mechanic_id,
                            ',"mechanic_name":', JSON_QUOTE(CONCAT(u.first_name, ' ', u.last_name)),
                            ',"position_name":', JSON_QUOTE(mp.position_name),
                            ',"date_assigned":', JSON_QUOTE(DATE_FORMAT(rom.date_assigned, '%b %d, %Y %h:%i %p')),
                            '}'
                        )
                        SEPARATOR ','
                    )
                    FROM repair_order_mechanics rom
                    JOIN mechanics m ON rom.mechanic_id = m.mechanic_id
                    JOIN users u ON m.user_id = u.user_id
                    JOIN mechanic_positions mp ON rom.position_id = mp.position_id
                    WHERE rom.order_id = p_order_id
                ), 
                ''
            ), 
        ']') AS assigned_mechanics,

        -- 2. Services Array
        CONCAT('[', 
            IFNULL(
                (
                    SELECT GROUP_CONCAT(
                        CONCAT(
                            '{"order_service_id":', ros.order_service_id,
                            ',"service_catalog_id":', ros.service_catalog_id,
                            ',"service_name":', JSON_QUOTE(sc.service_name),
                            ',"labor_cost":', sc.standard_labor_cost,
                            '}'
                        )
                        SEPARATOR ','
                    )
                    FROM repair_order_services ros
                    JOIN service_catalog sc ON ros.service_catalog_id = sc.service_catalog_id
                    WHERE ros.order_id = p_order_id
                ), 
                ''
            ), 
        ']') AS services,

        -- 3. Itemized Parts Array (ISSUED only)
        CONCAT('[', 
            IFNULL(
                (
                    SELECT GROUP_CONCAT(
                        CONCAT(
                            '{"order_part_id":', rop.order_part_id,
                            ',"part_id":', rop.part_id,
                            ',"part_name":', JSON_QUOTE(pi.part_name),
                            ',"quantity_used":', rop.quantity_used,
                            ',"unit_price":', rop.unit_price,
                            ',"parts_subtotal":', (rop.quantity_used * rop.unit_price),
                            '}'
                        )
                        SEPARATOR ','
                    )
                    FROM repair_order_parts rop
                    JOIN parts_inventory pi ON rop.part_id = pi.part_id
                    WHERE rop.order_id = p_order_id
                      AND rop.status = 'ISSUED'
                ), 
                ''
            ), 
        ']') AS parts,

        -- 4. Financial Calculations
        IFNULL(
            (
                SELECT SUM(sc.standard_labor_cost) 
                FROM repair_order_services ros
                JOIN service_catalog sc ON ros.service_catalog_id = sc.service_catalog_id
                WHERE ros.order_id = p_order_id
            ), 
            0.00
        ) AS total_labor_cost,

        IFNULL(
            (
                SELECT SUM(quantity_used * unit_price) 
                FROM repair_order_parts 
                WHERE order_id = p_order_id
                  AND status = 'ISSUED'
            ), 
            0.00
        ) AS total_parts_cost,

        (
            IFNULL(
                (
                    SELECT SUM(sc.standard_labor_cost) 
                    FROM repair_order_services ros
                    JOIN service_catalog sc ON ros.service_catalog_id = sc.service_catalog_id
                    WHERE ros.order_id = p_order_id
                ), 0.00
            ) + 
            IFNULL(
                (
                    SELECT SUM(quantity_used * unit_price) 
                    FROM repair_order_parts 
                    WHERE order_id = p_order_id
                      AND status = 'ISSUED'
                ), 0.00
            )
        ) AS grand_total

    FROM repair_orders ro
    JOIN vehicles v ON ro.vehicle_id = v.vehicle_id
    JOIN customers c ON v.customer_id = c.customer_id
    WHERE ro.order_id = p_order_id;
END //

DELIMITER ;
-- =====================================================================
-- sp_correct_intake_details
--
-- Layunin: pinapayagan ang Service Advisor na ayusin ang mga maling
-- na-type na detalye (pangalan, contact, plate number, complaint)
-- MATAPOS magawa ang intake — nang hindi binibigyan ng direktang
-- GRANT UPDATE sa customers/vehicles/repair_orders.
--
-- Bakit ganito: kung DEFINER=root ang procedure, ang procedure mismo
-- ang gumagawa ng UPDATE — hindi ang tumatawag. Kaya kahit SELECT lang
-- ang meron ang Service Advisor sa mga table, gumagana pa rin ito.
--
-- Sinadyang HINDI kasama: status, diagnosis_notes, mileage,
-- vehicle_type — mga iyon ay dapat sa ibang proseso/role dumaan
-- (diagnosis workflow, mechanic updates), hindi basta "typo fix."
-- =====================================================================

DROP PROCEDURE IF EXISTS sp_correct_intake_details;
DELIMITER $$
CREATE PROCEDURE sp_correct_intake_details(
    IN p_order_id INT,
    IN p_first_name VARCHAR(75),
    IN p_middle_name VARCHAR(75),
    IN p_last_name VARCHAR(75),
    IN p_contact_no VARCHAR(20),
    IN p_email VARCHAR(100),
    IN p_plate_number VARCHAR(20),
    IN p_complaint VARCHAR(500),
    OUT p_result VARCHAR(150)
)
BEGIN
    DECLARE v_customer_id INT;
    DECLARE v_vehicle_id INT;
    DECLARE v_status VARCHAR(30);

    -- hanapin muna kung sino talaga ang customer/vehicle ng order na ito
    SELECT ro.status, v.vehicle_id, v.customer_id
    INTO v_status, v_vehicle_id, v_customer_id
    FROM repair_orders ro
    JOIN vehicles v ON v.vehicle_id = ro.vehicle_id
    WHERE ro.order_id = p_order_id;

    IF v_customer_id IS NULL THEN
        SET p_result = 'FAILED: Order not found.';

    ELSEIF v_status IN ('FULFILLED', 'CANCELLED') THEN
        -- huwag nang payagang baguhin ang mga sarado nang order —
        -- dapat manatiling accurate ang history
        SET p_result = 'FAILED: Order is already closed, cannot edit.';

    ELSE
        UPDATE customers
        SET first_name = p_first_name,
            middle_name = p_middle_name,
            last_name   = p_last_name,
            contact_no  = p_contact_no,
            email       = p_email
        WHERE customer_id = v_customer_id;

        UPDATE vehicles
        SET plate_number = p_plate_number
        WHERE vehicle_id = v_vehicle_id;

        UPDATE repair_orders
        SET complaint = p_complaint
        WHERE order_id = p_order_id;

        SET p_result = 'SUCCESS: Details corrected.';
    END IF;
END $$
DELIMITER ;
GRANT EXECUTE ON PROCEDURE VehicleRepair.sp_correct_intake_details TO 'service_advisor'@'localhost';
DELIMITER //

DROP PROCEDURE IF EXISTS sp_assign_diagnostician //

CREATE PROCEDURE sp_assign_diagnostician(
    IN p_order_id INT,
    IN p_mechanic_id INT,
    IN p_created_by INT
)
BEGIN
    DECLARE v_order_exists INT DEFAULT 0;
    DECLARE v_current_status VARCHAR(50);
    DECLARE v_mechanic_exists INT DEFAULT 0;
    DECLARE v_diagnostician_position_id INT DEFAULT NULL;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    -- 1. Check if repair order exists and fetch current status
    SELECT COUNT(*), status INTO v_order_exists, v_current_status 
    FROM repair_orders 
    WHERE order_id = p_order_id
    GROUP BY status;

    IF v_order_exists = 0 THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'Repair order not found.';
    END IF;

    -- 2. Validate that order status is strictly PENDING_DIAGNOSIS
    IF v_current_status != 'PENDING_DIAGNOSIS' THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'Cannot assign diagnostician. Order is not in PENDING_DIAGNOSIS status.';
    END IF;

    -- 3. Check if mechanic exists and is active
    SELECT COUNT(*) INTO v_mechanic_exists 
    FROM mechanics 
    WHERE mechanic_id = p_mechanic_id AND status = 'ACTIVE';

    IF v_mechanic_exists = 0 THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'Mechanic not found or inactive.';
    END IF;

    -- 4. Get position_id for "Diagnostician"
    SELECT position_id INTO v_diagnostician_position_id
    FROM mechanic_positions 
    WHERE position_name = 'Diagnostician'
    LIMIT 1;

    IF v_diagnostician_position_id IS NULL THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'Diagnostician position configuration missing in mechanic_positions table.';
    END IF;

    -- 5. Update repair order status
    UPDATE repair_orders
    SET status = 'AWAITING_DIAGNOSIS'
    WHERE order_id = p_order_id;

    -- 6. Insert assignment into repair_order_mechanics with position_id
    INSERT INTO repair_order_mechanics (order_id, mechanic_id, position_id, date_assigned)
    VALUES (p_order_id, p_mechanic_id, v_diagnostician_position_id, NOW());

    COMMIT;
END //

DELIMITER ;
DELIMITER //

DROP PROCEDURE IF EXISTS sp_submit_diagnosis //

CREATE PROCEDURE sp_submit_diagnosis(
    IN p_order_id INT,
    IN p_diagnosis_notes TEXT,
    IN p_services_json JSON,
    IN p_created_by INT
)
BEGIN
    DECLARE i INT DEFAULT 0;
    DECLARE v_service_count INT DEFAULT 0;
    DECLARE v_service_id INT;
    DECLARE v_order_exists INT DEFAULT 0;
    DECLARE v_current_status VARCHAR(50);
    DECLARE v_service_exists INT DEFAULT 0;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    -- 1. Check if repair order exists and fetch current status
    SELECT COUNT(*), status INTO v_order_exists, v_current_status 
    FROM repair_orders 
    WHERE order_id = p_order_id
    GROUP BY status;

    IF v_order_exists = 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Repair order not found.';
    END IF;

    -- 2. Validate status: allow initial submission or dynamic updates prior to active repair
    IF v_current_status NOT IN ('AWAITING_DIAGNOSIS', 'PENDING_MECHANICS') THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Cannot update diagnosis. Work is already in progress or completed.';
    END IF;

    -- 3. Validate all provided service IDs before applying changes
    IF p_services_json IS NOT NULL AND JSON_VALID(p_services_json) THEN
        SET v_service_count = JSON_LENGTH(p_services_json);
        
        WHILE i < v_service_count DO
            SET v_service_id = CAST(JSON_EXTRACT(p_services_json, CONCAT('$[', i, ']')) AS UNSIGNED);
            
            SELECT COUNT(*) INTO v_service_exists
            FROM service_catalog
            WHERE service_catalog_id = v_service_id;

            IF v_service_exists = 0 THEN
                SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'One or more selected services do not exist in the catalog.';
            END IF;

            SET i = i + 1;
        END WHILE;
    END IF;

    -- 4. Update Repair Order details
    UPDATE repair_orders
    SET status = 'PENDING_MECHANICS',
        diagnosis_notes = p_diagnosis_notes,
        diagnosis_completed_at = NOW()
    WHERE order_id = p_order_id;

    -- 5. Clear old service selections for this order to keep services dynamic
    DELETE FROM repair_order_services 
    WHERE order_id = p_order_id;

    -- 6. Insert new/updated service list
    SET i = 0;
    IF p_services_json IS NOT NULL AND JSON_VALID(p_services_json) THEN
        WHILE i < v_service_count DO
            SET v_service_id = CAST(JSON_EXTRACT(p_services_json, CONCAT('$[', i, ']')) AS UNSIGNED);
            
            INSERT INTO repair_order_services (order_id, service_catalog_id)
            VALUES (p_order_id, v_service_id);
            
            SET i = i + 1;
        END WHILE;
    END IF;

    COMMIT;
END //

DELIMITER ;
DELIMITER //

DROP PROCEDURE IF EXISTS sp_assign_mechanic //

CREATE PROCEDURE sp_assign_mechanic(
    IN p_order_id INT,
    IN p_mechanic_id INT,
    IN p_position_id INT,
    IN p_created_by INT
)
BEGIN
    DECLARE v_current_status VARCHAR(50) DEFAULT NULL;
    DECLARE v_mechanic_exists INT DEFAULT 0;
    DECLARE v_position_exists INT DEFAULT 0;
    DECLARE v_already_assigned INT DEFAULT 0;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    -- 1. Check if repair order exists and retrieve current status
    SELECT status INTO v_current_status 
    FROM repair_orders 
    WHERE order_id = p_order_id;

    IF v_current_status IS NULL THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'Repair order not found.';
    END IF;

    -- 2. Guard Clause: Block assignment during diagnosis stages
    IF v_current_status IN ('PENDING_DIAGNOSIS', 'AWAITING_DIAGNOSIS') THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'Cannot assign mechanics while order is pending or awaiting diagnosis.';
    ELSEIF v_current_status NOT IN ('PENDING_MECHANICS', 'IN_PROGRESS') THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'Cannot assign mechanic. Order is not in a valid stage for crew assignment.';
    END IF;

    -- 3. Check if mechanic exists and is active
    SELECT COUNT(*) INTO v_mechanic_exists 
    FROM mechanics 
    WHERE mechanic_id = p_mechanic_id AND status = 'ACTIVE';

    IF v_mechanic_exists = 0 THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'Mechanic not found or inactive.';
    END IF;

    -- 4. Check if position_id exists in mechanic_positions catalog
    SELECT COUNT(*) INTO v_position_exists 
    FROM mechanic_positions 
    WHERE position_id = p_position_id;

    IF v_position_exists = 0 THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'Selected mechanic position does not exist.';
    END IF;

    -- 5. CHECK: Is mechanic ALREADY assigned to THIS repair order in ANY position?
    SELECT COUNT(*) INTO v_already_assigned
    FROM repair_order_mechanics
    WHERE order_id = p_order_id 
      AND mechanic_id = p_mechanic_id;

    IF v_already_assigned > 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'This mechanic is already assigned to this repair order.';
    END IF;

    -- 6. Record assignment in repair_order_mechanics
    INSERT INTO repair_order_mechanics (order_id, mechanic_id, position_id, date_assigned)
    VALUES (p_order_id, p_mechanic_id, p_position_id, NOW());

    -- 7. Transition order status from PENDING_MECHANICS to IN_PROGRESS
    IF v_current_status = 'PENDING_MECHANICS' THEN
        UPDATE repair_orders
        SET status = 'IN_PROGRESS'
        WHERE order_id = p_order_id;
    END IF;

    COMMIT;
END //

DELIMITER ;

DELIMITER //

DROP PROCEDURE IF EXISTS sp_get_available_mechanics //

CREATE PROCEDURE sp_get_available_mechanics(
    IN p_order_id INT
)
BEGIN
    SELECT 
        m.mechanic_id,
        u.first_name,
        u.last_name,
        CONCAT(u.first_name, ' ', u.last_name) AS full_name,
        m.specialization,
        m.status
    FROM mechanics m
    INNER JOIN users u ON m.user_id = u.user_id
    WHERE m.status = 'ACTIVE'
      AND m.mechanic_id NOT IN (
          SELECT rom.mechanic_id 
          FROM repair_order_mechanics rom 
          WHERE rom.order_id = p_order_id
      )
    ORDER BY u.first_name ASC, u.last_name ASC;
END //

DELIMITER ;

DELIMITER //

DROP PROCEDURE IF EXISTS sp_log_repair_order_part //

CREATE PROCEDURE sp_log_repair_order_part(
    IN p_order_id INT,
    IN p_part_id INT,
    IN p_quantity INT
)
BEGIN
    DECLARE v_order_status VARCHAR(50) DEFAULT NULL;
    DECLARE v_qty_on_hand INT DEFAULT NULL;
    DECLARE v_unit_price DECIMAL(10,2) DEFAULT NULL;
    DECLARE v_batch_number VARCHAR(50) DEFAULT NULL;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    -- 1. Validate Input Quantity
    IF p_quantity IS NULL OR p_quantity <= 0 THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'Quantity must be greater than zero.';
    END IF;

    -- 2. Lock and Check Repair Order Status
    SELECT status INTO v_order_status 
    FROM repair_orders 
    WHERE order_id = p_order_id
    FOR UPDATE;

    IF v_order_status IS NULL THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'Repair order not found.';
    END IF;

    -- Guard Clause: Must be IN_PROGRESS or AWAITING_PARTS to log parts
    IF v_order_status NOT IN ('IN_PROGRESS', 'AWAITING_PARTS') THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'Parts can only be logged when order is IN_PROGRESS or AWAITING_PARTS.';
    END IF;

    -- 3. Lock and Check Part Details from Inventory
    SELECT quantity_on_hand, unit_price, batch_number 
    INTO v_qty_on_hand, v_unit_price, v_batch_number
    FROM parts_inventory 
    WHERE part_id = p_part_id AND status = 'ACTIVE'
    FOR UPDATE;

    IF v_unit_price IS NULL THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'Selected part is inactive or does not exist.';
    END IF;

    -- 4. Branching Logic based on Stock Availability
    IF v_qty_on_hand < p_quantity THEN
        -- OUT OF STOCK:
        -- Log request as PENDING_PARTS without deducting inventory
        INSERT INTO repair_order_parts (
            order_id, 
            part_id, 
            batch_number, 
            quantity_used, 
            unit_price,
            status
        ) VALUES (
            p_order_id, 
            p_part_id, 
            v_batch_number, 
            p_quantity, 
            v_unit_price,
            'PENDING_PARTS'
        );

        -- Update main repair order status to AWAITING_PARTS
        UPDATE repair_orders 
        SET status = 'AWAITING_PARTS' 
        WHERE order_id = p_order_id;

    ELSE
        -- SUFFICIENT STOCK:
        -- Deduct stock from inventory
        UPDATE parts_inventory 
        SET quantity_on_hand = quantity_on_hand - p_quantity 
        WHERE part_id = p_part_id;

        -- Log request as ISSUED
        INSERT INTO repair_order_parts (
            order_id, 
            part_id, 
            batch_number, 
            quantity_used, 
            unit_price,
            status
        ) VALUES (
            p_order_id, 
            p_part_id, 
            v_batch_number, 
            p_quantity, 
            v_unit_price,
            'ISSUED'
        );
    END IF;

    COMMIT;
END //

DELIMITER ;
DELIMITER //

DROP PROCEDURE IF EXISTS sp_restock_and_fulfill_part //

CREATE PROCEDURE sp_restock_and_fulfill_part(
    IN p_part_id INT,
    IN p_restock_qty INT
)
BEGIN
    DECLARE v_remaining_stock INT DEFAULT NULL;
    DECLARE v_done INT DEFAULT FALSE;
    
    -- Variables for cursor iteration
    DECLARE v_order_part_id INT;
    DECLARE v_order_id INT;
    DECLARE v_qty_needed INT;
    DECLARE v_pending_count INT DEFAULT 0;

    -- Cursor to iterate through pending parts in FIFO order
    DECLARE pending_cursor CURSOR FOR
        SELECT order_part_id, order_id, quantity_used
        FROM repair_order_parts
        WHERE part_id = p_part_id 
          AND status = 'PENDING_PARTS'
        ORDER BY order_part_id ASC;

    DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_done = TRUE;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    -- 1. Validate Input Quantity
    IF p_restock_qty IS NULL OR p_restock_qty <= 0 THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'Restock quantity must be greater than zero.';
    END IF;

    -- 2. Verify Part Existence FIRST and Lock Row
    SELECT quantity_on_hand INTO v_remaining_stock
    FROM parts_inventory
    WHERE part_id = p_part_id AND status = 'ACTIVE'
    FOR UPDATE;

    -- Guard clause: if SELECT INTO didn't match any row, v_remaining_stock stays NULL
    IF v_remaining_stock IS NULL THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'Part does not exist or is inactive.';
    END IF;

    -- 3. Update Inventory Stock
    UPDATE parts_inventory
    SET quantity_on_hand = quantity_on_hand + p_restock_qty
    WHERE part_id = p_part_id;

    SET v_remaining_stock = v_remaining_stock + p_restock_qty;

    -- 4. Process Pending Repair Orders via FIFO
    OPEN pending_cursor;

    read_loop: LOOP
        FETCH pending_cursor INTO v_order_part_id, v_order_id, v_qty_needed;
        
        IF v_done OR v_remaining_stock <= 0 THEN
            LEAVE read_loop;
        END IF;

        IF v_remaining_stock >= v_qty_needed THEN
            -- Deduct from local stock count
            SET v_remaining_stock = v_remaining_stock - v_qty_needed;

            -- Update repair_order_parts status
            UPDATE repair_order_parts
            SET status = 'ISSUED'
            WHERE order_part_id = v_order_part_id;

            -- Check if repair order has any remaining pending parts
            SELECT COUNT(*) INTO v_pending_count
            FROM repair_order_parts
            WHERE order_id = v_order_id AND status = 'PENDING_PARTS';

            -- If all pending items are cleared, set order back to IN_PROGRESS
            IF v_pending_count = 0 THEN
                UPDATE repair_orders
                SET status = 'IN_PROGRESS'
                WHERE order_id = v_order_id;
            END IF;
        END IF;

    END LOOP;

    CLOSE pending_cursor;

    -- 5. Finalize Inventory Quantity
    UPDATE parts_inventory
    SET quantity_on_hand = v_remaining_stock
    WHERE part_id = p_part_id;

    COMMIT;
END //

DELIMITER ;

DELIMITER //

DROP PROCEDURE IF EXISTS sp_get_parts_inventory //

CREATE PROCEDURE sp_get_parts_inventory(
    IN p_status VARCHAR(50),
    IN p_search VARCHAR(255)
)
BEGIN
    -- Format search term with wildcards
    SET p_search = IF(p_search IS NULL OR TRIM(p_search) = '', NULL, CONCAT('%', TRIM(p_search), '%'));

    SELECT 
        part_id,
        part_code,
        part_name,
        category,
        unit,
        unit_price,
        quantity_on_hand,
        reorder_level,
        batch_number,
        date_added,
        status
    FROM parts_inventory
    WHERE (p_status = 'ALL' OR p_status IS NULL OR status = p_status)
      AND (
          p_search IS NULL 
          OR part_code LIKE p_search
          OR part_name LIKE p_search 
          OR category LIKE p_search
          OR batch_number LIKE p_search
      )
    ORDER BY part_name ASC;
END //

DELIMITER ;
DELIMITER $$

DROP PROCEDURE IF EXISTS sp_get_parts_by_repair_order$$

CREATE PROCEDURE sp_get_parts_by_repair_order(
    IN p_order_id INT
)
BEGIN
    SELECT 
        rop.order_part_id,
        rop.order_id,
        rop.part_id,
        pi.part_code,
        pi.part_name,
        pi.category,
        pi.unit,
        rop.batch_number,
        rop.quantity_used,
        rop.unit_price AS unit_price_at_use,
        pi.unit_price AS current_unit_price,
        (rop.quantity_used * rop.unit_price) AS subtotal,
        rop.status AS part_status,
        pi.status AS inventory_status
    FROM repair_order_parts rop
    INNER JOIN parts_inventory pi ON rop.part_id = pi.part_id
    WHERE rop.order_id = p_order_id
      AND rop.status != 'CANCELLED'
    ORDER BY rop.order_part_id ASC;
END$$

DELIMITER ;
DELIMITER $$

DROP PROCEDURE IF EXISTS sp_mark_ready_to_invoice$$

CREATE PROCEDURE sp_mark_ready_to_invoice(
    IN p_order_id INT,
    IN p_user_id INT
)
sp_lbl: BEGIN
    DECLARE v_pending_parts_count INT DEFAULT 0;
    DECLARE v_current_status VARCHAR(50);

    -- 1. Check if repair order exists & fetch current status
    SELECT status INTO v_current_status
    FROM repair_orders
    WHERE order_id = p_order_id;

    IF v_current_status IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Repair order not found.';
        LEAVE sp_lbl;
    END IF;

    -- 2. Validate current state transitions
    IF v_current_status IN ('PENDING_DIAGNOSIS','AWAITING_DIAGNOSIS','READY_TO_INVOICE', 'AWAITING_PAYMENT', 'READY_FOR_RELEASE', 'FULFILLED', 'CANCELLED') THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Repair order has already passed the work stage or is cancelled.';
        LEAVE sp_lbl;
    END IF;

    -- 3. Ensure no parts are still pending stock fulfillment
    SELECT COUNT(*) INTO v_pending_parts_count
    FROM repair_order_parts
    WHERE order_id = p_order_id AND status = 'PENDING_PARTS';

    IF v_pending_parts_count > 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Cannot mark as Ready to Invoice: There are still parts pending stock fulfillment.';
        LEAVE sp_lbl;
    END IF;

    -- 4. Update Repair Order status and set completion timestamp
    UPDATE repair_orders
    SET 
        status = 'READY_TO_INVOICE',
        date_completed = NOW()
    WHERE order_id = p_order_id;

END$$

DELIMITER ;

DELIMITER $$
DROP PROCEDURE IF EXISTS sp_mark_awaiting_payment$$

CREATE PROCEDURE sp_mark_awaiting_payment(
    IN p_order_id INT,
    IN p_user_id INT,
    IN p_tax_rate DECIMAL(5,2),
    IN p_discount DECIMAL(10,2)
)
sp_lbl: BEGIN
    DECLARE v_current_status VARCHAR(50);
    DECLARE v_parts_total DECIMAL(10,2) DEFAULT 0.00;
    DECLARE v_labor_total DECIMAL(10,2) DEFAULT 0.00;
    DECLARE v_subtotal DECIMAL(10,2) DEFAULT 0.00;
    DECLARE v_tax_amount DECIMAL(10,2) DEFAULT 0.00;
    DECLARE v_total_amount DECIMAL(10,2) DEFAULT 0.00;
    DECLARE v_existing_invoice_id INT DEFAULT NULL;

    -- Standard error handling rollback
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    -- 1. Check if repair order exists & verify current status
    SELECT status INTO v_current_status
    FROM repair_orders
    WHERE order_id = p_order_id;

    IF v_current_status IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Repair order not found.';
        LEAVE sp_lbl;
    END IF;

    -- Ensure order is in READY_TO_INVOICE state before generating invoice
    IF v_current_status != 'READY_TO_INVOICE' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Cannot generate invoice: Repair order must be in READY_TO_INVOICE status.';
        LEAVE sp_lbl;
    END IF;

    -- Check if an active invoice already exists for this order
    SELECT invoice_id INTO v_existing_invoice_id
    FROM invoices
    WHERE order_id = p_order_id AND status != 'VOID'
    LIMIT 1;

    IF v_existing_invoice_id IS NOT NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'An active invoice already exists for this repair order.';
        LEAVE sp_lbl;
    END IF;

    START TRANSACTION;

    -- 2. Calculate Total Parts Cost (using quantity_used)
    SELECT IFNULL(SUM(quantity_used * unit_price), 0.00) INTO v_parts_total
    FROM repair_order_parts
    WHERE order_id = p_order_id AND status != 'CANCELLED';

    -- 3. Calculate Total Labor Cost (joining repair_order_services with service_catalog)
    SELECT IFNULL(SUM(sc.standard_labor_cost), 0.00) INTO v_labor_total
    FROM repair_order_services ros
    INNER JOIN service_catalog sc ON ros.service_catalog_id = sc.service_catalog_id
    WHERE ros.order_id = p_order_id;

    -- 4. Compute Financial Totals
    SET v_subtotal = v_parts_total + v_labor_total;
    SET v_tax_amount = (v_subtotal - IFNULL(p_discount, 0.00)) * (IFNULL(p_tax_rate, 0.00) / 100);
    SET v_total_amount = (v_subtotal - IFNULL(p_discount, 0.00)) + v_tax_amount;

    -- 5. Insert record into `invoices` table
    INSERT INTO invoices (
        order_id,
        invoice_date,
        labor_total,
        parts_total,
        discount,
        tax_amount,
        total_amount,
        status,
        issued_by
    ) VALUES (
        p_order_id,
        NOW(),
        v_labor_total,
        v_parts_total,
        IFNULL(p_discount, 0.00),
        v_tax_amount,
        v_total_amount,
        'UNPAID',
        p_user_id
    );

    -- 6. Transition repair_orders status to AWAITING_PAYMENT
    UPDATE repair_orders
    SET status = 'AWAITING_PAYMENT'
    WHERE order_id = p_order_id;

    COMMIT;

END$$

DELIMITER ;

DELIMITER $$

DROP PROCEDURE IF EXISTS sp_process_invoice_payment$$

CREATE PROCEDURE sp_process_invoice_payment(
    IN p_order_id INT,
    IN p_payment_method VARCHAR(20),
    IN p_payment_reference VARCHAR(100),
    IN p_received_by INT
)
sp_lbl: BEGIN
    DECLARE v_current_status VARCHAR(50);
    DECLARE v_invoice_id INT;	
    DECLARE v_invoice_status VARCHAR(20);
    DECLARE v_service_summary TEXT DEFAULT '';
    DECLARE v_current_mileage INT DEFAULT 0;

    -- Exit handler for atomic transaction rollback
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    -- 1. Validate Repair Order Existence & Status
    SELECT status, IFNULL(mileage_at_service, 0)
    INTO v_current_status, v_current_mileage
    FROM repair_orders
    WHERE order_id = p_order_id;

    IF v_current_status IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Repair order not found.';
        LEAVE sp_lbl;
    END IF;

    IF v_current_status != 'AWAITING_PAYMENT' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Cannot process payment: Repair order must be in AWAITING_PAYMENT status.';
        LEAVE sp_lbl;
    END IF;

    -- 2. Validate Invoice Existence & Status
    SELECT invoice_id, status INTO v_invoice_id, v_invoice_status
    FROM invoices
    WHERE order_id = p_order_id
    LIMIT 1;

    IF v_invoice_id IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Invoice not found for this repair order.';
        LEAVE sp_lbl;
    END IF;

    IF v_invoice_status = 'PAID' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Invoice has already been paid.';
        LEAVE sp_lbl;
    END IF;

    START TRANSACTION;

    -- 3. Update Invoice record to PAID
    UPDATE invoices
    SET 
        status = 'PAID',
        payment_method = p_payment_method,
        payment_reference = p_payment_reference,
        payment_date = NOW(),
        received_by = p_received_by
    WHERE invoice_id = v_invoice_id;

    -- 4. Transition Repair Order status to FULFILLED
    UPDATE repair_orders
    SET 
        status = 'READY_FOR_RELEASE',
        date_completed = NOW()
    WHERE order_id = p_order_id;

    -- 5. Build summary from services performed
    SELECT IFNULL(GROUP_CONCAT(sc.service_name SEPARATOR ', '), 'General Repair & Maintenance')
    INTO v_service_summary
    FROM repair_order_services ros
    INNER JOIN service_catalog sc ON ros.service_catalog_id = sc.service_catalog_id
    WHERE ros.order_id = p_order_id;

    -- 6. Insert service record into MAINTENANCE_HISTORY
    INSERT INTO maintenance_history (
        order_id,
        service_date,
        service_summary,
        next_service_due_date,
        next_service_due_mileage
    ) VALUES (
        p_order_id,
        NOW(),
        v_service_summary,
        DATE_ADD(NOW(), INTERVAL 6 MONTH),
        v_current_mileage + 5000
    );

    COMMIT;

END$$

DELIMITER ;
DELIMITER $$

DROP PROCEDURE IF EXISTS sp_cancel_repair_order_part$$

CREATE PROCEDURE sp_cancel_repair_order_part(
    IN p_order_part_id INT
)
BEGIN
    DECLARE v_part_id INT;
    DECLARE v_quantity_used INT;
    DECLARE v_order_id INT;
    DECLARE v_part_status VARCHAR(50);
    DECLARE v_order_status VARCHAR(50);
    DECLARE v_pending_parts_count INT DEFAULT 0;

    -- Rollback on any SQL exception
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    -- 1. Fetch part assignment details and lock row
    SELECT order_id, part_id, quantity_used, status 
    INTO v_order_id, v_part_id, v_quantity_used, v_part_status
    FROM repair_order_parts
    WHERE order_part_id = p_order_part_id
    FOR UPDATE;

    -- Verify item exists
    IF v_part_id IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Repair order part record not found.';
    END IF;

    -- Check if already cancelled
    IF v_part_status = 'CANCELLED' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Part item is already cancelled.';
    END IF;

    -- Verify repair order is not already finalized
    SELECT status INTO v_order_status 
    FROM repair_orders 
    WHERE order_id = v_order_id;

    IF v_order_status IN ('FULFILLED', 'CANCELLED') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cannot cancel parts from a fulfilled or cancelled repair order.';
    END IF;

    -- 2. Restore inventory stock using: quantity_on_hand
    UPDATE parts_inventory
    SET quantity_on_hand = quantity_on_hand + v_quantity_used
    WHERE part_id = v_part_id;

    -- 3. Mark repair order part as CANCELLED
    UPDATE repair_order_parts
    SET status = 'CANCELLED'
    WHERE order_part_id = p_order_part_id;

    -- 4. Check if repair order status should revert to IN_PROGRESS
    IF v_order_status = 'AWAITING_PARTS' THEN
        SELECT COUNT(*) 
        INTO v_pending_parts_count
        FROM repair_order_parts
        WHERE order_id = v_order_id 
          AND status = 'PENDING_PARTS';

        IF v_pending_parts_count = 0 THEN
            UPDATE repair_orders
            SET status = 'IN_PROGRESS'
            WHERE order_id = v_order_id;
        END IF;
    END IF;

    COMMIT;

    SELECT 'Part cancelled, inventory restored, and repair order status updated successfully.' AS message;
END$$

DELIMITER ;

DELIMITER $$
DELIMITER $$

DROP PROCEDURE IF EXISTS sp_GetStaffMembers $$

CREATE PROCEDURE sp_GetStaffMembers(
    IN p_search VARCHAR(255),
    IN p_role_id INT,
    IN p_status VARCHAR(20),
    IN p_sort_by VARCHAR(50),
    IN p_sort_order VARCHAR(4)
)
BEGIN
    -- Sanitize search input
    IF p_search IS NOT NULL THEN
        SET p_search = TRIM(p_search);
        IF p_search = '' THEN SET p_search = NULL; END IF;
    END IF;

    -- Sanitize status filter
    IF p_status IS NOT NULL THEN
        SET p_status = TRIM(p_status);
        IF p_status = '' OR p_status = 'ALL' THEN SET p_status = NULL; END IF;
    END IF;

    -- Sanitize role_id (0 or negative means ALL)
    IF p_role_id IS NOT NULL AND p_role_id <= 0 THEN
        SET p_role_id = NULL;
    END IF;

    -- Sanitize sort parameters
    SET p_sort_by = LOWER(IFNULL(TRIM(p_sort_by), 'user_id'));
    SET p_sort_order = UPPER(IFNULL(TRIM(p_sort_order), 'ASC'));

    IF p_sort_order NOT IN ('ASC', 'DESC') THEN
        SET p_sort_order = 'ASC';
    END IF;

    SELECT 
        CONCAT('STF-', LPAD(u.user_id, 3, '0')) AS formatted_staff_id,
        u.user_id,
        CONCAT(u.first_name, ' ', u.last_name) AS full_name,
        u.email,
        u.contact_no AS phone,
        u.status,
        DATE(u.created_at) AS since,
        r.role_id,
        r.role_name AS role
    FROM users u
    INNER JOIN roles r ON u.role_id = r.role_id
    WHERE 
        -- Search Filter (ID, formatted STF-001 ID, name, email, phone, role)
        (
            p_search IS NULL
            OR CAST(u.user_id AS CHAR) = p_search
            OR CONCAT('STF-', LPAD(u.user_id, 3, '0')) LIKE CONCAT('%', p_search, '%')
            OR CONCAT(u.first_name, ' ', u.last_name) LIKE CONCAT('%', p_search, '%')
            OR u.email LIKE CONCAT('%', p_search, '%')
            OR u.contact_no LIKE CONCAT('%', p_search, '%')
            OR r.role_name LIKE CONCAT('%', p_search, '%')
        )
        -- Specific Role Filter
        AND (p_role_id IS NULL OR u.role_id = p_role_id)
        
        -- Status Filter
        AND (p_status IS NULL OR u.status = p_status)
    ORDER BY 
        -- Sort by Full Name
        CASE WHEN p_sort_by = 'full_name' AND p_sort_order = 'ASC' THEN CONCAT(u.first_name, ' ', u.last_name) END ASC,
        CASE WHEN p_sort_by = 'full_name' AND p_sort_order = 'DESC' THEN CONCAT(u.first_name, ' ', u.last_name) END DESC,

        -- Sort by Role Name
        CASE WHEN p_sort_by = 'role_name' AND p_sort_order = 'ASC' THEN r.role_name END ASC,
        CASE WHEN p_sort_by = 'role_name' AND p_sort_order = 'DESC' THEN r.role_name END DESC,

        -- Sort by Status
        CASE WHEN p_sort_by = 'status' AND p_sort_order = 'ASC' THEN u.status END ASC,
        CASE WHEN p_sort_by = 'status' AND p_sort_order = 'DESC' THEN u.status END DESC,

        -- Sort by Date Joined / Created At
        CASE WHEN (p_sort_by = 'date' OR p_sort_by = 'since') AND p_sort_order = 'ASC' THEN u.created_at END ASC,
        CASE WHEN (p_sort_by = 'date' OR p_sort_by = 'since') AND p_sort_order = 'DESC' THEN u.created_at END DESC,

        -- Default Fallback
        u.user_id ASC;
END $$

DELIMITER ;

DELIMITER //

CREATE PROCEDURE sp_get_invoice_details(
    IN p_order_id INT
)
BEGIN
    -- -----------------------------------------------------------	------
    -- 1. MAIN INVOICE & ORDER SUMMARY RESULT SET
    -- Handles READY_TO_INVOICE, AWAITING_PAYMENT, and FULFILLED
    -- -----------------------------------------------------------------
    SELECT 
        ro.order_id,
        CONCAT('RO-', ro.order_id) AS order_number,
        ro.status AS order_status,
        
        -- Customer Details
        CONCAT(c.first_name, ' ', c.last_name) AS customer_name,
        
        -- Vehicle Details
        CONCAT(v.manufacturer, ' ', v.model, ' ', IFNULL(v.year_model, '')) AS vehicle_info,
        
        -- Invoice Breakdown (Uses existing invoice record IF created; otherwise calculates dynamically)
        IFNULL(inv.labor_total, (
            SELECT IFNULL(SUM(sc.standard_labor_cost), 0.00)
            FROM repair_order_services ros
            JOIN service_catalog sc ON ros.service_catalog_id = sc.service_catalog_id
            WHERE ros.order_id = ro.order_id
        )) AS labor_charges,
        
        IFNULL(inv.parts_total, (
            SELECT IFNULL(SUM(rop.quantity_used * rop.unit_price), 0.00)
            FROM repair_order_parts rop
            WHERE rop.order_id = ro.order_id AND rop.status = 'ISSUED'
        )) AS parts_charges,
        
        IFNULL(inv.discount, 0.00) AS discount,
        IFNULL(inv.tax_amount, 0.00) AS tax_amount,
        
        IFNULL(inv.total_amount, (
            (
                SELECT IFNULL(SUM(sc.standard_labor_cost), 0.00)
                FROM repair_order_services ros
                JOIN service_catalog sc ON ros.service_catalog_id = sc.service_catalog_id
                WHERE ros.order_id = ro.order_id
            ) + (
                SELECT IFNULL(SUM(rop.quantity_used * rop.unit_price), 0.00)
                FROM repair_order_parts rop
                WHERE rop.order_id = ro.order_id AND rop.status = 'ISSUED'
            )
        )) AS total_due,
        
        -- Invoice Status Flags
        inv.status AS invoice_status,
        inv.payment_method,
        inv.payment_reference,
        inv.payment_date

    FROM repair_orders ro
    JOIN vehicles v ON ro.vehicle_id = v.vehicle_id
    JOIN customers c ON v.customer_id = c.customer_id
    LEFT JOIN invoices inv ON ro.order_id = inv.order_id
    WHERE ro.order_id = p_order_id
      AND ro.status IN ('READY_TO_INVOICE', 'AWAITING_PAYMENT', 'FULFILLED',"READY_FOR_RELEASE");


    -- -----------------------------------------------------------------
    -- 2. MECHANICS ON JOB RESULT SET
    -- -----------------------------------------------------------------
    SELECT 
        rom.assignment_id,
        CONCAT(u.first_name, ' ', u.last_name) AS mechanic_name,
        mp.position_name AS position
    FROM repair_order_mechanics rom
    JOIN mechanics m ON rom.mechanic_id = m.mechanic_id
    JOIN users u ON m.user_id = u.user_id
    JOIN mechanic_positions mp ON rom.position_id = mp.position_id
    WHERE rom.order_id = p_order_id;

END //

DELIMITER ;

DELIMITER $$

DROP PROCEDURE IF EXISTS sp_get_mechanic_work_orders$$

CREATE PROCEDURE sp_get_mechanic_work_orders(
    IN p_mechanic_id INT
)
BEGIN
    SELECT 
        ro.order_id,
        CONCAT('RO-', ro.order_id) AS formatted_ro_number,
        ro.status AS order_status,
        ro.priority,
        ro.complaint,
        ro.mileage_at_service,
        ro.diagnosis_notes,
        ro.date_received,
        
        -- Customer Information
        CONCAT(c.first_name, ' ', c.last_name) AS customer_name,
        
        -- Vehicle Information
        v.manufacturer,
        v.model,
        v.year_model,
        v.plate_number,
        v.vin_number,
        CONCAT(v.manufacturer, ' ', v.model, 
            IF(v.year_model IS NOT NULL, CONCAT(' ', v.year_model), ''), 
            ' · ', v.plate_number) AS vehicle_summary,
        
        -- Mechanic Assignment Position on this Order
        mp.position_name AS assigned_position,
        
        -- Aggregated Metrics (Parts & Total Assigned Mechanics)
        (
            SELECT COUNT(DISTINCT rop.part_id)
            FROM repair_order_parts rop
            WHERE rop.order_id = ro.order_id 
              AND rop.status != 'CANCELLED'
        ) AS parts_logged_count,
        
        (
            SELECT COUNT(DISTINCT rom2.mechanic_id)
            FROM repair_order_mechanics rom2
            WHERE rom2.order_id = ro.order_id
        ) AS total_mechanics_count

    FROM repair_order_mechanics rom
    INNER JOIN repair_orders ro 
        ON rom.order_id = ro.order_id
    INNER JOIN vehicles v 
        ON ro.vehicle_id = v.vehicle_id
    INNER JOIN customers c 
        ON v.customer_id = c.customer_id
    INNER JOIN mechanic_positions mp 
        ON rom.position_id = mp.position_id
    WHERE rom.mechanic_id = p_mechanic_id
    ORDER BY ro.date_received DESC;

END$$

DELIMITER ;

DELIMITER $$

CREATE PROCEDURE sp_fulfill_repair_order(
    IN p_order_id INT
)
BEGIN
    DECLARE current_status VARCHAR(50);

    -- Check if the repair order exists and retrieve its current status
    SELECT status INTO current_status
    FROM repair_orders
    WHERE order_id = p_order_id;

    IF current_status IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Repair order not found.';
    ELSEIF current_status != 'READY_FOR_RELEASE' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Order cannot be fulfilled. It must be in READY_FOR_RELEASE status.';
    ELSE
        -- Update the status to FULFILLED and set date_completed
        UPDATE repair_orders
        SET status = 'FULFILLED',
            date_completed = NOW()
        WHERE order_id = p_order_id;

        SELECT 
            order_id, 
            status, 
            date_completed, 
            'Order successfully fulfilled and released.' AS message
        FROM repair_orders
        WHERE order_id = p_order_id;
    END IF;
END $$

DELIMITER ;

DELIMITER //

CREATE PROCEDURE sp_GetCustomerDetailsWithHistory(
    IN p_customer_id INT
)
BEGIN
    -- Result Set 1: Customer Info & Aggregated Summary
    SELECT 
        c.customer_id,
        CONCAT(c.first_name, ' ', IFNULL(CONCAT(c.middle_name, ' '), ''), c.last_name) AS full_name,
        c.contact_no,
        c.email,
        c.address,
        COUNT(DISTINCT v.vehicle_id) AS total_vehicles,
        MAX(ro.date_received) AS last_visit
    FROM customers c
    LEFT JOIN vehicles v ON c.customer_id = v.customer_id
    LEFT JOIN repair_orders ro ON v.vehicle_id = ro.vehicle_id
    WHERE c.customer_id = p_customer_id
    GROUP BY c.customer_id;

    -- Result Set 2: Registered Vehicles
    SELECT 
        v.vehicle_id,
        v.plate_number,
        v.vehicle_type,
        v.manufacturer,
        v.model,
        v.year_model,
        v.color,
        v.current_mileage,
        v.vin_number
    FROM vehicles v
    WHERE v.customer_id = p_customer_id
    ORDER BY v.date_registered DESC;

    -- Result Set 3: Repair Order History
    SELECT 
        ro.order_id,
        v.vehicle_id,
        CONCAT(v.manufacturer, ' ', v.model, ' (', v.plate_number, ')') AS vehicle_info,
        ro.date_received,
        ro.date_completed,
        ro.mileage_at_service,
        ro.complaint,
        ro.status,
        ro.priority,
        i.total_amount AS invoice_total,
        i.status AS payment_status
    FROM repair_orders ro
    JOIN vehicles v ON ro.vehicle_id = v.vehicle_id
    LEFT JOIN invoices i ON ro.order_id = i.order_id
    WHERE v.customer_id = p_customer_id
    ORDER BY ro.date_received DESC;
END //

DELIMITER ;
DELIMITER //

DROP PROCEDURE IF EXISTS sp_get_dashboard_summary_cards //

CREATE PROCEDURE sp_get_dashboard_summary_cards()
BEGIN
    SELECT 
        -- Card 1: Total Revenue & Fulfilled Orders
        IFNULL((SELECT SUM(total_amount) FROM invoices WHERE status = 'PAID'), 0.00) AS total_revenue,
        (SELECT COUNT(*) FROM repair_orders WHERE status = 'FULFILLED') AS fulfilled_orders_count,

        -- Card 2: Active Orders (pipeline)
        (SELECT COUNT(*) FROM repair_orders 
         WHERE status IN ('PENDING_DIAGNOSIS', 'AWAITING_DIAGNOSIS', 'PENDING_MECHANICS', 'IN_PROGRESS', 'AWAITING_PARTS', 'READY_TO_INVOICE', 'AWAITING_PAYMENT', 'READY_FOR_RELEASE')
        ) AS active_orders_count,

        -- Card 3: Active Staff & Total Staff
        (SELECT COUNT(*) FROM users WHERE status = 'ACTIVE') AS active_staff_count,
        (SELECT COUNT(*) FROM users) AS total_staff_count,

        -- Card 4: Low Stock Alerts (quantity_on_hand < 6, i.e., <= 5)
        (SELECT COUNT(*) FROM parts_inventory 
         WHERE quantity_on_hand < 6 
           AND status = 'ACTIVE'
        ) AS low_stock_alerts_count,

        -- Card 5: Average Order Value (per completed/fulfilled repair)
        IFNULL(
            (SELECT AVG(total_amount) 
             FROM invoices 
             WHERE status = 'PAID'), 0.00
        ) AS avg_order_value,

        -- Card 6: Inventory Value & Total SKUs on Hand
        IFNULL(
            (SELECT SUM(unit_price * quantity_on_hand) 
             FROM parts_inventory 
             WHERE status = 'ACTIVE'), 0.00
        ) AS total_inventory_value,
        
        (SELECT COUNT(*) 
         FROM parts_inventory 
         WHERE status = 'ACTIVE' AND quantity_on_hand > 0
        ) AS total_part_skus,

        -- Extra: Full Stock Breakdown for Inventory Widgets
        (SELECT COUNT(*) FROM parts_inventory WHERE quantity_on_hand BETWEEN 6 AND 20 AND status = 'ACTIVE') AS moderate_stock_count,
        (SELECT COUNT(*) FROM parts_inventory WHERE quantity_on_hand >= 21 AND status = 'ACTIVE') AS in_stock_count;
END //

DELIMITER ;

DELIMITER //

DROP PROCEDURE IF EXISTS sp_get_pipeline_status_counts //

CREATE PROCEDURE sp_get_pipeline_status_counts()
BEGIN
    SELECT 
        SUM(CASE WHEN status = 'PENDING_DIAGNOSIS' THEN 1 ELSE 0 END) AS pending_diagnosis,
        SUM(CASE WHEN status = 'AWAITING_DIAGNOSIS' THEN 1 ELSE 0 END) AS awaiting_diagnosis,
        SUM(CASE WHEN status = 'PENDING_MECHANICS' THEN 1 ELSE 0 END) AS pending_mechanics,
        SUM(CASE WHEN status = 'IN_PROGRESS' THEN 1 ELSE 0 END) AS in_progress,
        SUM(CASE WHEN status = 'AWAITING_PARTS' THEN 1 ELSE 0 END) AS awaiting_parts,
        SUM(CASE WHEN status = 'READY_TO_INVOICE' THEN 1 ELSE 0 END) AS ready_to_invoice,
        SUM(CASE WHEN status = 'AWAITING_PAYMENT' THEN 1 ELSE 0 END) AS awaiting_payment,
        SUM(CASE WHEN status = 'READY_FOR_RELEASE' THEN 1 ELSE 0 END) AS ready_for_release
    FROM repair_orders;
END //

DELIMITER ;

DELIMITER //

DROP PROCEDURE IF EXISTS sp_get_recent_repair_orders //

CREATE PROCEDURE sp_get_recent_repair_orders(
    IN p_limit INT
)
BEGIN
    -- Set default limit if NULL or invalid
    IF p_limit IS NULL OR p_limit <= 0 THEN
        SET p_limit = 5;
    END IF;

    SELECT 
        CONCAT('RO-', ro.order_id) AS formatted_order_id,
        ro.order_id AS raw_order_id,
        CONCAT(c.first_name, ' ', c.last_name) AS customer_name,
        ro.status,
        ro.date_received,
        IFNULL(
            i.total_amount,
            (IFNULL(sc_sum.labor_cost, 0) + IFNULL(parts_sum.parts_cost, 0))
        ) AS estimated_or_actual_total
    FROM repair_orders ro
    JOIN vehicles v ON ro.vehicle_id = v.vehicle_id
    JOIN customers c ON v.customer_id = c.customer_id
    LEFT JOIN invoices i ON ro.order_id = i.order_id
    
    -- Labor cost subquery
    LEFT JOIN (
        SELECT ros.order_id, SUM(sc.standard_labor_cost) AS labor_cost
        FROM repair_order_services ros
        JOIN service_catalog sc ON ros.service_catalog_id = sc.service_catalog_id
        GROUP BY ros.order_id
    ) sc_sum ON ro.order_id = sc_sum.order_id

    -- Active parts cost subquery (excluding cancelled parts)
    LEFT JOIN (
        SELECT order_id, SUM(unit_price * quantity_used) AS parts_cost
        FROM repair_order_parts
        WHERE status != 'CANCELLED' OR status IS NULL
        GROUP BY order_id
    ) parts_sum ON ro.order_id = parts_sum.order_id

    WHERE ro.status != 'CANCELLED'
    ORDER BY ro.date_received DESC
    LIMIT p_limit;
END //

DELIMITER ;
	DELIMITER //

	DROP PROCEDURE IF EXISTS sp_get_parts_inventory_admin //

	CREATE PROCEDURE sp_get_parts_inventory_admin(
		IN p_search VARCHAR(255),
		IN p_stock_level VARCHAR(20),
		IN p_sort_by VARCHAR(50),
		IN p_sort_order VARCHAR(4)
	)
	BEGIN
		-- Sanitize search input
		IF p_search IS NOT NULL THEN
			SET p_search = TRIM(p_search);
			IF p_search = '' THEN SET p_search = NULL; END IF;
		END IF;

		-- Sanitize stock level filter
		IF p_stock_level IS NOT NULL THEN
			SET p_stock_level = TRIM(p_stock_level);
			IF p_stock_level = '' OR p_stock_level = 'ALL' THEN SET p_stock_level = NULL; END IF;
		END IF;

		-- Sanitize sort parameters
		SET p_sort_by = LOWER(IFNULL(TRIM(p_sort_by), 'part_id'));
		SET p_sort_order = UPPER(IFNULL(TRIM(p_sort_order), 'ASC'));

		IF p_sort_order NOT IN ('ASC', 'DESC') THEN
			SET p_sort_order = 'ASC';
		END IF;

		SELECT 
			CONCAT('P-', LPAD(part_id, 3, '0')) AS formatted_part_id,
			part_id,
			part_code,
			part_name,
			category,
			unit,
			unit_price,
			quantity_on_hand,
			reorder_level,
			batch_number,
			CASE 
				WHEN quantity_on_hand <= 5 THEN 'Low Stock'
				WHEN quantity_on_hand BETWEEN 6 AND 20 THEN 'Moderate'
				ELSE 'In Stock'
			END AS stock_level,
			status,
			date_added
		FROM parts_inventory
		WHERE status = 'ACTIVE'
		  -- Search Filter (Matches raw part_id, formatted P-001 ID, part_code, part_name, and category)
		  AND (
				p_search IS NULL
				OR CAST(part_id AS CHAR) = p_search
				OR CONCAT('P-', LPAD(part_id, 3, '0')) LIKE CONCAT('%', p_search, '%')
				OR part_code LIKE CONCAT('%', p_search, '%')
				OR part_name LIKE CONCAT('%', p_search, '%')
				OR category LIKE CONCAT('%', p_search, '%')
		  )
		  -- Stock Level Filter
		  AND (
				p_stock_level IS NULL
				OR (p_stock_level = 'LOW_STOCK' AND quantity_on_hand <= 5)
				OR (p_stock_level = 'MODERATE' AND quantity_on_hand BETWEEN 6 AND 20)
				OR (p_stock_level = 'IN_STOCK' AND quantity_on_hand >= 21)
		  )
		ORDER BY 
			-- Sorting by Part Name
			CASE WHEN p_sort_by = 'name' AND p_sort_order = 'ASC' THEN part_name END ASC,
			CASE WHEN p_sort_by = 'name' AND p_sort_order = 'DESC' THEN part_name END DESC,

			-- Sorting by Quantity On Hand
			CASE WHEN p_sort_by = 'qty' AND p_sort_order = 'ASC' THEN quantity_on_hand END ASC,
			CASE WHEN p_sort_by = 'qty' AND p_sort_order = 'DESC' THEN quantity_on_hand END DESC,

			-- Sorting by Unit Cost
			CASE WHEN p_sort_by = 'cost' AND p_sort_order = 'ASC' THEN unit_price END ASC,
			CASE WHEN p_sort_by = 'cost' AND p_sort_order = 'DESC' THEN unit_price END DESC,

			-- Sorting by Stock Level Rank (Low Stock -> Moderate -> In Stock)
			CASE WHEN p_sort_by = 'stock_level' AND p_sort_order = 'ASC' THEN 
				CASE 
					WHEN quantity_on_hand <= 5 THEN 1
					WHEN quantity_on_hand BETWEEN 6 AND 20 THEN 2
					ELSE 3
				END
			END ASC,
			CASE WHEN p_sort_by = 'stock_level' AND p_sort_order = 'DESC' THEN 
				CASE 
					WHEN quantity_on_hand <= 5 THEN 1
					WHEN quantity_on_hand BETWEEN 6 AND 20 THEN 2
					ELSE 3
				END
			END DESC,

			-- Default Fallback
			part_id ASC;
	END //

	DELIMITER ;
    
DELIMITER //

DROP PROCEDURE IF EXISTS sp_get_revenue_by_order //

CREATE PROCEDURE sp_get_revenue_by_order(
    IN p_limit INT,
    IN p_status VARCHAR(50)
)
BEGIN
    DECLARE v_max_amount DECIMAL(10,2);

    -- Enforce limit boundaries (Default 10, Maximum 100)
    IF p_limit IS NULL OR p_limit <= 0 THEN
        SET p_limit = 10;
    ELSEIF p_limit > 100 THEN
        SET p_limit = 100;
    END IF;

    -- Sanitize status filter
    IF p_status IS NOT NULL THEN
        SET p_status = TRIM(p_status);
        IF p_status = '' OR p_status = 'ALL' THEN 
            SET p_status = NULL; 
        END IF;
    END IF;

    -- Step 1: Find the maximum total amount across matching orders for relative progress bar calculation
    SELECT MAX(calculated_total) INTO v_max_amount
    FROM (
        SELECT 
            ro.order_id,
            COALESCE(
                inv.total_amount,
                (
                    IFNULL((SELECT SUM(sc.standard_labor_cost) 
                            FROM repair_order_services ros 
                            JOIN service_catalog sc ON ros.service_catalog_id = sc.service_catalog_id 
                            WHERE ros.order_id = ro.order_id), 0)
                    +
                    IFNULL((SELECT SUM(rop.quantity_used * rop.unit_price) 
                            FROM repair_order_parts rop 
                            WHERE rop.order_id = ro.order_id AND rop.status = 'ISSUED'), 0)
                )
            ) AS calculated_total
        FROM repair_orders ro
        LEFT JOIN invoices inv ON ro.order_id = inv.order_id
        WHERE (p_status IS NULL OR ro.status = p_status)
    ) AS sub;

    -- Fallback to avoid division by zero
    IF v_max_amount IS NULL OR v_max_amount = 0 THEN
        SET v_max_amount = 1.00;
    END IF;

    -- Step 2: Fetch repair orders with real-time calculated total revenue
    SELECT 
        CONCAT('RO-', LPAD(ro.order_id, 4, '0')) AS formatted_order_id,
        ro.order_id,
        CONCAT(c.first_name, ' ', c.last_name) AS customer_name,
        COALESCE(
            inv.total_amount,
            (
                IFNULL((SELECT SUM(sc.standard_labor_cost) 
                        FROM repair_order_services ros 
                        JOIN service_catalog sc ON ros.service_catalog_id = sc.service_catalog_id 
                        WHERE ros.order_id = ro.order_id), 0)
                +
                IFNULL((SELECT SUM(rop.quantity_used * rop.unit_price) 
                        FROM repair_order_parts rop 
                        WHERE rop.order_id = ro.order_id AND rop.status = 'ISSUED'), 0)
            )
        ) AS billed_amount,
        ro.status,
        -- Calculate relative weight for progress bar display (0.00% to 100.00%)
        LEAST(100.00, ROUND((
            COALESCE(
                inv.total_amount,
                (
                    IFNULL((SELECT SUM(sc.standard_labor_cost) 
                            FROM repair_order_services ros 
                            JOIN service_catalog sc ON ros.service_catalog_id = sc.service_catalog_id 
                            WHERE ros.order_id = ro.order_id), 0)
                    +
                    IFNULL((SELECT SUM(rop.quantity_used * rop.unit_price) 
                            FROM repair_order_parts rop 
                            WHERE rop.order_id = ro.order_id AND rop.status = 'ISSUED'), 0)
                )
            ) / v_max_amount
        ) * 100, 2)) AS bar_percentage
    FROM repair_orders ro
    JOIN vehicles v ON ro.vehicle_id = v.vehicle_id
    JOIN customers c ON v.customer_id = c.customer_id
    LEFT JOIN invoices inv ON ro.order_id = inv.order_id
    WHERE (p_status IS NULL OR ro.status = p_status)
    ORDER BY billed_amount DESC, ro.date_received DESC
    LIMIT p_limit;

END //

DELIMITER ;

DELIMITER //

DROP PROCEDURE IF EXISTS sp_get_revenue_split //

CREATE PROCEDURE sp_get_revenue_split()
BEGIN
    DECLARE v_labor_total DECIMAL(10,2) DEFAULT 0.00;
    DECLARE v_parts_total DECIMAL(10,2) DEFAULT 0.00;
    DECLARE v_grand_total DECIMAL(10,2) DEFAULT 0.00;
    DECLARE v_labor_pct DECIMAL(5,2) DEFAULT 0.00;
    DECLARE v_parts_pct DECIMAL(5,2) DEFAULT 0.00;

    -- Calculate Labor/Services Total from non-cancelled repair orders
    SELECT IFNULL(SUM(sc.standard_labor_cost), 0.00) INTO v_labor_total
    FROM repair_order_services ros
    JOIN service_catalog sc ON ros.service_catalog_id = sc.service_catalog_id
    JOIN repair_orders ro ON ros.order_id = ro.order_id
    WHERE ro.status != 'CANCELLED';

    -- Calculate Parts Total from issued parts in non-cancelled repair orders
    SELECT IFNULL(SUM(rop.quantity_used * rop.unit_price), 0.00) INTO v_parts_total
    FROM repair_order_parts rop
    JOIN repair_orders ro ON rop.order_id = ro.order_id
    WHERE ro.status != 'CANCELLED' AND rop.status = 'ISSUED';

    -- Compute Grand Total
    SET v_grand_total = v_labor_total + v_parts_total;

    -- Compute percentages (handling division by zero fallback)
    IF v_grand_total > 0 THEN
        SET v_labor_pct = ROUND((v_labor_total / v_grand_total) * 100, 2);
        SET v_parts_pct = ROUND((v_parts_total / v_grand_total) * 100, 2);
    END IF;

    -- Return single object result set
    SELECT 
        v_labor_total AS labor_total,
        v_labor_pct AS labor_percentage,
        v_parts_total AS parts_total,
        v_parts_pct AS parts_percentage,
        v_grand_total AS total_revenue;

END //

DELIMITER ;
DELIMITER //

DROP PROCEDURE IF EXISTS sp_get_pipeline_status_counts_overall //

CREATE PROCEDURE sp_get_pipeline_status_counts_overall()
BEGIN
    SELECT 
        s.status_code,
        s.display_label,
        s.short_label,
        s.display_order,
        IFNULL(COUNT(ro.order_id), 0) AS count,
        CASE 
            WHEN (SELECT COUNT(*) FROM repair_orders) > 0 
            THEN ROUND((IFNULL(COUNT(ro.order_id), 0) / (SELECT COUNT(*) FROM repair_orders)) * 100, 2)
            ELSE 0.00
        END AS share_percentage
    FROM (
        SELECT 'PENDING_DIAGNOSIS'  AS status_code, 'Pending Diagnosis'  AS display_label, 'Pending Dx'   AS short_label, 1 AS display_order UNION ALL
        SELECT 'AWAITING_DIAGNOSIS' AS status_code, 'Awaiting Diagnosis' AS display_label, 'Awaiting Dx'  AS short_label, 2 AS display_order UNION ALL
        SELECT 'PENDING_MECHANICS'  AS status_code, 'Pending Mechanics'  AS display_label, 'Pending Mech' AS short_label, 3 AS display_order UNION ALL
        SELECT 'IN_PROGRESS'        AS status_code, 'In Progress'        AS display_label, 'In Progress'  AS short_label, 4 AS display_order UNION ALL
        SELECT 'AWAITING_PARTS'     AS status_code, 'Awaiting Parts'     AS display_label, 'Parts'        AS short_label, 5 AS display_order UNION ALL
        SELECT 'READY_TO_INVOICE'   AS status_code, 'Ready to Invoice'   AS display_label, 'To Invoice'   AS short_label, 6 AS display_order UNION ALL
        SELECT 'AWAITING_PAYMENT'   AS status_code, 'Awaiting Payment'   AS display_label, 'Payment'      AS short_label, 7 AS display_order UNION ALL
        SELECT 'READY_FOR_RELEASE'  AS status_code, 'Ready for Release'  AS display_label, 'Release'      AS short_label, 8 AS display_order UNION ALL
        SELECT 'FULFILLED'          AS status_code, 'Fulfilled'          AS display_label, 'Fulfilled'    AS short_label, 9 AS display_order UNION ALL
        SELECT 'CANCELLED'          AS status_code, 'Cancelled'          AS display_label, 'Cancelled'    AS short_label, 10 AS display_order
    ) s
    LEFT JOIN repair_orders ro ON ro.status = s.status_code
    GROUP BY s.status_code, s.display_label, s.short_label, s.display_order
    ORDER BY s.display_order ASC;
END //

DELIMITER ;

DELIMITER //
	
DROP PROCEDURE IF EXISTS sp_get_parts_inventory_cards //

CREATE PROCEDURE sp_get_parts_inventory_cards()
BEGIN
    SELECT 
        COUNT(*) AS total_skus,
        IFNULL(SUM(quantity_on_hand * unit_price), 0.00) AS inventory_value,
        COUNT(CASE WHEN quantity_on_hand BETWEEN 0 AND 5 THEN 1 END) AS low_stock_count
    FROM parts_inventory;
END //

DELIMITER ;



DROP PROCEDURE IF EXISTS sp_top_parts_used;

DELIMITER $$

CREATE PROCEDURE sp_top_parts_used(IN p_limit INT)
BEGIN
    DECLARE v_limit INT;

    -- NULL or invalid -> 100, anything above 100 gets capped at 100
    SET v_limit = IF(p_limit IS NULL OR p_limit < 1, 100, LEAST(p_limit, 100));

    SELECT
        p.part_id,
        p.part_name,
        SUM(rop.quantity_used) AS total_used
    FROM repair_order_parts rop
    JOIN parts_inventory p  ON p.part_id  = rop.part_id
    JOIN repair_orders   ro ON ro.order_id = rop.order_id
    WHERE rop.status = 'ISSUED'
      AND ro.status <> 'CANCELLED'
    GROUP BY p.part_id, p.part_name
    ORDER BY total_used DESC, p.part_name ASC
    LIMIT v_limit;
END$$

DELIMITER ;



DROP PROCEDURE IF EXISTS sp_mechanic_order_load;

DELIMITER $$

CREATE PROCEDURE sp_mechanic_order_load()
BEGIN
    SELECT
        m.mechanic_id,
        u.first_name,
        CONCAT(u.first_name, ' ', u.last_name) AS full_name,
        COALESCE(
            (SELECT mp.position_name
             FROM repair_order_mechanics rom2
             JOIN mechanic_positions mp ON mp.position_id = rom2.position_id
             WHERE rom2.mechanic_id = m.mechanic_id
             ORDER BY rom2.date_assigned DESC, rom2.assignment_id DESC
             LIMIT 1),
            m.specialization
        ) AS position_name,
        COUNT(DISTINCT CASE
            WHEN ro.status IN ('PENDING_DIAGNOSIS','AWAITING_DIAGNOSIS','PENDING_MECHANICS',
                               'IN_PROGRESS','AWAITING_PARTS')
            THEN ro.order_id END) AS active_orders,
        COUNT(DISTINCT CASE
            WHEN ro.status IN ('READY_TO_INVOICE','AWAITING_PAYMENT',
                               'READY_FOR_RELEASE','FULFILLED')
            THEN ro.order_id END) AS completed_orders
    FROM mechanics m
    JOIN users u ON u.user_id = m.user_id
    LEFT JOIN repair_order_mechanics rom ON rom.mechanic_id = m.mechanic_id
    LEFT JOIN repair_orders ro ON ro.order_id = rom.order_id
                              AND ro.status <> 'CANCELLED'
    WHERE m.status <> 'INACTIVE'
    GROUP BY m.mechanic_id, u.first_name, u.last_name, m.specialization
    ORDER BY active_orders DESC, u.first_name ASC;
END$$

DELIMITER ;


DROP PROCEDURE IF EXISTS sp_mechanic_order_cards;

DELIMITER $$

CREATE PROCEDURE sp_mechanic_order_cards(IN p_limit INT)
BEGIN
    DECLARE v_limit INT;

    -- NULL or invalid -> 10, anything above 100 gets capped at 100
    SET v_limit = IF(p_limit IS NULL OR p_limit < 1, 10, LEAST(p_limit, 100));

    WITH mech_orders AS (
        SELECT DISTINCT rom.mechanic_id, ro.order_id, ro.vehicle_id, ro.status, ro.date_received
        FROM repair_order_mechanics rom
        JOIN repair_orders ro ON ro.order_id = rom.order_id
        WHERE ro.status <> 'CANCELLED'
    ),
    ranked AS (
        SELECT
            mo.*,
            ROW_NUMBER() OVER (PARTITION BY mo.mechanic_id
                               ORDER BY mo.date_received DESC, mo.order_id DESC) AS rn,
            COUNT(*) OVER (PARTITION BY mo.mechanic_id) AS total_orders,
            SUM(mo.status = 'FULFILLED') OVER (PARTITION BY mo.mechanic_id) AS completed_orders
        FROM mech_orders mo
    )
    SELECT
        m.mechanic_id,
        CONCAT(u.first_name, ' ', u.last_name) AS full_name,
        COALESCE(
            (SELECT mp.position_name
             FROM repair_order_mechanics rom2
             JOIN mechanic_positions mp ON mp.position_id = rom2.position_id
             WHERE rom2.mechanic_id = m.mechanic_id
             ORDER BY rom2.date_assigned DESC, rom2.assignment_id DESC
             LIMIT 1),
            m.specialization
        ) AS position_name,
        COALESCE(r.total_orders, 0)     AS total_orders,
        COALESCE(r.completed_orders, 0) AS completed_orders,
        ROUND(COALESCE(r.completed_orders, 0) / NULLIF(r.total_orders, 0) * 100) AS completion_rate,
        r.order_id,
        CONCAT('RO-', r.order_id)       AS order_code,
        CONCAT(c.first_name, ' ', c.last_name) AS customer_name,
        r.status                        AS order_status
    FROM mechanics m
    JOIN users u ON u.user_id = m.user_id
    LEFT JOIN ranked r    ON r.mechanic_id = m.mechanic_id AND r.rn <= v_limit
    LEFT JOIN vehicles v  ON v.vehicle_id  = r.vehicle_id
    LEFT JOIN customers c ON c.customer_id = v.customer_id
    WHERE m.status <> 'INACTIVE'
    ORDER BY u.first_name ASC, m.mechanic_id ASC, r.rn ASC;
END$$

DELIMITER ;



