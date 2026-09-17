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


CREATE TABLE mechanics (
    mechanic_id     INT PRIMARY KEY AUTO_INCREMENT,
    user_id         INT NOT NULL UNIQUE,
    position_id     INT NOT NULL,
    specialization  VARCHAR(100),
    date_hired      DATE,
    status          ENUM('ACTIVE','ON_LEAVE','INACTIVE') DEFAULT 'ACTIVE',
    CONSTRAINT fk_mechanics_user     FOREIGN KEY (user_id)     REFERENCES users(user_id),
    CONSTRAINT fk_mechanics_position FOREIGN KEY (position_id) REFERENCES mechanic_positions(position_id)
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
-- Now just links WHICH mechanics worked WHICH order — position is no
-- longer stored here, since it's fixed on the mechanic. To see a
-- mechanic's position on an order, join through mechanics.position_id.
-- =====================================================================
CREATE TABLE repair_order_mechanics (
    assignment_id   INT PRIMARY KEY AUTO_INCREMENT,
    order_id        INT NOT NULL,
    mechanic_id     INT NOT NULL,
    date_assigned   DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_rom_order    FOREIGN KEY (order_id)    REFERENCES repair_orders(order_id),
    CONSTRAINT fk_rom_mechanic FOREIGN KEY (mechanic_id) REFERENCES mechanics(mechanic_id)
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
    USE VehicleRepair;


 
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
-- =====================================================================
-- ROLES & POSITIONS
-- =====================================================================
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
(1, 'mkay',       '$2y$12$L.5FB1jubPnhDH2rAGLEgerl8zDinIdj0KzBjUFQvckF4jfzyK2YG', 'Vinzel',    'Merona',   'Mandap',   '09493156781', 'vin@gmail.com',        3, 'ACTIVE', '2026-09-14 16:44:43'),
(4, 'lean',       '$2y$12$nQu26E7giBxGxMY7/b1K4.S0TcAHxbN4MKg4Ru.3Epn2x1vKSlkgC', 'Vinzel',    'Merona',   'Mandap',   '09493156781', 'vieeen@gmail.com',     3, 'ACTIVE', '2026-09-14 16:48:02'),
(5, 'kruu',       '$2y$12$lfqiNWlNLbvjiejTKD.VbO76nQFEqhuZb9CZTNnbM3tf/7E85EZ62', 'Vinzel',    'Merona',   'Mandap',   '09493156781', 'viee3435n@gmail.com', 3, 'ACTIVE', '2026-09-14 16:48:21'),
(6, 'vinzel',     '$2y$12$HAw./A6cusUN2DreFRvTKeWLTzoowIQADPRg1Iwt9qsTHNqm.wVfW', 'Vincent',   'Tubice',   'Mandap',   '09423456781', 'vinzel@gmail.com',     2, 'ACTIVE', '2026-09-06 15:52:16'),
(7, 'bananabeam', '$2y$12$Tu4T3taD14qPLjdlVUe40.E3xb.vE66opjqKzjOkLTkPOGH/Rt7Ce', 'Noel',      'Enseymada','Mercadal', '09423456781', 'bananabeam@gmail.com', 1, 'ACTIVE', '2026-09-06 15:53:07'),
(8, 'joleks',     '$2y$12$rQUt/5Asy2zEUIF13jcDI.NLTzeyOSnAc890RV/E030FIIHTVq8yS', 'John Aleks','Wasuo',    'Lumpay',   '09423156781', 'janelle@gmail.com',    3, 'ACTIVE', '2026-09-06 15:56:46');

-- =====================================================================
-- MECHANICS
-- position_id fixed per mechanic: 1=Diagnostician, 2=Lead Mechanic, 3=Electrical Specialist
-- =====================================================================
INSERT INTO mechanics (mechanic_id, user_id, position_id, specialization, date_hired, status) VALUES
(1, 1, 1, 'Engine Diagnostics', '2025-02-01', 'ACTIVE'), -- mkay = Diagnostician
(2, 4, 2, 'General Repair',     '2025-04-15', 'ACTIVE'), -- lean = Lead Mechanic
(3, 5, 3, 'Electrical Systems', '2025-06-10', 'ACTIVE'), -- kruu = Electrical Specialist
(4, 8, 2, 'General Repair',     '2025-01-15', 'ACTIVE'); -- joleks = Lead Mechanic

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
-- No position_id here anymore — position is derived via mechanics table.
-- mechanic_id: 1=mkay(Diagnostician), 2=lean(Lead), 3=kruu(Electrical), 4=joleks(Lead)
-- =====================================================================
INSERT INTO repair_order_mechanics (assignment_id, order_id, mechanic_id, date_assigned) VALUES
(1, 2, 1, '2026-08-26 10:30:00'), -- mkay diagnosing RO-2
(2, 3, 1, '2026-08-25 13:50:00'), -- mkay diagnosed RO-3
(3, 4, 1, '2026-08-24 15:00:00'), -- mkay diagnosed RO-4
(4, 4, 2, '2026-08-24 16:15:00'), -- lean leading repair on RO-4
(5, 4, 3, '2026-08-24 16:20:00'), -- kruu handling electrical on RO-4
(6, 5, 1, '2026-08-23 08:35:00'), -- mkay diagnosed RO-5
(7, 5, 4, '2026-08-23 09:05:00'); -- joleks led repair on RO-5

-- =====================================================================
-- REPAIR ORDER PARTS
-- =====================================================================
INSERT INTO repair_order_parts (order_part_id, order_id, part_id, batch_number, quantity_used, unit_price) VALUES
(1, 4, 5, 'BATCH-2026-02', 1, 3800.00), -- Car Battery on RO-4
(2, 5, 1, 'BATCH-2026-01', 3, 380.00),  -- Engine Oil on RO-5
(3, 5, 3, 'BATCH-2026-01', 1, 380.00);  -- Air Filter on RO-5

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

CREATE PROCEDURE get_all_mechanics()
BEGIN
    SELECT 
        m.mechanic_id,
        CONCAT(u.first_name, ' ', IFNULL(CONCAT(u.middle_name, ' '), ''), u.last_name) AS full_name,
        u.username,
        u.email,
        u.contact_no,
        r.role_name,
        mp.position_name,
        m.specialization,
        m.date_hired,
        m.status AS mechanic_status
    FROM mechanics m
    JOIN users u ON m.user_id = u.user_id
    JOIN roles r ON u.role_id = r.role_id
    JOIN mechanic_positions mp ON m.position_id = mp.position_id
    WHERE m.status = "ACTIVE";
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
    START TRANSACTION;

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
        INSERT INTO vehicles (customer_id, plate_number, vehicle_type, manufacturer, model, year_model, color, vin_number, current_mileage)
        VALUES (p_customer_id, p_plate_number, p_vehicle_type, p_manufacturer, p_model, p_year_model, p_color, p_vin_number, p_current_mileage);
        
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
    
    WHERE ro.status NOT IN ('FULFILLED', 'CANCELLED',"READY_TO_INVOICE", "READY_FOR_RELEASE" , "AWAITING_PAYMENT")
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

DELIMITER //

DROP PROCEDURE IF EXISTS sp_get_billing_and_invoicing //

CREATE PROCEDURE sp_get_billing_and_invoicing(
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
        CONCAT(v.manufacturer, ' ', v.model, ' ', IFNULL(v.year_model, ''), ' · ', DATE_FORMAT(ro.date_received, '%b %d, %Y')) AS vehicle_summary,
        ro.status,
        
        -- Currency formatted for UI
        CONCAT('₱', FORMAT(
            IFNULL(i.total_amount, 
                (IFNULL(sc_sum.labor_cost, 0) + IFNULL(parts_sum.parts_cost, 0))
            ), 0
        )) AS formatted_total_amount,

        -- Raw total for logic calculations
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

    -- Subquery for parts total using quantity_used
    LEFT JOIN (
        SELECT order_id, SUM(unit_price * quantity_used) AS parts_cost
        FROM repair_order_parts
        GROUP BY order_id
    ) parts_sum ON ro.order_id = parts_sum.order_id

    WHERE ro.status IN ('READY_TO_INVOICE', 'AWAITING_PAYMENT', 'FULFILLED', "READY_FOR_RELEASE")
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
        ro.diagnosis_notes,
        DATE_FORMAT(ro.diagnosis_completed_at, '%b %d, %Y %h:%i %p') AS formatted_diagnosis_date,
        CONCAT(c.first_name, ' ', c.last_name) AS customer_name,
        CONCAT(v.manufacturer, ' ', v.model, ' ', IFNULL(v.year_model, '')) AS vehicle_name,
        v.plate_number,
        v.vehicle_type,
 
        -- 1. Assigned Mechanics Array
        -- position now joined via mechanics.position_id (fixed per mechanic),
        -- not rom.position_id (which no longer exists on this table)
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
                    JOIN mechanic_positions mp ON m.position_id = mp.position_id
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
 
        -- 3. Itemized Parts Array
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

DELIMITER //

DROP PROCEDURE IF EXISTS sp_assign_diagnostician //

CREATE PROCEDURE sp_assign_diagnostician(
    IN p_order_id INT,
    IN p_mechanic_id INT,
    IN p_created_by INT
)
BEGIN
    DECLARE v_order_exists INT DEFAULT 0;
    DECLARE v_mechanic_exists INT DEFAULT 0;
    DECLARE v_is_diagnostician INT DEFAULT 0;

    -- Automatic rollback handler on SQL errors
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    -- 1. Check if repair order exists
    SELECT COUNT(*) INTO v_order_exists 
    FROM repair_orders 
    WHERE order_id = p_order_id;

    IF v_order_exists = 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Repair order not found.';
    END IF;

    -- 2. Check if mechanic exists and joined to their position role
    SELECT COUNT(*), 
           SUM(CASE WHEN LOWER(mp.position_name) LIKE '%diagnostician%' THEN 1 ELSE 0 END)
    INTO v_mechanic_exists, v_is_diagnostician
    FROM mechanics m
    INNER JOIN mechanic_positions mp ON m.position_id = mp.position_id
    WHERE m.mechanic_id = p_mechanic_id;

    IF v_mechanic_exists = 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Mechanic not found.';
    END IF;

    -- 3. Validate that the mechanic is a Diagnostician
    IF v_is_diagnostician = 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Selected mechanic is not authorized as a diagnostician.';
    END IF;

    -- 4. Update Repair Order status
    UPDATE repair_orders
    SET status = 'AWAITING_DIAGNOSIS'
    WHERE order_id = p_order_id;

    -- 5. Record assignment in repair_order_mechanics
    INSERT INTO repair_order_mechanics (order_id, mechanic_id, date_assigned)
    VALUES (p_order_id, p_mechanic_id, NOW());

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
    DECLARE v_service_exists INT DEFAULT 0;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    -- 1. Check if repair order exists
    SELECT COUNT(*) INTO v_order_exists 
    FROM repair_orders 
    WHERE order_id = p_order_id;

    IF v_order_exists = 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Repair order not found.';
    END IF;

    -- 2. Validate all provided service IDs before inserting
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

    -- 3. Update Repair Order details
    UPDATE repair_orders
    SET status = 'PENDING_MECHANICS',
        diagnosis_notes = p_diagnosis_notes,
        diagnosis_completed_at = NOW()
    WHERE order_id = p_order_id;

    -- 4. Insert valid services
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

GRANT EXECUTE ON PROCEDURE VehicleRepair.sp_correct_intake_details TO 'service_advisor'@'localhost';
