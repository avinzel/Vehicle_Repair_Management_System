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
		contact_no      VARCHAR(20) unique,
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
        status          ENUM('ACTIVE','INACTIVE') DEFAULT 'ACTIVE',
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
USE VehicleRepair;

-- =====================================================================
-- ROLES  (1=Admin, 2=Service Advisor, 3=Mechanic)
-- =====================================================================
INSERT INTO roles (role_id, role_name, description) VALUES
(1, 'Admin', 'System administrator'),
(2, 'Service Advisor', 'Handles intake, invoicing and payments'),
(3, 'Mechanic', 'Diagnoses and repairs vehicles');

-- =====================================================================
-- MECHANIC POSITIONS
-- =====================================================================
INSERT INTO mechanic_positions (position_id, position_name, description) VALUES
(1, 'Diagnostician', 'Diagnoses the vehicle problem'),
(2, 'Lead Mechanic', 'Leads the repair work'),
(3, 'Electrical Specialist', 'Handles electrical repairs');

-- =====================================================================
-- SERVICE CATALOG (1-20)
-- =====================================================================
INSERT INTO service_catalog (service_catalog_id, service_name, description, standard_labor_cost) VALUES
(1, 'Starter Motor Overhaul', 'Disassemble, clean and rebuild starter motor', 1500.00),
(2, 'Routine Maintenance Service', 'Oil change, filters, chain/belt adjustment, general inspection', 1000.00),
(3, 'Oil Change', 'Drain and refill engine oil', 500.00),
(4, 'Brake Pad Replacement', 'Replace worn brake pads', 800.00),
(5, 'Battery Replacement', 'Remove and install new battery', 300.00),
(6, 'Spark Plug Replacement', 'Replace spark plugs', 400.00),
(7, 'Air Filter Replacement', 'Replace air filter', 250.00),
(8, 'Coolant Flush', 'Flush and refill cooling system', 600.00),
(9, 'Timing Belt Replacement', 'Replace timing belt', 2500.00),
(10, 'Wiper Blade Replacement', 'Replace wiper blades', 150.00),
(11, 'Chain and Sprocket Adjustment', 'Adjust and lube drive chain', 350.00),
(12, 'Tire Replacement', 'Remove and mount new tires', 400.00),
(13, 'Wheel Alignment', 'Align wheels to spec', 700.00),
(14, 'Engine Diagnostics', 'Full engine diagnostic scan', 800.00),
(15, 'Electrical Wiring Repair', 'Trace and repair electrical faults', 1200.00),
(16, 'Suspension Overhaul', 'Replace worn suspension components', 2200.00),
(17, 'Clutch Replacement', 'Replace clutch assembly', 2800.00),
(18, 'Transmission Service', 'Transmission fluid and inspection', 1800.00),
(19, 'CVT Cleaning and Belt Service', 'Clean CVT and replace belt', 900.00),
(20, 'AC Repair', 'Diagnose and repair air conditioning', 1500.00);

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

INSERT INTO mechanics (mechanic_id, user_id, specialization, date_hired, status) VALUES
(1, 1, 'Engine Diagnostics', '2025-02-01', 'ACTIVE'), -- mkay
(2, 4, 'General Repair',     '2025-04-15', 'ACTIVE'), -- lean
(3, 5, 'Electrical Systems', '2025-06-10', 'ACTIVE'), -- kruu
(4, 8, 'General Repair',     '2025-01-15', 'ACTIVE'); -- joleks

INSERT INTO customers (customer_id, first_name, middle_name, last_name, contact_no, email, address, created_at) VALUES
(1, 'Liam',  NULL, 'Johnson',  '0917-123-4567', 'liam.j@email.com',  'Blk 4 Lot 12, Cabuyao, Laguna',   '2026-08-27 09:00:00'),
(2, 'Olivia',NULL, 'Smith',    '0918-234-5678', 'olivia.s@email.com','Purok 3, Sta. Rosa, Laguna',      '2026-08-26 10:15:00'),
(3, 'Noah',  NULL, 'Williams', '0919-345-6789', 'noah.w@email.com',  'Brgy. Banay-banay, Cabuyao',      '2026-08-25 11:30:00'),
(4, 'Emma',  NULL, 'Brown',    '0920-456-7890', 'emma.b@email.com',  'Km 21, National Hwy, Cabuyao',    '2026-08-24 13:45:00'),
(5, 'James', NULL, 'Davis',    '0921-567-8901', 'james.d@email.com', 'Brgy. Mamatid, Cabuyao, Laguna',  '2026-08-23 08:20:00');

INSERT INTO vehicles (vehicle_id, customer_id, plate_number, vehicle_type, manufacturer, model, year_model, color, vin_number, current_mileage, date_registered) VALUES
(1, 1, 'ABC-1234', 'CAR',        'Toyota',   'Vios',        2021, 'Silver', 'VIN-ABC1234XX', 32000, '2026-08-27 09:05:00'),
(2, 2, 'XYZ-5678', 'MOTORCYCLE', 'Honda',    'Click 125i',  2022, 'Red',    'VIN-XYZ5678XX', 8500,  '2026-08-26 10:20:00'),
(3, 3, 'DEF-9012', 'MOTORCYCLE', 'Yamaha',   'Mio i125',    2020, 'Blue',   'VIN-DEF9012XX', 12100, '2026-08-25 11:35:00'),
(4, 4, 'GHI-3456', 'CAR',        'Toyota',   'Vios',        2019, 'White',  'VIN-GHI3456XX', 51200, '2026-08-24 13:50:00'),
(5, 5, 'JKL-7890', 'MOTORCYCLE', 'Kawasaki', 'Barako 175',  2021, 'Black',  'VIN-JKL7890XX', 15300, '2026-08-23 08:25:00');

INSERT INTO parts_inventory (part_id, part_code, part_name, category, unit, unit_price, quantity_on_hand, reorder_level, batch_number, date_added, status) VALUES
(1, 'PRT-001', 'Engine Oil (1L)',       'Engine',     'liter', 380.00,  48, 10, 'BATCH-2026-01', '2026-07-01 09:00:00', 'ACTIVE'),
(2, 'PRT-002', 'Brake Pads (set)',      'Brake',      'set',   1200.00, 12, 5,  'BATCH-2026-01', '2026-07-01 09:00:00', 'ACTIVE'),
(3, 'PRT-003', 'Air Filter',            'Engine',     'pc',    380.00,  20, 8,  'BATCH-2026-01', '2026-07-01 09:00:00', 'ACTIVE'),
(4, 'PRT-004', 'Spark Plugs (set of 4)','Engine',     'set',   950.00,  18, 6,  'BATCH-2026-01', '2026-07-01 09:00:00', 'ACTIVE'),
(5, 'PRT-005', 'Car Battery (12V)',     'Electrical', 'pc',    3800.00, 8,  5,  'BATCH-2026-02', '2026-07-15 09:00:00', 'ACTIVE'),
(6, 'PRT-006', 'Wiper Blade (pair)',    'Body',       'pair',  650.00,  22, 8,  'BATCH-2026-01', '2026-07-01 09:00:00', 'ACTIVE'),
(7, 'PRT-007', 'Coolant (1L)',          'Engine',     'liter', 280.00,  30, 10, 'BATCH-2026-02', '2026-07-15 09:00:00', 'ACTIVE'),
(8, 'PRT-008', 'Timing Belt',           'Engine',     'pc',    1850.00, 6,  5,  'BATCH-2026-02', '2026-07-15 09:00:00', 'ACTIVE');

INSERT INTO repair_orders (order_id, vehicle_id, date_received, date_completed, mileage_at_service, complaint, status, diagnosis_notes, diagnosis_completed_at, priority, created_by) VALUES
(1, 1, '2026-08-27 09:10:00', NULL, 32000, 'Engine makes knocking noise when accelerating.', 'PENDING_DIAGNOSIS', NULL, NULL, 'STANDARD', 6),
(2, 2, '2026-08-26 10:25:00', NULL, 8500,  'Brake lever feels spongy, brake fade during test ride.', 'AWAITING_DIAGNOSIS', NULL, NULL, 'URGENT', 6),
(3, 3, '2026-08-25 11:40:00', NULL, 12100, 'Customer reports difficulty starting in the morning.', 'PENDING_MECHANICS', 'Weak battery output and corroded terminals found. Recommend battery cleaning/replacement.', '2026-08-25 14:00:00', 'STANDARD', 6),
(4, 4, '2026-08-24 13:55:00', NULL, 51200, 'Vehicle will not start. Battery voltage reads 9.2V (dead).', 'IN_PROGRESS', 'Battery voltage reads 9.2V (dead). Starter motor draws excessive current — likely worn brushes. Recommend battery replacement and starter motor overhaul.', '2026-08-24 16:10:00', 'RUSH', 6),
(5, 5, '2026-08-23 08:30:00', '2026-08-23 17:00:00', 15300, 'Routine 10,000km service.', 'FULFILLED', 'Routine 10,000km service. Oil change, filter replacement, chain adjustment, and general inspection completed. All systems nominal.', '2026-08-23 09:00:00', 'STANDARD', 6);

INSERT INTO repair_order_services (order_service_id, order_id, service_catalog_id) VALUES
(1, 4, 1),
(2, 5, 2);

INSERT INTO repair_order_mechanics (assignment_id, order_id, mechanic_id, position_id, date_assigned) VALUES
(1, 2, 1, 1, '2026-08-26 10:30:00'),
(2, 3, 1, 1, '2026-08-25 13:50:00'),
(3, 4, 1, 1, '2026-08-24 15:00:00'),
(4, 4, 2, 2, '2026-08-24 16:15:00'),
(5, 4, 3, 3, '2026-08-24 16:20:00'),
(6, 5, 1, 1, '2026-08-23 08:35:00'),
(7, 5, 4, 2, '2026-08-23 09:05:00');

INSERT INTO repair_order_parts (order_part_id, order_id, part_id, batch_number, quantity_used, unit_price, status) VALUES
(1, 4, 5, 'BATCH-2026-02', 1, 3800.00, 'ISSUED'),
(2, 5, 1, 'BATCH-2026-01', 3, 380.00, 'ISSUED'),
(3, 5, 3, 'BATCH-2026-01', 1, 380.00, 'ISSUED');

INSERT INTO maintenance_history (history_id, order_id, service_date, service_summary, next_service_due_date, next_service_due_mileage) VALUES
(1, 5, '2026-08-23 17:00:00', 'Routine 10,000km service completed — oil change, filter, chain adjustment.', '2026-11-23', 25300);

INSERT INTO invoices (invoice_id, order_id, invoice_date, labor_total, parts_total, discount, tax_amount, total_amount, payment_method, payment_reference, payment_date, status, issued_by, received_by) VALUES
(2, 5, '2026-08-23 17:05:00', 1000.00, 920.00, 0.00, 0.00, 1920.00, 'CASH', NULL, '2026-08-23 17:10:00', 'PAID', 6, 6);

-- ################ EXTRA DUMMY DATA ################


