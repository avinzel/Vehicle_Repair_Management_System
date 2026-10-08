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
		status          ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
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
	-- vehicle_types: which vehicle types the part fits (one or more).
	-- =====================================================================
	CREATE TABLE parts_inventory (
		part_id          INT PRIMARY KEY AUTO_INCREMENT,
		part_code        VARCHAR(30) NOT NULL UNIQUE,
		part_name        VARCHAR(150) NOT NULL,
		category         VARCHAR(50),
		vehicle_types    SET('CAR','MOTORCYCLE','TRICYCLE') NOT NULL
						 DEFAULT 'CAR,MOTORCYCLE,TRICYCLE',
		unit             VARCHAR(20) DEFAULT 'pc',
		unit_price       DECIMAL(10,2) NOT NULL,
		quantity_on_hand INT NOT NULL DEFAULT 0,
		reorder_level    INT DEFAULT 5,
		batch_number     VARCHAR(50) NOT NULL,
		date_added       DATETIME DEFAULT CURRENT_TIMESTAMP,
		status           ENUM('ACTIVE','INACTIVE','DISCONTINUED') NOT NULL DEFAULT 'ACTIVE',
		CONSTRAINT chk_parts_vehicle_types CHECK (vehicle_types <> '')
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
-- =====================================================================
-- SERVICE_CATALOG
-- =====================================================================
	CREATE TABLE service_catalog (
		service_catalog_id  INT PRIMARY KEY AUTO_INCREMENT,
		service_name        VARCHAR(150) NOT NULL UNIQUE,
		description         VARCHAR(255),
		standard_labor_cost DECIMAL(10,2) NOT NULL,
		status              ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE'
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