-- =====================================================================
-- CUSTOMERS
-- =====================================================================
INSERT INTO customers (customer_id, first_name, middle_name, last_name, contact_no, email, address, created_at) VALUES
(6, 'Ethan', 'Jose', 'Ocampo', '0996-619-4258', 'ethan.ocampo6@email.com', 'Brgy. Pulo, Cabuyao, Laguna', '2026-08-04 00:07:14'),
(7, 'Sophia', 'Ann', 'Aquino', '0935-652-9689', 'sophia.aquino7@email.com', 'Brgy. Banay-banay, Cabuyao, Laguna', '2026-08-06 09:48:17'),
(8, 'Mason', 'Ann', 'Valdez', '0977-119-2832', 'mason.valdez8@email.com', 'Brgy. Gulod, Cabuyao, Laguna', '2026-08-17 11:05:34'),
(9, 'Ava', 'Jose', 'Soriano', '0945-159-4946', 'ava.soriano9@email.com', 'Brgy. Canlubang, Calamba, Laguna', '2026-08-10 09:58:47'),
(10, 'Lucas', NULL, 'Mendoza', '0925-849-8962', 'lucas.mendoza10@email.com', 'Brgy. Mamatid, Cabuyao, Laguna', '2026-08-06 13:28:16'),
(11, 'Mia', 'Paul', 'Aguilar', '0931-231-8787', 'mia.aguilar11@email.com', 'Blk 7 Lot 3, Calamba, Laguna', '2026-08-05 20:26:57'),
(12, 'Logan', NULL, 'Aguilar', '0948-640-7932', 'logan.aguilar12@email.com', 'Brgy. Niugan, Cabuyao, Laguna', '2026-08-10 12:30:54'),
(13, 'Isabella', 'Paul', 'Castillo', '0940-830-6107', 'isabella.castillo13@email.com', 'Brgy. Marinig, Cabuyao, Laguna', '2026-08-18 17:43:28'),
(14, 'Jacob', 'Ann', 'Ramos', '0971-629-8397', 'jacob.ramos14@email.com', 'Brgy. Mamatid, Cabuyao, Laguna', '2026-08-16 11:18:07'),
(15, 'Amelia', 'Marie', 'Santos', '0943-165-6539', 'amelia.santos15@email.com', 'Brgy. Banay-banay, Cabuyao, Laguna', '2026-08-06 05:58:24'),
(16, 'Elijah', 'Paul', 'Bautista', '0944-702-4608', 'elijah.bautista16@email.com', 'Brgy. Banay-banay, Cabuyao, Laguna', '2026-08-03 08:43:38'),
(17, 'Harper', NULL, 'Torres', '0995-160-4750', 'harper.torres17@email.com', 'Brgy. Mamatid, Cabuyao, Laguna', '2026-08-14 14:47:12'),
(18, 'Aiden', NULL, 'Tan', '0957-172-9423', 'aiden.tan18@email.com', 'Brgy. Niugan, Cabuyao, Laguna', '2026-08-11 06:11:12'),
(19, 'Evelyn', 'Jose', 'Dela Cruz', '0977-319-9834', 'evelyn.delacruz19@email.com', 'Brgy. Pulo, Cabuyao, Laguna', '2026-08-03 03:17:58'),
(20, 'Jackson', 'Grace', 'Ocampo', '0946-903-8749', 'jackson.ocampo20@email.com', 'Brgy. Marinig, Cabuyao, Laguna', '2026-08-14 22:54:41'),
(21, 'Abigail', 'Marie', 'Soriano', '0927-199-8062', 'abigail.soriano21@email.com', 'Brgy. Gulod, Cabuyao, Laguna', '2026-08-05 11:50:48'),
(22, 'Levi', 'Luis', 'Valdez', '0967-578-1887', 'levi.valdez22@email.com', 'Brgy. Dila, Sta. Rosa, Laguna', '2026-08-06 08:12:00'),
(23, 'Ella', NULL, 'Cruz', '0922-512-6559', 'ella.cruz23@email.com', 'Brgy. Mamatid, Cabuyao, Laguna', '2026-08-20 01:08:32'),
(24, 'Sebastian', 'Marie', 'Dela Cruz', '0939-294-9786', 'sebastian.delacruz24@email.com', 'Purok 2, Sta. Rosa, Laguna', '2026-08-07 13:09:19'),
(25, 'Scarlett', NULL, 'Torres', '0969-287-5563', 'scarlett.torres25@email.com', 'Purok 2, Sta. Rosa, Laguna', '2026-08-04 23:07:37'),
(26, 'Mateo', 'Marie', 'Valdez', '0924-553-2604', 'mateo.valdez26@email.com', 'Brgy. Banay-banay, Cabuyao, Laguna', '2026-08-07 10:11:25'),
(27, 'Grace', 'Paul', 'Ocampo', '0916-195-4872', 'grace.ocampo27@email.com', 'Brgy. Pulo, Cabuyao, Laguna', '2026-08-03 02:33:30'),
(28, 'Daniel', 'Luis', 'Aguilar', '0977-592-4502', 'daniel.aguilar28@email.com', 'Brgy. Marinig, Cabuyao, Laguna', '2026-08-17 01:42:00'),
(29, 'Chloe', NULL, 'Dela Cruz', '0936-488-1035', 'chloe.delacruz29@email.com', 'Brgy. Marinig, Cabuyao, Laguna', '2026-08-07 11:37:17'),
(30, 'Henry', 'Jose', 'Lim', '0973-392-7930', 'henry.lim30@email.com', 'Brgy. San Pedro, Biñan, Laguna', '2026-08-13 13:32:51'),
(31, 'Victoria', 'Paul', 'Gonzales', '0999-835-8973', 'victoria.gonzales31@email.com', 'Brgy. Pulo, Cabuyao, Laguna', '2026-08-18 02:28:38'),
(32, 'Owen', 'Marie', 'Reyes', '0952-322-1958', 'owen.reyes32@email.com', 'Brgy. Canlubang, Calamba, Laguna', '2026-08-18 19:00:50'),
(33, 'Riley', 'Paul', 'Cruz', '0922-865-6138', 'riley.cruz33@email.com', 'Brgy. Banay-banay, Cabuyao, Laguna', '2026-08-06 05:21:12'),
(34, 'Wyatt', NULL, 'Lim', '0989-588-9238', 'wyatt.lim34@email.com', 'Blk 7 Lot 3, Calamba, Laguna', '2026-08-08 08:16:21'),
(35, 'Aria', NULL, 'Dela Cruz', '0922-620-2312', 'aria.delacruz35@email.com', 'Brgy. Pulo, Cabuyao, Laguna', '2026-08-20 14:16:55'),
(36, 'Carter', NULL, 'Santos', '0991-169-4853', 'carter.santos36@email.com', 'Brgy. Marinig, Cabuyao, Laguna', '2026-08-07 02:53:52'),
(37, 'Lily', NULL, 'Aguilar', '0987-352-1651', 'lily.aguilar37@email.com', 'Brgy. Canlubang, Calamba, Laguna', '2026-08-13 04:50:07'),
(38, 'Julian', NULL, 'Navarro', '0968-773-9565', 'julian.navarro38@email.com', 'Brgy. Gulod, Cabuyao, Laguna', '2026-08-20 18:52:16'),
(39, 'Zoe', 'Jose', 'Aquino', '0941-785-6147', 'zoe.aquino39@email.com', 'Brgy. Niugan, Cabuyao, Laguna', '2026-08-22 19:51:54'),
(40, 'Luke', 'Jose', 'Domingo', '0965-234-5915', 'luke.domingo40@email.com', 'Purok 2, Sta. Rosa, Laguna', '2026-08-03 07:19:59'),
(41, 'Nora', 'Ann', 'Bautista', '0924-109-8508', 'nora.bautista41@email.com', 'Brgy. Canlubang, Calamba, Laguna', '2026-08-04 16:18:21'),
(42, 'Gabriel', NULL, 'Valdez', '0924-650-4492', 'gabriel.valdez42@email.com', 'Blk 7 Lot 3, Calamba, Laguna', '2026-08-10 10:24:22'),
(43, 'Hannah', 'Jose', 'Dela Cruz', '0931-457-2127', 'hannah.delacruz43@email.com', 'Brgy. Niugan, Cabuyao, Laguna', '2026-08-14 07:41:27'),
(44, 'Anthony', 'Ann', 'Castillo', '0951-261-8179', 'anthony.castillo44@email.com', 'Blk 7 Lot 3, Calamba, Laguna', '2026-08-22 12:49:24'),
(45, 'Layla', 'Jose', 'Garcia', '0993-926-9666', 'layla.garcia45@email.com', 'Brgy. Banay-banay, Cabuyao, Laguna', '2026-08-16 00:03:25'),
(46, 'Isaac', 'Paul', 'Aguilar', '0953-779-2697', 'isaac.aguilar46@email.com', 'Brgy. Pulo, Cabuyao, Laguna', '2026-08-17 18:22:13'),
(47, 'Penelope', 'Jose', 'Villanueva', '0929-209-3546', 'penelope.villanueva47@email.com', 'Brgy. Sala, Cabuyao, Laguna', '2026-08-03 21:28:25'),
(48, 'Dylan', 'Jose', 'Salazar', '0992-315-6617', 'dylan.salazar48@email.com', 'Brgy. Niugan, Cabuyao, Laguna', '2026-08-01 16:10:24'),
(49, 'Camila', 'Jose', 'Tan', '0979-600-5114', 'camila.tan49@email.com', 'Brgy. Banay-banay, Cabuyao, Laguna', '2026-08-07 04:24:50'),
(50, 'Leo', NULL, 'Ramos', '0996-533-5533', 'leo.ramos50@email.com', 'Brgy. Banay-banay, Cabuyao, Laguna', '2026-08-12 06:55:17');

-- =====================================================================
-- PARTS_INVENTORY
-- =====================================================================
INSERT INTO parts_inventory (part_id, part_code, part_name, category, unit, unit_price, quantity_on_hand, reorder_level, batch_number, date_added, status) VALUES
(9, 'PRT-009', 'Oil Filter', 'Engine', 'pc', 250.00, 60, 15, 'BATCH-2026-03', '2026-08-01 09:00:00', 'ACTIVE'),
(10, 'PRT-010', 'Brake Fluid (500ml)', 'Brake', 'bottle', 320.00, 40, 10, 'BATCH-2026-03', '2026-08-01 09:00:00', 'ACTIVE'),
(11, 'PRT-011', 'Brake Disc Rotor', 'Brake', 'pc', 1800.00, 10, 4, 'BATCH-2026-03', '2026-08-01 09:00:00', 'ACTIVE'),
(12, 'PRT-012', 'Motorcycle Brake Pads (set)', 'Brake', 'set', 450.00, 25, 8, 'BATCH-2026-03', '2026-08-01 09:00:00', 'ACTIVE'),
(13, 'PRT-013', 'Motorcycle Battery (12V)', 'Electrical', 'pc', 1500.00, 14, 5, 'BATCH-2026-03', '2026-08-05 09:00:00', 'ACTIVE'),
(14, 'PRT-014', 'Drive Chain Kit', 'Drivetrain', 'set', 2200.00, 9, 4, 'BATCH-2026-03', '2026-08-05 09:00:00', 'ACTIVE'),
(15, 'PRT-015', 'CVT Drive Belt', 'Drivetrain', 'pc', 900.00, 16, 6, 'BATCH-2026-03', '2026-08-05 09:00:00', 'ACTIVE'),
(16, 'PRT-016', 'Clutch Disc Set', 'Drivetrain', 'set', 2600.00, 6, 4, 'BATCH-2026-04', '2026-08-05 09:00:00', 'ACTIVE'),
(17, 'PRT-017', 'Car Tire 14in', 'Tires', 'pc', 3200.00, 12, 6, 'BATCH-2026-04', '2026-08-09 09:00:00', 'ACTIVE'),
(18, 'PRT-018', 'Motorcycle Tire', 'Tires', 'pc', 1400.00, 18, 6, 'BATCH-2026-04', '2026-08-09 09:00:00', 'ACTIVE'),
(19, 'PRT-019', 'Headlight Bulb', 'Electrical', 'pc', 350.00, 30, 10, 'BATCH-2026-04', '2026-08-09 09:00:00', 'ACTIVE'),
(20, 'PRT-020', 'Fuse Assortment Box', 'Electrical', 'box', 180.00, 35, 10, 'BATCH-2026-04', '2026-08-09 09:00:00', 'ACTIVE'),
(21, 'PRT-021', 'Radiator Hose', 'Engine', 'pc', 520.00, 12, 5, 'BATCH-2026-04', '2026-08-13 09:00:00', 'ACTIVE'),
(22, 'PRT-022', 'Fuel Filter', 'Engine', 'pc', 420.00, 15, 6, 'BATCH-2026-04', '2026-08-13 09:00:00', 'ACTIVE'),
(23, 'PRT-023', 'Shock Absorber', 'Suspension', 'pc', 2100.00, 8, 4, 'BATCH-2026-04', '2026-08-13 09:00:00', 'ACTIVE'),
(24, 'PRT-024', 'Ball Joint', 'Suspension', 'pc', 750.00, 10, 4, 'BATCH-2026-04', '2026-08-13 09:00:00', 'ACTIVE'),
(25, 'PRT-025', 'Tie Rod End', 'Suspension', 'pc', 680.00, 3, 4, 'BATCH-2026-04', '2026-08-17 09:00:00', 'ACTIVE'),
(26, 'PRT-026', 'Gasket Set', 'Engine', 'set', 1300.00, 7, 4, 'BATCH-2026-04', '2026-08-17 09:00:00', 'ACTIVE'),
(27, 'PRT-027', 'Alternator Belt', 'Engine', 'pc', 540.00, 14, 5, 'BATCH-2026-05', '2026-08-17 09:00:00', 'ACTIVE'),
(28, 'PRT-028', 'Starter Brush Set', 'Electrical', 'set', 600.00, 9, 4, 'BATCH-2026-05', '2026-08-17 09:00:00', 'ACTIVE'),
(29, 'PRT-029', 'Motorcycle Engine Oil (1L)', 'Engine', 'liter', 420.00, 70, 15, 'BATCH-2026-05', '2026-08-21 09:00:00', 'ACTIVE'),
(30, 'PRT-030', 'Spark Plug (single)', 'Engine', 'pc', 220.00, 50, 15, 'BATCH-2026-05', '2026-08-21 09:00:00', 'ACTIVE'),
(31, 'PRT-031', 'Wheel Bearing', 'Drivetrain', 'pc', 480.00, 20, 6, 'BATCH-2026-05', '2026-08-21 09:00:00', 'ACTIVE'),
(32, 'PRT-032', 'AC Compressor Oil', 'AC', 'bottle', 350.00, 4, 5, 'BATCH-2026-05', '2026-08-21 09:00:00', 'ACTIVE');


-- =====================================================================
-- VEHICLES
-- =====================================================================
INSERT INTO vehicles (vehicle_id, customer_id, plate_number, vehicle_type, manufacturer, model, year_model, color, vin_number, current_mileage, date_registered) VALUES
(6, 6, 'XJF-8239', 'CAR', 'Honda', 'City', 2015, 'White', 'VIN-XJF8239XX', 59057, '2026-08-04 00:47:14'),
(7, 7, 'UBM-3426', 'CAR', 'Honda', 'City', 2015, 'Blue', 'VIN-UBM3426XX', 61821, '2026-08-06 10:01:17'),
(8, 8, 'MGY-5088', 'CAR', 'Toyota', 'Vios', 2023, 'Green', 'VIN-MGY5088XX', 24901, '2026-08-17 11:32:34'),
(9, 9, 'HFF-7755', 'TRICYCLE', 'Honda', 'TMX Supremo', 2020, 'Green', 'VIN-HFF7755XX', 2312, '2026-08-10 10:14:47'),
(10, 10, 'HJF-2771', 'MOTORCYCLE', 'Honda', 'Beat', 2015, 'Orange', 'VIN-HJF2771XX', 22927, '2026-08-06 14:28:16'),
(11, 11, 'MKH-4652', 'CAR', 'Ford', 'EcoSport', 2018, 'Green', 'VIN-MKH4652XX', 9435, '2026-08-05 21:13:57'),
(12, 12, 'JMX-9346', 'CAR', 'Toyota', 'Wigo', 2023, 'Gray', 'VIN-JMX9346XX', 56729, '2026-08-10 13:18:54'),
(13, 13, 'JFV-5349', 'TRICYCLE', 'Honda', 'TMX Supremo', 2024, 'Green', 'VIN-JFV5349XX', 3515, '2026-08-18 17:54:28'),
(14, 14, 'PWT-2894', 'CAR', 'Nissan', 'Almera', 2024, 'Red', 'VIN-PWT2894XX', 54663, '2026-08-16 12:20:07'),
(15, 15, 'ATU-4228', 'CAR', 'Hyundai', 'Accent', 2016, 'Gray', 'VIN-ATU4228XX', 58228, '2026-08-06 06:30:24'),
(16, 16, 'DKT-6067', 'MOTORCYCLE', 'Kawasaki', 'Barako 175', 2020, 'Green', 'VIN-DKT6067XX', 23352, '2026-08-03 09:14:38'),
(17, 17, 'EGP-7211', 'MOTORCYCLE', 'Suzuki', 'Raider R150', 2017, 'Blue', 'VIN-EGP7211XX', 23908, '2026-08-14 15:39:12'),
(18, 18, 'AKK-4443', 'MOTORCYCLE', 'Honda', 'Beat', 2024, 'Gray', 'VIN-AKK4443XX', 21428, '2026-08-11 07:06:12'),
(19, 19, 'YGT-8752', 'MOTORCYCLE', 'Yamaha', 'NMAX', 2017, 'White', 'VIN-YGT8752XX', 30254, '2026-08-03 04:19:58'),
(20, 20, 'CHY-6085', 'CAR', 'Nissan', 'Almera', 2018, 'Silver', 'VIN-CHY6085XX', 38162, '2026-08-14 23:50:41'),
(21, 21, 'SWC-8461', 'CAR', 'Mitsubishi', 'Mirage', 2024, 'Red', 'VIN-SWC8461XX', 65401, '2026-08-05 12:51:48'),
(22, 22, 'SNH-3417', 'MOTORCYCLE', 'Yamaha', 'NMAX', 2015, 'White', 'VIN-SNH3417XX', 22997, '2026-08-06 09:01:00'),
(23, 23, 'FZT-8611', 'MOTORCYCLE', 'Honda', 'TMX 125', 2018, 'White', 'VIN-FZT8611XX', 6502, '2026-08-20 01:48:32'),
(24, 24, 'RYT-6198', 'MOTORCYCLE', 'Honda', 'Beat', 2022, 'Green', 'VIN-RYT6198XX', 26248, '2026-08-07 14:11:19'),
(25, 25, 'RFS-8373', 'MOTORCYCLE', 'Suzuki', 'Raider R150', 2018, 'Blue', 'VIN-RFS8373XX', 11568, '2026-08-05 00:00:37'),
(26, 26, 'SXH-5499', 'MOTORCYCLE', 'Suzuki', 'Raider R150', 2019, 'Red', 'VIN-SXH5499XX', 17330, '2026-08-07 10:20:25'),
(27, 27, 'UCE-3471', 'CAR', 'Nissan', 'Almera', 2017, 'Red', 'VIN-UCE3471XX', 33311, '2026-08-03 03:02:30'),
(28, 28, 'LUR-7812', 'CAR', 'Hyundai', 'Accent', 2021, 'Green', 'VIN-LUR7812XX', 14296, '2026-08-17 02:00:00'),
(29, 29, 'VNS-1096', 'TRICYCLE', 'Honda', 'TMX Supremo', 2021, 'Green', 'VIN-VNS1096XX', 13944, '2026-08-07 12:01:17'),
(30, 30, 'UWH-8999', 'MOTORCYCLE', 'Kawasaki', 'Barako 175', 2021, 'Orange', 'VIN-UWH8999XX', 8690, '2026-08-13 13:54:51'),
(31, 31, 'YYN-3704', 'CAR', 'Nissan', 'Almera', 2017, 'Black', 'VIN-YYN3704XX', 66682, '2026-08-18 03:31:38'),
(32, 32, 'CXP-3223', 'TRICYCLE', 'Honda', 'TMX Supremo', 2017, 'Black', 'VIN-CXP3223XX', 35412, '2026-08-18 19:34:50'),
(33, 33, 'GRL-6529', 'CAR', 'Nissan', 'Almera', 2021, 'Blue', 'VIN-GRL6529XX', 57172, '2026-08-06 05:43:12'),
(34, 34, 'AUB-6733', 'MOTORCYCLE', 'Yamaha', 'NMAX', 2016, 'Black', 'VIN-AUB6733XX', 13342, '2026-08-08 09:02:21'),
(35, 35, 'GAW-3496', 'MOTORCYCLE', 'Honda', 'TMX 125', 2022, 'White', 'VIN-GAW3496XX', 10598, '2026-08-20 14:29:55'),
(36, 36, 'RZJ-7043', 'MOTORCYCLE', 'Honda', 'TMX 125', 2024, 'White', 'VIN-RZJ7043XX', 6998, '2026-08-07 03:36:52'),
(37, 37, 'KDV-1420', 'MOTORCYCLE', 'Honda', 'TMX 125', 2021, 'Green', 'VIN-KDV1420XX', 13226, '2026-08-13 05:31:07'),
(38, 38, 'CVZ-4978', 'TRICYCLE', 'Honda', 'TMX Supremo', 2019, 'White', 'VIN-CVZ4978XX', 8410, '2026-08-20 19:41:16'),
(39, 39, 'BMU-8018', 'MOTORCYCLE', 'Suzuki', 'Raider R150', 2016, 'Gray', 'VIN-BMU8018XX', 23826, '2026-08-22 20:19:54'),
(40, 40, 'SDP-6934', 'CAR', 'Hyundai', 'Accent', 2017, 'Green', 'VIN-SDP6934XX', 66026, '2026-08-03 08:09:59'),
(41, 41, 'WUS-8616', 'CAR', 'Suzuki', 'Ertiga', 2024, 'Blue', 'VIN-WUS8616XX', 66560, '2026-08-04 17:15:21'),
(42, 42, 'CJR-4995', 'CAR', 'Mitsubishi', 'Mirage', 2024, 'Green', 'VIN-CJR4995XX', 66719, '2026-08-10 11:05:22'),
(43, 43, 'LFS-4475', 'CAR', 'Ford', 'EcoSport', 2019, 'Gray', 'VIN-LFS4475XX', 49507, '2026-08-14 08:37:27'),
(44, 44, 'UAT-4130', 'CAR', 'Suzuki', 'Ertiga', 2021, 'Orange', 'VIN-UAT4130XX', 18727, '2026-08-22 13:09:24'),
(45, 45, 'ZSX-9041', 'MOTORCYCLE', 'Honda', 'TMX 125', 2015, 'White', 'VIN-ZSX9041XX', 20592, '2026-08-16 00:58:25'),
(46, 46, 'ZHK-7046', 'CAR', 'Hyundai', 'Accent', 2023, 'Gray', 'VIN-ZHK7046XX', 69970, '2026-08-17 19:02:13'),
(47, 47, 'ULM-8434', 'MOTORCYCLE', 'Kawasaki', 'Barako 175', 2019, 'Red', 'VIN-ULM8434XX', 12801, '2026-08-03 21:52:25'),
(48, 48, 'LDU-4033', 'CAR', 'Mitsubishi', 'Mirage', 2022, 'Blue', 'VIN-LDU4033XX', 31056, '2026-08-01 16:28:24'),
(49, 49, 'TWK-2647', 'MOTORCYCLE', 'Honda', 'Beat', 2019, 'Red', 'VIN-TWK2647XX', 31177, '2026-08-07 04:41:50'),
(50, 50, 'AZU-3073', 'CAR', 'Suzuki', 'Ertiga', 2015, 'Blue', 'VIN-AZU3073XX', 38954, '2026-08-12 07:02:17'),
(51, 50, 'DAV-5658', 'TRICYCLE', 'Kawasaki', 'Barako 175', 2022, 'Gray', 'VIN-DAV5658XX', 18108, '2026-08-12 07:30:17'),
(52, 17, 'SDC-7565', 'TRICYCLE', 'Kawasaki', 'Barako 175', 2024, 'Black', 'VIN-SDC7565XX', 22802, '2026-08-14 14:56:12'),
(53, 15, 'CHD-7818', 'CAR', 'Suzuki', 'Ertiga', 2023, 'Green', 'VIN-CHD7818XX', 32581, '2026-08-06 06:52:24'),
(54, 34, 'VPK-1986', 'TRICYCLE', 'Kawasaki', 'Barako 175', 2016, 'Red', 'VIN-VPK1986XX', 21476, '2026-08-08 09:08:21'),
(55, 46, 'FHF-2229', 'CAR', 'Toyota', 'Wigo', 2021, 'Orange', 'VIN-FHF2229XX', 24601, '2026-08-17 18:27:13'),
(56, 50, 'BHK-5632', 'MOTORCYCLE', 'Yamaha', 'Mio i125', 2022, 'White', 'VIN-BHK5632XX', 24546, '2026-08-12 07:55:17'),
(57, 49, 'XVY-4241', 'CAR', 'Suzuki', 'Ertiga', 2023, 'Red', 'VIN-XVY4241XX', 58723, '2026-08-07 04:36:50'),
(58, 47, 'ECB-3718', 'CAR', 'Suzuki', 'Ertiga', 2024, 'Blue', 'VIN-ECB3718XX', 44527, '2026-08-03 22:11:25'),
(59, 34, 'ZNJ-9199', 'CAR', 'Suzuki', 'Ertiga', 2016, 'Black', 'VIN-ZNJ9199XX', 69757, '2026-08-08 08:49:21'),
(60, 33, 'JAC-4750', 'MOTORCYCLE', 'Suzuki', 'Raider R150', 2024, 'Black', 'VIN-JAC4750XX', 28737, '2026-08-06 06:19:12'),
(61, 49, 'BFS-9502', 'MOTORCYCLE', 'Suzuki', 'Raider R150', 2019, 'Silver', 'VIN-BFS9502XX', 24262, '2026-08-07 04:57:50'),
(62, 43, 'SCS-6700', 'MOTORCYCLE', 'Honda', 'Beat', 2020, 'White', 'VIN-SCS6700XX', 18938, '2026-08-14 08:07:27'),
(63, 16, 'KYN-1601', 'CAR', 'Ford', 'EcoSport', 2020, 'Blue', 'VIN-KYN1601XX', 68889, '2026-08-03 08:53:38'),
(64, 26, 'TAY-9889', 'CAR', 'Hyundai', 'Accent', 2015, 'Red', 'VIN-TAY9889XX', 63614, '2026-08-07 10:42:25'),
(65, 39, 'XRB-4335', 'CAR', 'Ford', 'EcoSport', 2017, 'Blue', 'VIN-XRB4335XX', 38003, '2026-08-22 20:31:54');

-- =====================================================================
-- REPAIR_ORDERS
-- =====================================================================
INSERT INTO repair_orders (order_id, vehicle_id, date_received, date_completed, mileage_at_service, complaint, status, diagnosis_notes, diagnosis_completed_at, priority, created_by) VALUES
(6, 64, '2026-08-28 15:17:51', NULL, 63614, 'Air conditioning not cold.', 'AWAITING_PAYMENT', 'Low compressor oil, minor leak. Service AC.', '2026-08-28 18:45:05', 'URGENT', 6),
(7, 60, '2026-08-29 02:29:46', NULL, 26357, 'Flat rear tire.', 'CANCELLED', 'Tire punctured beyond repair. Replace.', '2026-08-29 05:42:26', 'URGENT', 6),
(8, 11, '2026-08-29 10:18:58', NULL, 6504, 'Steering wheel vibrates at highway speed.', 'READY_TO_INVOICE', 'Worn ball joints and shocks. Alignment needed after.', '2026-08-29 11:55:52', 'URGENT', 6),
(9, 15, '2026-08-30 08:27:02', NULL, 52914, 'Engine overheating on long drives.', 'AWAITING_PAYMENT', 'Coolant leak at radiator hose. Replace hose and flush coolant.', '2026-08-30 11:29:59', 'STANDARD', 6),
(10, 46, '2026-08-30 16:18:29', NULL, 66913, 'Routine maintenance due.', 'READY_FOR_RELEASE', 'Routine service, no abnormalities found.', '2026-08-30 18:54:44', 'STANDARD', 6),
(11, 25, '2026-08-31 01:57:46', NULL, 11568, 'Chain noisy and loose.', 'AWAITING_PAYMENT', 'Chain stretched, sprocket worn. Replace chain kit.', '2026-08-31 05:56:40', 'URGENT', 6),
(12, 42, '2026-08-31 10:09:31', '2026-08-31 21:12:48', 66719, 'Rough idle and poor fuel economy.', 'FULFILLED', 'Clogged fuel filter and air filter. Replace both.', '2026-08-31 13:10:34', 'URGENT', 6),
(13, 8, '2026-09-01 08:41:09', '2026-09-01 18:02:32', 18278, 'Routine maintenance due.', 'FULFILLED', 'Routine service, no abnormalities found.', '2026-09-01 11:00:09', 'STANDARD', 6),
(14, 58, '2026-09-01 16:44:30', '2026-09-02 18:54:37', 44527, 'Air conditioning not cold.', 'FULFILLED', 'Low compressor oil, minor leak. Service AC.', '2026-09-01 20:07:37', 'URGENT', 6),
(15, 49, '2026-09-02 02:22:47', NULL, 31177, 'Jerking when accelerating.', 'CANCELLED', NULL, NULL, 'STANDARD', 6),
(16, 45, '2026-09-02 11:00:14', NULL, 18837, 'Chain noisy and loose.', 'AWAITING_PAYMENT', 'Chain stretched, sprocket worn. Replace chain kit.', '2026-09-02 12:51:12', 'STANDARD', 6),
(17, 21, '2026-09-02 17:55:58', '2026-09-03 14:13:49', 57876, 'Wipers leave streaks.', 'FULFILLED', 'Wiper blades worn. Replace.', '2026-09-02 21:04:13', 'STANDARD', 6),
(18, 34, '2026-09-03 01:40:16', '2026-09-04 04:41:17', 10332, 'Chain noisy and loose.', 'FULFILLED', 'Chain stretched, sprocket worn. Replace chain kit.', '2026-09-03 03:51:39', 'STANDARD', 6),
(19, 44, '2026-09-03 12:48:17', NULL, 14428, 'Engine makes knocking noise when accelerating.', 'AWAITING_PAYMENT', 'Fouled spark plugs causing misfire. Replace plugs.', '2026-09-03 14:49:21', 'URGENT', 6),
(20, 56, '2026-09-04 08:09:59', NULL, 24546, 'Oil leaking from front fork.', 'READY_FOR_RELEASE', 'Fork seal failed, shock worn. Overhaul.', '2026-09-04 11:19:09', 'STANDARD', 6),
(21, 17, '2026-09-04 16:45:24', NULL, 23908, 'Jerking when accelerating.', 'READY_TO_INVOICE', 'Worn CVT belt. Clean CVT and replace belt.', '2026-09-04 19:22:38', 'STANDARD', 6),
(22, 20, '2026-09-05 08:32:45', '2026-09-06 06:56:39', 32621, 'Uneven tire wear.', 'FULFILLED', 'Tires worn unevenly. Replace two and align.', '2026-09-05 12:09:50', 'URGENT', 6),
(23, 15, '2026-09-05 17:07:21', NULL, 55540, 'Squealing noise when braking.', 'CANCELLED', NULL, NULL, 'STANDARD', 6),
(24, 60, '2026-09-06 04:44:13', '2026-09-06 20:05:33', 28737, 'Lights and horn not working.', 'FULFILLED', 'Blown fuse and bulb. Repair wiring.', '2026-09-06 07:16:37', 'STANDARD', 6),
(25, 59, '2026-09-06 11:16:26', '2026-09-07 14:26:49', 68103, 'Squealing noise when braking.', 'FULFILLED', 'Brake pads worn thin. Replace pads and bleed fluid.', '2026-09-06 13:48:03', 'STANDARD', 6),
(26, 38, '2026-09-07 08:36:13', '2026-09-07 20:12:43', 5472, 'Chain noisy and loose.', 'FULFILLED', 'Chain stretched, sprocket worn. Replace chain kit.', '2026-09-07 12:00:37', 'STANDARD', 6),
(27, 23, '2026-09-07 14:50:07', '2026-09-07 23:17:54', 4536, 'Jerking when accelerating.', 'FULFILLED', 'Worn CVT belt. Clean CVT and replace belt.', '2026-09-07 18:11:16', 'STANDARD', 6),
(28, 52, '2026-09-08 08:19:41', NULL, 19937, 'Flat rear tire.', 'CANCELLED', 'Tire punctured beyond repair. Replace.', '2026-09-08 11:28:58', 'STANDARD', 6),
(29, 23, '2026-09-08 17:51:52', NULL, 6502, 'Chain noisy and loose.', 'READY_TO_INVOICE', 'Chain stretched, sprocket worn. Replace chain kit.', '2026-09-08 19:54:56', 'STANDARD', 6),
(30, 19, '2026-09-09 01:29:59', '2026-09-09 22:30:26', 28555, 'Hard to start in the morning.', 'FULFILLED', 'Weak battery. Replace.', '2026-09-09 03:19:22', 'STANDARD', 6),
(31, 35, '2026-09-09 10:59:22', '2026-09-09 20:27:19', 10598, 'Brake lever feels spongy.', 'FULFILLED', 'Worn pads, old fluid. Replace pads, bleed.', '2026-09-09 13:30:07', 'STANDARD', 6),
(32, 31, '2026-09-10 08:37:10', NULL, 64583, 'Wipers leave streaks.', 'READY_TO_INVOICE', 'Wiper blades worn. Replace.', '2026-09-10 12:04:02', 'STANDARD', 6),
(33, 38, '2026-09-10 15:31:54', NULL, 8410, 'Chain noisy and loose.', 'READY_TO_INVOICE', 'Chain stretched, sprocket worn. Replace chain kit.', '2026-09-10 17:31:29', 'URGENT', 6),
(34, 10, '2026-09-11 03:36:17', '2026-09-11 19:22:30', 16607, 'Hard to start in the morning.', 'FULFILLED', 'Weak battery. Replace.', '2026-09-11 06:12:15', 'STANDARD', 6),
(35, 34, '2026-09-11 12:05:17', NULL, 13342, 'Routine maintenance due.', 'READY_FOR_RELEASE', 'Routine service, no abnormalities found.', '2026-09-11 15:02:20', 'URGENT', 6),
(36, 44, '2026-09-12 08:20:10', NULL, 16545, 'Air conditioning not cold.', 'AWAITING_PAYMENT', 'Low compressor oil, minor leak. Service AC.', '2026-09-12 11:27:05', 'RUSH', 6),
(37, 39, '2026-09-13 08:33:50', '2026-09-13 22:44:02', 23826, 'Oil leaking from front fork.', 'FULFILLED', 'Fork seal failed, shock worn. Overhaul.', '2026-09-13 12:02:13', 'STANDARD', 6),
(38, 52, '2026-09-13 16:50:14', '2026-09-14 05:56:42', 22802, 'Oil leaking from front fork.', 'FULFILLED', 'Fork seal failed, shock worn. Overhaul.', '2026-09-13 19:49:29', 'STANDARD', 6),
(39, 33, '2026-09-14 04:00:19', NULL, 54174, 'Wipers leave streaks.', 'READY_FOR_RELEASE', 'Wiper blades worn. Replace.', '2026-09-14 05:59:07', 'STANDARD', 6),
(40, 59, '2026-09-14 16:10:20', '2026-09-15 15:43:57', 69757, 'Headlight out and dashboard lights flicker.', 'FULFILLED', 'Blown bulbs and faulty fuse. Repair wiring.', '2026-09-14 18:07:28', 'STANDARD', 6),
(41, 21, '2026-09-15 03:35:00', '2026-09-15 18:48:13', 60543, 'Air conditioning not cold.', 'FULFILLED', 'Low compressor oil, minor leak. Service AC.', '2026-09-15 07:20:35', 'URGENT', 6),
(42, 32, '2026-09-15 13:36:23', '2026-09-16 11:51:18', 30721, 'Hard to start in the morning.', 'FULFILLED', 'Weak battery. Replace.', '2026-09-15 16:29:34', 'URGENT', 6),
(43, 11, '2026-09-16 02:15:17', '2026-09-16 16:20:36', 9435, 'Engine overheating on long drives.', 'FULFILLED', 'Coolant leak at radiator hose. Replace hose and flush coolant.', '2026-09-16 04:43:13', 'RUSH', 6),
(44, 14, '2026-09-16 14:35:09', '2026-09-16 21:03:41', 54663, 'Engine makes knocking noise when accelerating.', 'FULFILLED', 'Fouled spark plugs causing misfire. Replace plugs.', '2026-09-16 17:37:27', 'RUSH', 6),
(45, 21, '2026-09-17 08:18:31', '2026-09-18 02:04:33', 62238, 'Routine maintenance due.', 'FULFILLED', 'Routine service, no abnormalities found.', '2026-09-17 09:50:59', 'STANDARD', 6),
(46, 32, '2026-09-17 16:14:00', NULL, 32571, 'Hard to start in the morning.', 'AWAITING_PAYMENT', 'Weak battery. Replace.', '2026-09-17 17:50:31', 'STANDARD', 6),
(47, 28, '2026-09-18 04:12:42', NULL, 11437, 'Starter grinds then fails.', 'READY_FOR_RELEASE', 'Starter brushes worn. Replace brush set.', '2026-09-18 06:35:33', 'STANDARD', 6),
(48, 10, '2026-09-18 16:42:14', NULL, 19308, 'Clutch lever too loose, slipping.', 'PENDING_DIAGNOSIS', NULL, NULL, 'STANDARD', 6),
(49, 62, '2026-09-19 05:01:57', NULL, 16172, 'Routine maintenance due.', 'PENDING_MECHANICS', 'Routine service, no abnormalities found.', '2026-09-19 08:24:57', 'RUSH', 6),
(50, 28, '2026-09-19 12:33:41', NULL, 14296, 'Rough idle and poor fuel economy.', 'AWAITING_DIAGNOSIS', NULL, NULL, 'STANDARD', 6),
(51, 37, '2026-09-20 08:11:26', NULL, 13226, 'Clutch lever too loose, slipping.', 'AWAITING_PARTS', 'Clutch plates worn. Replace set.', '2026-09-20 11:11:48', 'RUSH', 6),
(52, 12, '2026-09-21 08:20:15', NULL, 56729, 'Squealing noise when braking.', 'PENDING_DIAGNOSIS', NULL, NULL, 'STANDARD', 6),
(53, 44, '2026-09-21 16:47:22', NULL, 18727, 'Headlight out and dashboard lights flicker.', 'PENDING_DIAGNOSIS', NULL, NULL, 'STANDARD', 6),
(54, 8, '2026-09-22 01:36:07', NULL, 21559, 'Headlight out and dashboard lights flicker.', 'PENDING_MECHANICS', 'Blown bulbs and faulty fuse. Repair wiring.', '2026-09-22 05:06:17', 'STANDARD', 6),
(55, 7, '2026-09-22 13:02:14', NULL, 61821, 'Vehicle will not start, clicking sound.', 'AWAITING_PARTS', 'Battery dead. Replace battery.', '2026-09-22 16:29:00', 'STANDARD', 6),
(56, 8, '2026-09-23 08:36:04', NULL, 24901, 'Uneven tire wear.', 'IN_PROGRESS', 'Tires worn unevenly. Replace two and align.', '2026-09-23 11:01:06', 'RUSH', 6),
(57, 13, '2026-09-23 16:35:53', NULL, 3515, 'Routine maintenance due.', 'PENDING_DIAGNOSIS', NULL, NULL, 'STANDARD', 6),
(58, 41, '2026-09-24 01:41:38', NULL, 61163, 'Squealing noise when braking.', 'AWAITING_PARTS', 'Brake pads worn thin. Replace pads and bleed fluid.', '2026-09-24 03:30:02', 'URGENT', 6),
(59, 63, '2026-09-24 11:18:37', NULL, 64437, 'Headlight out and dashboard lights flicker.', 'IN_PROGRESS', 'Blown bulbs and faulty fuse. Repair wiring.', '2026-09-24 14:09:56', 'RUSH', 6),
(60, 29, '2026-09-25 08:50:42', NULL, 13944, 'Lights and horn not working.', 'IN_PROGRESS', 'Blown fuse and bulb. Repair wiring.', '2026-09-25 11:14:50', 'STANDARD', 6),
(61, 62, '2026-09-25 15:53:00', NULL, 18938, 'Brake lever feels spongy.', 'PENDING_MECHANICS', 'Worn pads, old fluid. Replace pads, bleed.', '2026-09-25 17:41:48', 'STANDARD', 6),
(62, 10, '2026-09-26 00:25:10', NULL, 22927, 'Clutch lever too loose, slipping.', 'AWAITING_PARTS', 'Clutch plates worn. Replace set.', '2026-09-26 03:12:53', 'STANDARD', 6),
(63, 26, '2026-09-26 07:44:12', NULL, 17330, 'Chain noisy and loose.', 'IN_PROGRESS', 'Chain stretched, sprocket worn. Replace chain kit.', '2026-09-26 09:55:22', 'RUSH', 6),
(64, 47, '2026-09-27 08:32:17', NULL, 12801, 'Hard to start in the morning.', 'PENDING_DIAGNOSIS', NULL, NULL, 'RUSH', 6),
(65, 48, '2026-09-27 15:46:17', NULL, 31056, 'Uneven tire wear.', 'AWAITING_DIAGNOSIS', NULL, NULL, 'RUSH', 6),
(66, 55, '2026-09-28 08:41:07', NULL, 24601, 'Uneven tire wear.', 'PENDING_MECHANICS', 'Tires worn unevenly. Replace two and align.', '2026-09-28 10:54:34', 'STANDARD', 6),
(67, 21, '2026-09-29 08:30:18', NULL, 65401, 'Starter grinds then fails.', 'IN_PROGRESS', 'Starter brushes worn. Replace brush set.', '2026-09-29 11:02:39', 'STANDARD', 6),
(68, 61, '2026-09-29 15:39:16', NULL, 24262, 'Flat rear tire.', 'AWAITING_PARTS', 'Tire punctured beyond repair. Replace.', '2026-09-29 18:19:14', 'RUSH', 6),
(69, 15, '2026-09-30 01:15:04', NULL, 58228, 'Squealing noise when braking.', 'PENDING_DIAGNOSIS', NULL, NULL, 'RUSH', 6),
(70, 32, '2026-09-30 14:09:52', NULL, 35412, 'Chain noisy and loose.', 'PENDING_DIAGNOSIS', NULL, NULL, 'RUSH', 6),
(71, 18, '2026-10-01 01:56:01', NULL, 17626, 'Hard to start in the morning.', 'IN_PROGRESS', 'Weak battery. Replace.', '2026-10-01 03:39:31', 'RUSH', 6),
(72, 19, '2026-10-01 15:40:01', NULL, 30254, 'Oil leaking from front fork.', 'AWAITING_DIAGNOSIS', NULL, NULL, 'STANDARD', 6),
(73, 33, '2026-10-02 08:06:57', NULL, 57172, 'Vehicle will not start, clicking sound.', 'AWAITING_DIAGNOSIS', NULL, NULL, 'URGENT', 6),
(74, 41, '2026-10-02 15:40:23', NULL, 64245, 'Routine maintenance due.', 'AWAITING_PARTS', 'Routine service, no abnormalities found.', '2026-10-02 18:09:28', 'STANDARD', 6),
(75, 41, '2026-10-03 05:34:02', NULL, 66560, 'Timing belt due for replacement per mileage.', 'IN_PROGRESS', 'Timing belt cracked. Replace belt and alternator belt.', '2026-10-03 07:24:36', 'STANDARD', 6),
(76, 63, '2026-10-03 12:45:32', NULL, 67280, 'Wipers leave streaks.', 'PENDING_MECHANICS', 'Wiper blades worn. Replace.', '2026-10-03 15:31:38', 'RUSH', 6),
(77, 51, '2026-10-04 08:31:11', NULL, 18108, 'Oil leaking from front fork.', 'AWAITING_DIAGNOSIS', NULL, NULL, 'STANDARD', 6),
(78, 63, '2026-10-05 08:50:22', NULL, 68889, 'Headlight out and dashboard lights flicker.', 'AWAITING_DIAGNOSIS', NULL, NULL, 'STANDARD', 6),
(79, 46, '2026-10-05 16:12:13', NULL, 69970, 'Headlight out and dashboard lights flicker.', 'IN_PROGRESS', 'Blown bulbs and faulty fuse. Repair wiring.', '2026-10-05 18:48:22', 'STANDARD', 6),
(80, 45, '2026-10-06 02:13:05', NULL, 20592, 'Clutch lever too loose, slipping.', 'IN_PROGRESS', 'Clutch plates worn. Replace set.', '2026-10-06 04:39:37', 'URGENT', 6),
(81, 40, '2026-10-06 12:28:59', NULL, 66026, 'Timing belt due for replacement per mileage.', 'AWAITING_DIAGNOSIS', NULL, NULL, 'URGENT', 6),
(82, 20, '2026-10-07 08:19:55', NULL, 34970, 'Routine maintenance due.', 'IN_PROGRESS', 'Routine service, no abnormalities found.', '2026-10-07 12:09:58', 'STANDARD', 6),
(83, 31, '2026-10-08 08:57:39', NULL, 66682, 'Rough idle and poor fuel economy.', 'PENDING_MECHANICS', 'Clogged fuel filter and air filter. Replace both.', '2026-10-08 12:06:02', 'STANDARD', 6),
(84, 18, '2026-10-09 08:13:22', NULL, 21428, 'Lights and horn not working.', 'PENDING_MECHANICS', 'Blown fuse and bulb. Repair wiring.', '2026-10-09 11:23:50', 'STANDARD', 6),
(85, 20, '2026-10-10 08:40:16', NULL, 38162, 'Engine makes knocking noise when accelerating.', 'PENDING_DIAGNOSIS', NULL, NULL, 'STANDARD', 6);

-- =====================================================================
-- REPAIR_ORDER_SERVICES
-- =====================================================================
INSERT INTO repair_order_services (order_service_id, order_id, service_catalog_id) VALUES
(3, 6, 20),
(4, 8, 13),
(5, 8, 16),
(6, 9, 8),
(7, 10, 2),
(8, 11, 11),
(9, 12, 14),
(10, 12, 7),
(11, 13, 2),
(12, 14, 20),
(13, 16, 11),
(14, 17, 10),
(15, 18, 11),
(16, 19, 14),
(17, 19, 6),
(18, 20, 16),
(19, 21, 19),
(20, 22, 12),
(21, 22, 13),
(22, 24, 15),
(23, 25, 4),
(24, 26, 11),
(25, 27, 19),
(26, 29, 11),
(27, 30, 5),
(28, 31, 4),
(29, 32, 10),
(30, 33, 11),
(31, 34, 5),
(32, 35, 2),
(33, 36, 20),
(34, 37, 16),
(35, 38, 16),
(36, 39, 10),
(37, 40, 15),
(38, 41, 20),
(39, 42, 5),
(40, 43, 8),
(41, 44, 14),
(42, 44, 6),
(43, 45, 2),
(44, 46, 5),
(45, 47, 15),
(46, 51, 17),
(47, 55, 5),
(48, 56, 12),
(49, 56, 13),
(50, 58, 4),
(51, 59, 15),
(52, 60, 15),
(53, 62, 17),
(54, 63, 11),
(55, 67, 15),
(56, 68, 12),
(57, 71, 5),
(58, 74, 2),
(59, 75, 9),
(60, 79, 15),
(61, 80, 17),
(62, 82, 2);

-- =====================================================================
-- REPAIR_ORDER_MECHANICS
-- =====================================================================
INSERT INTO repair_order_mechanics (assignment_id, order_id, mechanic_id, position_id, date_assigned) VALUES
(8, 6, 4, 1, '2026-08-28 15:52:51'),
(9, 6, 3, 2, '2026-08-28 18:58:05'),
(10, 7, 4, 1, '2026-08-29 02:38:46'),
(11, 8, 1, 1, '2026-08-29 10:24:58'),
(12, 8, 2, 2, '2026-08-29 12:25:52'),
(13, 9, 2, 1, '2026-08-30 08:56:02'),
(14, 9, 1, 2, '2026-08-30 11:41:59'),
(15, 10, 1, 1, '2026-08-30 16:27:29'),
(16, 10, 2, 2, '2026-08-30 19:10:44'),
(17, 11, 1, 1, '2026-08-31 02:20:46'),
(18, 11, 4, 2, '2026-08-31 06:10:40'),
(19, 12, 1, 1, '2026-08-31 10:28:31'),
(20, 12, 3, 2, '2026-08-31 13:26:34'),
(21, 13, 3, 1, '2026-09-01 09:04:09'),
(22, 13, 4, 2, '2026-09-01 11:18:09'),
(23, 14, 3, 1, '2026-09-01 16:58:30'),
(24, 14, 1, 2, '2026-09-01 20:19:37'),
(25, 15, 3, 1, '2026-09-02 02:28:47'),
(26, 16, 4, 1, '2026-09-02 11:12:14'),
(27, 16, 3, 2, '2026-09-02 12:57:12'),
(28, 17, 3, 1, '2026-09-02 18:26:58'),
(29, 17, 4, 2, '2026-09-02 21:24:13'),
(30, 18, 3, 1, '2026-09-03 02:10:16'),
(31, 18, 4, 2, '2026-09-03 03:59:39'),
(32, 19, 2, 1, '2026-09-03 13:28:17'),
(33, 19, 1, 2, '2026-09-03 15:00:21'),
(34, 20, 2, 1, '2026-09-04 08:21:59'),
(35, 20, 1, 2, '2026-09-04 11:24:09'),
(36, 21, 4, 1, '2026-09-04 17:20:24'),
(37, 21, 3, 2, '2026-09-04 19:38:38'),
(38, 22, 3, 1, '2026-09-05 09:07:45'),
(39, 22, 2, 2, '2026-09-05 12:27:50'),
(40, 23, 3, 1, '2026-09-05 17:44:21'),
(41, 24, 2, 1, '2026-09-06 05:14:13'),
(42, 24, 4, 2, '2026-09-06 07:24:37'),
(43, 24, 3, 3, '2026-09-06 07:56:37'),
(44, 25, 3, 1, '2026-09-06 11:28:26'),
(45, 25, 1, 2, '2026-09-06 14:14:03'),
(46, 26, 2, 1, '2026-09-07 08:48:13'),
(47, 26, 1, 2, '2026-09-07 12:23:37'),
(48, 27, 2, 1, '2026-09-07 15:04:07'),
(49, 27, 1, 2, '2026-09-07 18:16:16'),
(50, 28, 1, 1, '2026-09-08 08:29:41'),
(51, 29, 1, 1, '2026-09-08 17:58:52'),
(52, 29, 2, 2, '2026-09-08 20:18:56'),
(53, 30, 1, 1, '2026-09-09 01:45:59'),
(54, 30, 4, 2, '2026-09-09 03:41:22'),
(55, 31, 4, 1, '2026-09-09 11:11:22'),
(56, 31, 3, 2, '2026-09-09 13:45:07'),
(57, 32, 3, 1, '2026-09-10 09:03:10'),
(58, 32, 4, 2, '2026-09-10 12:11:02'),
(59, 33, 2, 1, '2026-09-10 15:52:54'),
(60, 33, 1, 2, '2026-09-10 17:55:29'),
(61, 34, 4, 1, '2026-09-11 03:50:17'),
(62, 34, 3, 2, '2026-09-11 06:32:15'),
(63, 35, 1, 1, '2026-09-11 12:39:17'),
(64, 35, 3, 2, '2026-09-11 15:32:20'),
(65, 36, 4, 1, '2026-09-12 08:57:10'),
(66, 36, 1, 2, '2026-09-12 11:33:05'),
(67, 37, 3, 1, '2026-09-13 08:41:50'),
(68, 37, 2, 2, '2026-09-13 12:27:13'),
(69, 38, 2, 1, '2026-09-13 17:03:14'),
(70, 38, 4, 2, '2026-09-13 19:56:29'),
(71, 39, 3, 1, '2026-09-14 04:36:19'),
(72, 39, 1, 2, '2026-09-14 06:08:07'),
(73, 40, 2, 1, '2026-09-14 16:25:20'),
(74, 40, 3, 2, '2026-09-14 18:34:28'),
(75, 40, 4, 3, '2026-09-14 18:56:28'),
(76, 41, 4, 1, '2026-09-15 04:10:00'),
(77, 41, 1, 2, '2026-09-15 07:31:35'),
(78, 42, 2, 1, '2026-09-15 14:04:23'),
(79, 42, 4, 2, '2026-09-15 16:37:34'),
(80, 43, 4, 1, '2026-09-16 02:35:17'),
(81, 43, 1, 2, '2026-09-16 04:50:13'),
(82, 44, 4, 1, '2026-09-16 15:08:09'),
(83, 44, 3, 2, '2026-09-16 17:44:27'),
(84, 45, 4, 1, '2026-09-17 08:57:31'),
(85, 45, 1, 2, '2026-09-17 10:11:59'),
(86, 46, 3, 1, '2026-09-17 16:49:00'),
(87, 46, 1, 2, '2026-09-17 18:07:31'),
(88, 47, 1, 1, '2026-09-18 04:19:42'),
(89, 47, 3, 2, '2026-09-18 06:50:33'),
(90, 47, 2, 3, '2026-09-18 07:25:33'),
(91, 49, 4, 1, '2026-09-19 05:08:57'),
(92, 50, 3, 1, '2026-09-19 13:02:41'),
(93, 51, 3, 1, '2026-09-20 08:43:26'),
(94, 51, 1, 2, '2026-09-20 11:21:48'),
(95, 54, 1, 1, '2026-09-22 02:13:07'),
(96, 55, 4, 1, '2026-09-22 13:22:14'),
(97, 55, 1, 2, '2026-09-22 16:45:00'),
(98, 56, 3, 1, '2026-09-23 09:14:04'),
(99, 56, 2, 2, '2026-09-23 11:16:06'),
(100, 58, 4, 1, '2026-09-24 01:58:38'),
(101, 58, 1, 2, '2026-09-24 03:37:02'),
(102, 59, 3, 1, '2026-09-24 11:58:37'),
(103, 59, 4, 2, '2026-09-24 14:23:56'),
(104, 59, 2, 3, '2026-09-24 14:44:56'),
(105, 60, 2, 1, '2026-09-25 08:56:42'),
(106, 60, 1, 2, '2026-09-25 11:37:50'),
(107, 60, 3, 3, '2026-09-25 11:55:50'),
(108, 61, 4, 1, '2026-09-25 16:02:00'),
(109, 62, 2, 1, '2026-09-26 00:37:10'),
(110, 62, 1, 2, '2026-09-26 03:26:53'),
(111, 63, 3, 1, '2026-09-26 08:24:12'),
(112, 63, 1, 2, '2026-09-26 10:20:22'),
(113, 65, 3, 1, '2026-09-27 15:56:17'),
(114, 66, 4, 1, '2026-09-28 09:20:07'),
(115, 67, 1, 1, '2026-09-29 09:03:18'),
(116, 67, 3, 2, '2026-09-29 11:21:39'),
(117, 67, 4, 3, '2026-09-29 11:38:39'),
(118, 68, 2, 1, '2026-09-29 15:59:16'),
(119, 68, 4, 2, '2026-09-29 18:32:14'),
(120, 71, 4, 1, '2026-10-01 02:02:01'),
(121, 71, 2, 2, '2026-10-01 03:56:31'),
(122, 72, 4, 1, '2026-10-01 16:19:01'),
(123, 73, 3, 1, '2026-10-02 08:46:57'),
(124, 74, 3, 1, '2026-10-02 15:51:23'),
(125, 74, 4, 2, '2026-10-02 18:39:28'),
(126, 75, 4, 1, '2026-10-03 05:41:02'),
(127, 75, 3, 2, '2026-10-03 07:39:36'),
(128, 76, 3, 1, '2026-10-03 13:11:32'),
(129, 77, 1, 1, '2026-10-04 09:02:11'),
(130, 78, 3, 1, '2026-10-05 09:25:22'),
(131, 79, 2, 1, '2026-10-05 16:18:13'),
(132, 79, 1, 2, '2026-10-05 19:06:22'),
(133, 79, 3, 3, '2026-10-05 19:22:22'),
(134, 80, 2, 1, '2026-10-06 02:51:05'),
(135, 80, 3, 2, '2026-10-06 04:49:37'),
(136, 81, 3, 1, '2026-10-06 12:48:59'),
(137, 82, 4, 1, '2026-10-07 08:59:55'),
(138, 82, 2, 2, '2026-10-07 12:39:58'),
(139, 83, 3, 1, '2026-10-08 09:30:39'),
(140, 84, 2, 1, '2026-10-09 08:21:22');

-- =====================================================================
-- REPAIR_ORDER_PARTS
-- =====================================================================
INSERT INTO repair_order_parts (order_part_id, order_id, part_id, batch_number, quantity_used, unit_price, status) VALUES
(4, 6, 32, 'BATCH-2026-05', 1, 350.00, 'ISSUED'),
(5, 7, 18, 'BATCH-2026-04', 1, 1400.00, 'CANCELLED'),
(6, 8, 23, 'BATCH-2026-04', 2, 2100.00, 'ISSUED'),
(7, 8, 24, 'BATCH-2026-04', 1, 750.00, 'ISSUED'),
(8, 9, 7, 'BATCH-2026-02', 4, 280.00, 'ISSUED'),
(9, 9, 21, 'BATCH-2026-04', 1, 520.00, 'ISSUED'),
(10, 10, 1, 'BATCH-2026-01', 4, 380.00, 'ISSUED'),
(11, 10, 9, 'BATCH-2026-03', 1, 250.00, 'ISSUED'),
(12, 10, 3, 'BATCH-2026-01', 1, 380.00, 'ISSUED'),
(13, 11, 14, 'BATCH-2026-03', 1, 2200.00, 'ISSUED'),
(14, 12, 22, 'BATCH-2026-04', 1, 420.00, 'ISSUED'),
(15, 12, 3, 'BATCH-2026-01', 1, 380.00, 'ISSUED'),
(16, 13, 1, 'BATCH-2026-01', 4, 380.00, 'ISSUED'),
(17, 13, 9, 'BATCH-2026-03', 1, 250.00, 'ISSUED'),
(18, 13, 3, 'BATCH-2026-01', 1, 380.00, 'ISSUED'),
(19, 14, 32, 'BATCH-2026-05', 1, 350.00, 'ISSUED'),
(20, 16, 14, 'BATCH-2026-03', 1, 2200.00, 'ISSUED'),
(21, 17, 6, 'BATCH-2026-01', 1, 650.00, 'ISSUED'),
(22, 18, 14, 'BATCH-2026-03', 1, 2200.00, 'ISSUED'),
(23, 19, 4, 'BATCH-2026-01', 1, 950.00, 'ISSUED'),
(24, 20, 23, 'BATCH-2026-04', 1, 2100.00, 'ISSUED'),
(25, 21, 15, 'BATCH-2026-03', 1, 900.00, 'ISSUED'),
(26, 22, 17, 'BATCH-2026-04', 2, 3200.00, 'ISSUED'),
(27, 23, 2, 'BATCH-2026-01', 1, 1200.00, 'CANCELLED'),
(28, 24, 20, 'BATCH-2026-04', 1, 180.00, 'ISSUED'),
(29, 24, 19, 'BATCH-2026-04', 1, 350.00, 'ISSUED'),
(30, 25, 2, 'BATCH-2026-01', 1, 1200.00, 'ISSUED'),
(31, 25, 10, 'BATCH-2026-03', 1, 320.00, 'ISSUED'),
(32, 26, 14, 'BATCH-2026-03', 1, 2200.00, 'ISSUED'),
(33, 27, 15, 'BATCH-2026-03', 1, 900.00, 'ISSUED'),
(34, 28, 18, 'BATCH-2026-04', 1, 1400.00, 'CANCELLED'),
(35, 29, 14, 'BATCH-2026-03', 1, 2200.00, 'ISSUED'),
(36, 30, 13, 'BATCH-2026-03', 1, 1500.00, 'ISSUED'),
(37, 31, 12, 'BATCH-2026-03', 1, 450.00, 'ISSUED'),
(38, 31, 10, 'BATCH-2026-03', 1, 320.00, 'ISSUED'),
(39, 32, 6, 'BATCH-2026-01', 1, 650.00, 'ISSUED'),
(40, 33, 14, 'BATCH-2026-03', 1, 2200.00, 'ISSUED'),
(41, 34, 13, 'BATCH-2026-03', 1, 1500.00, 'ISSUED'),
(42, 35, 29, 'BATCH-2026-05', 1, 420.00, 'ISSUED'),
(43, 35, 9, 'BATCH-2026-03', 1, 250.00, 'ISSUED'),
(44, 36, 32, 'BATCH-2026-05', 1, 350.00, 'ISSUED'),
(45, 37, 23, 'BATCH-2026-04', 1, 2100.00, 'ISSUED'),
(46, 38, 23, 'BATCH-2026-04', 1, 2100.00, 'ISSUED'),
(47, 39, 6, 'BATCH-2026-01', 1, 650.00, 'ISSUED'),
(48, 40, 19, 'BATCH-2026-04', 2, 350.00, 'ISSUED'),
(49, 40, 20, 'BATCH-2026-04', 1, 180.00, 'ISSUED'),
(50, 41, 32, 'BATCH-2026-05', 1, 350.00, 'ISSUED'),
(51, 42, 13, 'BATCH-2026-03', 1, 1500.00, 'ISSUED'),
(52, 43, 7, 'BATCH-2026-02', 4, 280.00, 'ISSUED'),
(53, 43, 21, 'BATCH-2026-04', 1, 520.00, 'ISSUED'),
(54, 44, 4, 'BATCH-2026-01', 1, 950.00, 'ISSUED'),
(55, 45, 1, 'BATCH-2026-01', 4, 380.00, 'ISSUED'),
(56, 45, 9, 'BATCH-2026-03', 1, 250.00, 'ISSUED'),
(57, 45, 3, 'BATCH-2026-01', 1, 380.00, 'ISSUED'),
(58, 46, 13, 'BATCH-2026-03', 1, 1500.00, 'ISSUED'),
(59, 47, 28, 'BATCH-2026-05', 1, 600.00, 'ISSUED'),
(60, 51, 16, 'BATCH-2026-04', 1, 2600.00, 'PENDING_PARTS'),
(61, 55, 5, 'BATCH-2026-02', 1, 3800.00, 'PENDING_PARTS'),
(62, 56, 17, 'BATCH-2026-04', 2, 3200.00, 'ISSUED'),
(63, 58, 2, 'BATCH-2026-01', 1, 1200.00, 'PENDING_PARTS'),
(64, 58, 10, 'BATCH-2026-03', 1, 320.00, 'ISSUED'),
(65, 59, 19, 'BATCH-2026-04', 2, 350.00, 'ISSUED'),
(66, 59, 20, 'BATCH-2026-04', 1, 180.00, 'ISSUED'),
(67, 60, 20, 'BATCH-2026-04', 1, 180.00, 'ISSUED'),
(68, 60, 19, 'BATCH-2026-04', 1, 350.00, 'ISSUED'),
(69, 62, 16, 'BATCH-2026-04', 1, 2600.00, 'PENDING_PARTS'),
(70, 63, 14, 'BATCH-2026-03', 1, 2200.00, 'ISSUED'),
(71, 67, 28, 'BATCH-2026-05', 1, 600.00, 'ISSUED'),
(72, 68, 18, 'BATCH-2026-04', 1, 1400.00, 'PENDING_PARTS'),
(73, 71, 13, 'BATCH-2026-03', 1, 1500.00, 'ISSUED'),
(74, 74, 1, 'BATCH-2026-01', 4, 380.00, 'PENDING_PARTS'),
(75, 74, 9, 'BATCH-2026-03', 1, 250.00, 'ISSUED'),
(76, 74, 3, 'BATCH-2026-01', 1, 380.00, 'ISSUED'),
(77, 75, 8, 'BATCH-2026-02', 1, 1850.00, 'ISSUED'),
(78, 75, 27, 'BATCH-2026-05', 1, 540.00, 'ISSUED'),
(79, 79, 19, 'BATCH-2026-04', 2, 350.00, 'ISSUED'),
(80, 80, 16, 'BATCH-2026-04', 1, 2600.00, 'ISSUED'),
(81, 82, 1, 'BATCH-2026-01', 4, 380.00, 'ISSUED'),
(82, 82, 3, 'BATCH-2026-01', 1, 380.00, 'ISSUED');

-- =====================================================================
-- MAINTENANCE_HISTORY
-- =====================================================================
INSERT INTO maintenance_history (history_id, order_id, service_date, service_summary, next_service_due_date, next_service_due_mileage) VALUES
(2, 12, '2026-08-31 21:12:48', 'Completed: Engine Diagnostics, Air Filter Replacement.', '2026-11-29', 71719),
(3, 13, '2026-09-01 18:02:32', 'Completed: Routine Maintenance Service.', '2026-11-30', 23278),
(4, 14, '2026-09-02 18:54:37', 'Completed: AC Repair.', '2026-12-01', 49527),
(5, 17, '2026-09-03 14:13:49', 'Completed: Wiper Blade Replacement.', '2026-12-02', 67876),
(6, 18, '2026-09-04 04:41:17', 'Completed: Chain and Sprocket Adjustment.', '2026-12-03', 15332),
(7, 22, '2026-09-06 06:56:39', 'Completed: Tire Replacement, Wheel Alignment.', '2026-12-05', 37621),
(8, 24, '2026-09-06 20:05:33', 'Completed: Electrical Wiring Repair.', '2026-12-05', 38737),
(9, 25, '2026-09-07 14:26:49', 'Completed: Brake Pad Replacement.', '2026-12-06', 78103),
(10, 26, '2026-09-07 20:12:43', 'Completed: Chain and Sprocket Adjustment.', '2026-12-06', 15472),
(11, 27, '2026-09-07 23:17:54', 'Completed: CVT Cleaning and Belt Service.', '2026-12-06', 14536),
(12, 30, '2026-09-09 22:30:26', 'Completed: Battery Replacement.', '2026-12-08', 33555),
(13, 31, '2026-09-09 20:27:19', 'Completed: Brake Pad Replacement.', '2026-12-08', 15598),
(14, 34, '2026-09-11 19:22:30', 'Completed: Battery Replacement.', '2026-12-10', 21607),
(15, 37, '2026-09-13 22:44:02', 'Completed: Suspension Overhaul.', '2026-12-12', 33826),
(16, 38, '2026-09-14 05:56:42', 'Completed: Suspension Overhaul.', '2026-12-13', 27802),
(17, 40, '2026-09-15 15:43:57', 'Completed: Electrical Wiring Repair.', '2026-12-14', 79757),
(18, 41, '2026-09-15 18:48:13', 'Completed: AC Repair.', '2026-12-14', 70543),
(19, 42, '2026-09-16 11:51:18', 'Completed: Battery Replacement.', '2026-12-15', 35721),
(20, 43, '2026-09-16 16:20:36', 'Completed: Coolant Flush.', '2026-12-15', 19435),
(21, 44, '2026-09-16 21:03:41', 'Completed: Engine Diagnostics, Spark Plug Replacement.', '2026-12-15', 64663),
(22, 45, '2026-09-18 02:04:33', 'Completed: Routine Maintenance Service.', '2026-12-17', 72238);

-- =====================================================================
-- INVOICES
-- =====================================================================
INSERT INTO invoices (invoice_id, order_id, invoice_date, labor_total, parts_total, discount, tax_amount, total_amount, payment_method, payment_reference, payment_date, status, issued_by, received_by) VALUES
(3, 6, '2026-08-29 05:37:18', 1500.00, 350.00, 200.00, 0.00, 1650.00, NULL, NULL, NULL, 'UNPAID', 6, NULL),
(4, 9, '2026-08-31 02:01:46', 600.00, 1640.00, 0.00, 0.00, 2240.00, NULL, NULL, NULL, 'UNPAID', 6, NULL),
(5, 10, '2026-08-31 20:42:42', 1000.00, 2150.00, 100.00, 0.00, 3050.00, 'BANK_TRANSFER', 'BT841218491', '2026-08-31 21:19:42', 'PAID', 6, 6),
(6, 11, '2026-08-31 09:31:57', 350.00, 2200.00, 200.00, 0.00, 2350.00, NULL, NULL, NULL, 'UNPAID', 6, NULL),
(7, 12, '2026-08-31 21:17:48', 1050.00, 800.00, 0.00, 0.00, 1850.00, 'GCASH', 'GC4600630513', '2026-08-31 22:42:48', 'PAID', 6, 6),
(8, 13, '2026-09-01 18:07:32', 1000.00, 2150.00, 0.00, 0.00, 3150.00, 'GCASH', 'GC9218363978', '2026-09-01 19:58:32', 'PAID', 6, 6),
(9, 14, '2026-09-02 18:59:37', 1500.00, 350.00, 200.00, 0.00, 1650.00, 'GCASH', 'GC2694684834', '2026-09-02 19:37:37', 'PAID', 6, 6),
(10, 16, '2026-09-02 22:56:13', 350.00, 2200.00, 250.00, 0.00, 2300.00, NULL, NULL, NULL, 'UNPAID', 6, NULL),
(11, 17, '2026-09-03 14:18:49', 150.00, 650.00, 100.00, 0.00, 700.00, 'CASH', NULL, '2026-09-03 15:51:49', 'PAID', 6, 6),
(12, 18, '2026-09-04 04:46:17', 350.00, 2200.00, 250.00, 0.00, 2300.00, 'CASH', NULL, '2026-09-04 06:15:17', 'PAID', 6, 6),
(13, 19, '2026-09-04 12:36:22', 1200.00, 950.00, 0.00, 0.00, 2150.00, NULL, NULL, NULL, 'UNPAID', 6, NULL),
(14, 20, '2026-09-04 17:26:02', 2200.00, 2100.00, 150.00, 0.00, 4150.00, 'CASH', NULL, '2026-09-04 18:46:02', 'PAID', 6, 6),
(15, 22, '2026-09-06 07:01:39', 1100.00, 6400.00, 250.00, 0.00, 7250.00, 'BANK_TRANSFER', 'BT178910051', '2026-09-06 09:01:39', 'PAID', 6, 6),
(16, 24, '2026-09-06 20:10:33', 1200.00, 530.00, 100.00, 0.00, 1630.00, 'GCASH', 'GC5095648684', '2026-09-06 21:42:33', 'PAID', 6, 6),
(17, 25, '2026-09-07 14:31:49', 800.00, 1520.00, 200.00, 0.00, 2120.00, 'CASH', NULL, '2026-09-07 15:12:49', 'PAID', 6, 6),
(18, 26, '2026-09-07 20:17:43', 350.00, 2200.00, 200.00, 0.00, 2350.00, 'CASH', NULL, '2026-09-07 21:39:43', 'PAID', 6, 6),
(19, 27, '2026-09-07 23:22:54', 900.00, 900.00, 0.00, 0.00, 1800.00, 'BANK_TRANSFER', 'BT550791704', '2026-09-08 00:25:54', 'PAID', 6, 6),
(20, 30, '2026-09-09 22:35:26', 300.00, 1500.00, 150.00, 0.00, 1650.00, 'CASH', NULL, '2026-09-09 23:30:26', 'PAID', 6, 6),
(21, 31, '2026-09-09 20:32:19', 800.00, 770.00, 250.00, 0.00, 1320.00, 'GCASH', 'GC5673482258', '2026-09-09 22:25:19', 'PAID', 6, 6),
(22, 34, '2026-09-11 19:27:30', 300.00, 1500.00, 100.00, 0.00, 1700.00, 'GCASH', 'GC3540128512', '2026-09-11 20:17:30', 'PAID', 6, 6),
(23, 35, '2026-09-12 11:07:03', 1000.00, 670.00, 0.00, 0.00, 1670.00, 'BANK_TRANSFER', 'BT969533218', '2026-09-12 12:25:03', 'PAID', 6, 6),
(24, 36, '2026-09-12 20:13:58', 1500.00, 350.00, 250.00, 0.00, 1600.00, NULL, NULL, NULL, 'UNPAID', 6, NULL),
(25, 37, '2026-09-13 22:49:02', 2200.00, 2100.00, 150.00, 0.00, 4150.00, 'CASH', NULL, '2026-09-14 00:05:02', 'PAID', 6, 6),
(26, 38, '2026-09-14 06:01:42', 2200.00, 2100.00, 200.00, 0.00, 4100.00, 'GCASH', 'GC4492602049', '2026-09-14 07:31:42', 'PAID', 6, 6),
(27, 39, '2026-09-14 12:37:57', 150.00, 650.00, 100.00, 0.00, 700.00, 'CASH', NULL, '2026-09-14 13:46:57', 'PAID', 6, 6),
(28, 40, '2026-09-15 15:48:57', 1200.00, 880.00, 0.00, 0.00, 2080.00, 'BANK_TRANSFER', 'BT146914391', '2026-09-15 16:45:57', 'PAID', 6, 6),
(29, 41, '2026-09-15 18:53:13', 1500.00, 350.00, 250.00, 0.00, 1600.00, 'BANK_TRANSFER', 'BT926178355', '2026-09-15 19:34:13', 'PAID', 6, 6),
(30, 42, '2026-09-16 11:56:18', 300.00, 1500.00, 0.00, 0.00, 1800.00, 'GCASH', 'GC5983503547', '2026-09-16 12:58:18', 'PAID', 6, 6),
(31, 43, '2026-09-16 16:25:36', 600.00, 1640.00, 0.00, 0.00, 2240.00, 'GCASH', 'GC4997866845', '2026-09-16 18:17:36', 'PAID', 6, 6),
(32, 44, '2026-09-16 21:08:41', 1200.00, 950.00, 0.00, 0.00, 2150.00, 'CASH', NULL, '2026-09-16 22:23:41', 'PAID', 6, 6),
(33, 45, '2026-09-18 02:09:33', 1000.00, 2150.00, 0.00, 0.00, 3150.00, 'GCASH', 'GC2843567009', '2026-09-18 03:32:33', 'PAID', 6, 6),
(34, 46, '2026-09-18 19:29:22', 300.00, 1500.00, 100.00, 0.00, 1700.00, NULL, NULL, NULL, 'UNPAID', 6, NULL),
(35, 47, '2026-09-18 13:42:10', 1200.00, 600.00, 250.00, 0.00, 1550.00, 'BANK_TRANSFER', 'BT778321204', '2026-09-18 14:10:10', 'PAID', 6, 6);
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

DROP PROCEDURE IF EXISTS sp_populate_dashboard_table //

CREATE PROCEDURE sp_populate_dashboard_table()
BEGIN
    SELECT 
        CONCAT('RO-', ro.order_id) AS order_id,
        CONCAT(c.first_name, ' ', c.last_name) AS customer,
        TRIM(CONCAT(v.manufacturer, ' ', v.model, ' ', IFNULL(v.year_model, ''))) AS vehicle,
        ro.status,
        -- Amount only applies from AWAITING_PAYMENT onward.
        -- Earlier stages (pending diagnosis -> ready to invoice) stay NULL.
        CASE
            WHEN ro.status IN ('AWAITING_PAYMENT', 'READY_FOR_RELEASE') THEN
                COALESCE(
                    i.total_amount,
                    NULLIF(IFNULL(sc_sum.labor_cost, 0) + IFNULL(parts_sum.parts_cost, 0), 0)
                )
            ELSE NULL
        END AS amount
    FROM repair_orders ro
    JOIN vehicles v ON ro.vehicle_id = v.vehicle_id
    JOIN customers c ON v.customer_id = c.customer_id
    LEFT JOIN invoices i ON ro.order_id = i.order_id
    LEFT JOIN (
        SELECT ros.order_id, SUM(sc.standard_labor_cost) AS labor_cost
        FROM repair_order_services ros
        JOIN service_catalog sc ON ros.service_catalog_id = sc.service_catalog_id
        GROUP BY ros.order_id
    ) sc_sum ON ro.order_id = sc_sum.order_id
    LEFT JOIN (
        SELECT order_id, SUM(unit_price * quantity_used) AS parts_cost
        FROM repair_order_parts
        WHERE status = 'ISSUED'
        GROUP BY order_id
    ) parts_sum ON ro.order_id = parts_sum.order_id
    WHERE ro.status NOT IN ('FULFILLED', 'CANCELLED')
    ORDER BY ro.date_received DESC	
    LIMIT 10;
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

DELIMITER //
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
        u.username,
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
        -- Search Filter (ID, formatted STF-001 ID, username, name, email, phone, role)
        (
            p_search IS NULL
            OR CAST(u.user_id AS CHAR) = p_search
            OR CONCAT('STF-', LPAD(u.user_id, 3, '0')) LIKE CONCAT('%', p_search, '%')
            OR u.username LIKE CONCAT('%', p_search, '%')
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

        -- Sort by Username
        CASE WHEN p_sort_by = 'username' AND p_sort_order = 'ASC' THEN u.username END ASC,
        CASE WHEN p_sort_by = 'username' AND p_sort_order = 'DESC' THEN u.username END DESC,

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


DROP PROCEDURE IF EXISTS sp_create_user;

DELIMITER $$

CREATE PROCEDURE sp_create_user(
    IN p_username      VARCHAR(50),
    IN p_password_hash VARCHAR(255),
    IN p_first_name    VARCHAR(75),
    IN p_middle_name   VARCHAR(75),
    IN p_last_name     VARCHAR(75),
    IN p_contact_no    VARCHAR(20),
    IN p_email         VARCHAR(100),
    IN p_role_id       INT
)
BEGIN
    DECLARE v_msg TEXT;
    DECLARE v_key VARCHAR(255);

    -- Duplicate on a UNIQUE column (username, email, contact_no).
    -- Only the part after "for key" is checked, so a value like "email_guy"
    -- can't be mistaken for the email column.
    DECLARE EXIT HANDLER FOR 1062
    BEGIN
        GET DIAGNOSTICS CONDITION 1 v_msg = MESSAGE_TEXT;
        SET v_key = SUBSTRING_INDEX(v_msg, 'for key', -1);
        ROLLBACK;

        IF v_key LIKE '%username%' THEN
            SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO = 1062, MESSAGE_TEXT = 'Username is already taken.';
        ELSEIF v_key LIKE '%email%' THEN
            SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO = 1062, MESSAGE_TEXT = 'Email is already registered.';
        ELSEIF v_key LIKE '%contact%' THEN
            SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO = 1062, MESSAGE_TEXT = 'Contact number is already in use.';
        ELSE
            SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO = 1062, MESSAGE_TEXT = 'Duplicate entry.';
        END IF;
    END;

    -- role_id doesn't exist
    DECLARE EXIT HANDLER FOR 1452
    BEGIN
        ROLLBACK;
        SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO = 1452, MESSAGE_TEXT = 'The selected role does not exist.';
    END;

    -- Value too long for a column
    DECLARE EXIT HANDLER FOR 1406
    BEGIN
        ROLLBACK;
        SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO = 1406, MESSAGE_TEXT = 'One of the fields is too long.';
    END;

    -- Anything else: rollback and re-raise the original error
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    -- Normalize input (blank -> NULL so UNIQUE columns don't collide on '')
    SET p_username    = TRIM(p_username);
    SET p_email       = NULLIF(TRIM(p_email), '');
    SET p_contact_no  = NULLIF(TRIM(p_contact_no), '');
    SET p_middle_name = NULLIF(TRIM(p_middle_name), '');

    -- Validation
    IF p_username IS NULL OR p_username = '' THEN
        SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO = 1644, MESSAGE_TEXT = 'Username is required.';
    END IF;

    IF p_email IS NOT NULL AND p_email NOT LIKE '_%@_%._%' THEN
        SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO = 1644, MESSAGE_TEXT = 'Email format is invalid.';
    END IF;

    START TRANSACTION;

    -- Friendly pre-checks (avoids burning an AUTO_INCREMENT id on a failed insert)
    IF EXISTS (SELECT 1 FROM users WHERE username = p_username) THEN
        SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO = 1062, MESSAGE_TEXT = 'Username is already taken.';
    END IF;

    IF p_email IS NOT NULL AND EXISTS (SELECT 1 FROM users WHERE email = p_email) THEN
        SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO = 1062, MESSAGE_TEXT = 'Email is already registered.';
    END IF;

    IF p_contact_no IS NOT NULL AND EXISTS (SELECT 1 FROM users WHERE contact_no = p_contact_no) THEN
        SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO = 1062, MESSAGE_TEXT = 'Contact number is already in use.';
    END IF;

    INSERT INTO users (username, password_hash, first_name, middle_name, last_name,
                       contact_no, email, role_id, status)
    VALUES (p_username, p_password_hash, p_first_name, p_middle_name, p_last_name,
            p_contact_no, p_email, p_role_id, 'ACTIVE');

    SELECT LAST_INSERT_ID() AS user_id;

    COMMIT;
END$$

DELIMITER ;


DROP PROCEDURE IF EXISTS sp_update_user;
USE VehicleRepair;

DROP PROCEDURE IF EXISTS sp_update_user;

DELIMITER $$

CREATE PROCEDURE sp_update_user(
    IN p_user_id     INT,
    IN p_username    VARCHAR(50),
    IN p_first_name  VARCHAR(75),
    IN p_middle_name VARCHAR(75),
    IN p_last_name   VARCHAR(75),
    IN p_contact_no  VARCHAR(20),
    IN p_email       VARCHAR(100),
    IN p_role_id     INT,
    IN p_status      VARCHAR(20)
)
BEGIN
    DECLARE v_msg         TEXT;
    DECLARE v_key         VARCHAR(255);
    DECLARE v_old_status  VARCHAR(20);
    DECLARE v_open_orders INT DEFAULT 0;

    -- Duplicate on a UNIQUE column (username, email, contact_no)
    DECLARE EXIT HANDLER FOR 1062
    BEGIN
        GET DIAGNOSTICS CONDITION 1 v_msg = MESSAGE_TEXT;
        SET v_key = SUBSTRING_INDEX(v_msg, 'for key', -1);
        ROLLBACK;

        IF v_key LIKE '%username%' THEN
            SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO = 1062, MESSAGE_TEXT = 'Username is already taken.';
        ELSEIF v_key LIKE '%email%' THEN
            SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO = 1062, MESSAGE_TEXT = 'Email is already registered.';
        ELSEIF v_key LIKE '%contact%' THEN
            SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO = 1062, MESSAGE_TEXT = 'Contact number is already in use.';
        ELSE
            SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO = 1062, MESSAGE_TEXT = 'Duplicate entry.';
        END IF;
    END;

    -- role_id doesn't exist
    DECLARE EXIT HANDLER FOR 1452
    BEGIN
        ROLLBACK;
        SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO = 1452, MESSAGE_TEXT = 'The selected role does not exist.';
    END;

    -- Value too long for a column
    DECLARE EXIT HANDLER FOR 1406
    BEGIN
        ROLLBACK;
        SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO = 1406, MESSAGE_TEXT = 'One of the fields is too long.';
    END;

    -- Anything else (including our own SIGNALs below): rollback and re-raise
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    -- Normalize input (blank -> NULL so UNIQUE columns don't collide on '')
    SET p_username    = TRIM(p_username);
    SET p_email       = NULLIF(TRIM(p_email), '');
    SET p_contact_no  = NULLIF(TRIM(p_contact_no), '');
    SET p_middle_name = NULLIF(TRIM(p_middle_name), '');
    SET p_status      = UPPER(TRIM(IFNULL(p_status, 'ACTIVE')));

    -- Validation
    IF p_username IS NULL OR p_username = '' THEN
        SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO = 1644, MESSAGE_TEXT = 'Username is required.';
    END IF;

    IF p_email IS NOT NULL AND p_email NOT LIKE '_%@_%._%' THEN
        SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO = 1644, MESSAGE_TEXT = 'Email format is invalid.';
    END IF;

    IF p_status NOT IN ('ACTIVE', 'INACTIVE') THEN
        SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO = 1644, MESSAGE_TEXT = 'Invalid user status.';
    END IF;

    START TRANSACTION;

    -- User must exist (also grabs the current status)
    SELECT status INTO v_old_status FROM users WHERE user_id = p_user_id;

    IF v_old_status IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO = 1032, MESSAGE_TEXT = 'User not found.';
    END IF;

    -- Block deactivation while the mechanic still has orders before READY_TO_INVOICE.
    -- Only checked when the status is actually changing to INACTIVE.
    IF p_status = 'INACTIVE' AND v_old_status <> 'INACTIVE' THEN
        SELECT COUNT(DISTINCT ro.order_id) INTO v_open_orders
        FROM mechanics m
        JOIN repair_order_mechanics rom ON rom.mechanic_id = m.mechanic_id
        JOIN repair_orders ro           ON ro.order_id     = rom.order_id
        WHERE m.user_id = p_user_id
          AND ro.status IN ('PENDING_DIAGNOSIS', 'AWAITING_DIAGNOSIS', 'PENDING_MECHANICS',
                            'IN_PROGRESS', 'AWAITING_PARTS');

        IF v_open_orders > 0 THEN
            SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO = 1644,
                MESSAGE_TEXT = 'Cannot deactivate: this mechanic still has active orders. Reassign or finish them first.';
        END IF;
    END IF;

    -- Friendly duplicate checks (ignore the user's own row)
    IF EXISTS (SELECT 1 FROM users WHERE username = p_username AND user_id <> p_user_id) THEN
        SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO = 1062, MESSAGE_TEXT = 'Username is already taken.';
    END IF;

    IF p_email IS NOT NULL AND EXISTS (SELECT 1 FROM users WHERE email = p_email AND user_id <> p_user_id) THEN
        SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO = 1062, MESSAGE_TEXT = 'Email is already registered.';
    END IF;

    IF p_contact_no IS NOT NULL AND EXISTS (SELECT 1 FROM users WHERE contact_no = p_contact_no AND user_id <> p_user_id) THEN
        SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO = 1062, MESSAGE_TEXT = 'Contact number is already in use.';
    END IF;

    UPDATE users
    SET username    = p_username,
        first_name  = p_first_name,
        middle_name = p_middle_name,
        last_name   = p_last_name,
        contact_no  = p_contact_no,
        email       = p_email,
        role_id     = p_role_id,
        status      = p_status
    WHERE user_id = p_user_id;

    -- If this user has a mechanic row, update its status too.
    IF p_status = 'INACTIVE' THEN
        UPDATE mechanics
        SET status = 'INACTIVE'
        WHERE user_id = p_user_id
          AND status <> 'INACTIVE';
    ELSE
        -- Reactivating: only bring back INACTIVE mechanics, ON_LEAVE stays untouched
        UPDATE mechanics
        SET status = 'ACTIVE'
        WHERE user_id = p_user_id
          AND status = 'INACTIVE';
    END IF;

    COMMIT;
END$$

DELIMITER ;


DROP PROCEDURE IF EXISTS sp_create_mechanic;

DELIMITER $$

CREATE PROCEDURE sp_create_mechanic(
    IN p_user_id        INT,
    IN p_specialization VARCHAR(100),
    IN p_date_hired     DATE,
    IN p_status         VARCHAR(20)
)
BEGIN
    -- Duplicate key (mechanics.user_id is UNIQUE)
    DECLARE EXIT HANDLER FOR 1062
    BEGIN
        ROLLBACK;
        SIGNAL SQLSTATE '45000'
            SET MYSQL_ERRNO = 1062,
                MESSAGE_TEXT = 'This user is already registered as a mechanic.';
    END;

    -- FK violation (user_id doesn't exist in users)
    DECLARE EXIT HANDLER FOR 1452
    BEGIN
        ROLLBACK;
        SIGNAL SQLSTATE '45000'
            SET MYSQL_ERRNO = 1452,
                MESSAGE_TEXT = 'The selected user does not exist.';
    END;

    -- Anything else: rollback and re-raise the original error as-is
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    -- Defaults / validation
    SET p_status = UPPER(TRIM(IFNULL(p_status, 'ACTIVE')));
    IF p_status NOT IN ('ACTIVE', 'ON_LEAVE', 'INACTIVE') THEN
        SIGNAL SQLSTATE '45000'
            SET MYSQL_ERRNO = 1644,
                MESSAGE_TEXT = 'Invalid mechanic status.';
    END IF;

    START TRANSACTION;

    INSERT INTO mechanics (user_id, specialization, date_hired, status)
    VALUES (p_user_id, p_specialization, p_date_hired, p_status);

    SELECT LAST_INSERT_ID() AS mechanic_id;

    COMMIT;
END$$

DELIMITER ;