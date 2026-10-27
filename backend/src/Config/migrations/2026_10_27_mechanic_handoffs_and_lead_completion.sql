USE VehicleRepair;

CREATE TABLE IF NOT EXISTS repair_order_mechanic_handoffs (
    handoff_id              INT PRIMARY KEY AUTO_INCREMENT,
    assignment_id           INT NOT NULL,
    order_id                INT NOT NULL,
    mechanic_id             INT NOT NULL,
    position_id             INT NOT NULL,
    date_assigned           DATETIME NULL,
    replacement_mechanic_id INT NOT NULL,
    reassigned_by           INT NOT NULL,
    reassigned_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_romh_order (order_id, reassigned_at),
    CONSTRAINT fk_romh_assignment   FOREIGN KEY (assignment_id) REFERENCES repair_order_mechanics(assignment_id),
    CONSTRAINT fk_romh_order        FOREIGN KEY (order_id) REFERENCES repair_orders(order_id),
    CONSTRAINT fk_romh_mechanic     FOREIGN KEY (mechanic_id) REFERENCES mechanics(mechanic_id),
    CONSTRAINT fk_romh_position     FOREIGN KEY (position_id) REFERENCES mechanic_positions(position_id),
    CONSTRAINT fk_romh_replacement  FOREIGN KEY (replacement_mechanic_id) REFERENCES mechanics(mechanic_id),
    CONSTRAINT fk_romh_reassigned_by FOREIGN KEY (reassigned_by) REFERENCES users(user_id)
);

ALTER TABLE repair_order_mechanic_handoffs
    MODIFY date_assigned DATETIME NULL;

DROP PROCEDURE IF EXISTS sp_mark_ready_to_invoice;

DELIMITER $$

CREATE PROCEDURE sp_mark_ready_to_invoice(
    IN p_order_id INT,
    IN p_user_id INT
)
sp_lbl: BEGIN
    DECLARE v_pending_parts_count INT DEFAULT 0;
    DECLARE v_current_status VARCHAR(50);
    DECLARE v_is_active_lead INT DEFAULT 0;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;
    SELECT status INTO v_current_status
    FROM repair_orders
    WHERE order_id = p_order_id
    FOR UPDATE;

    IF v_current_status IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Repair order not found.';
    END IF;

    IF v_current_status IN (
        'PENDING_DIAGNOSIS', 'AWAITING_DIAGNOSIS', 'READY_TO_INVOICE',
        'AWAITING_PAYMENT', 'READY_FOR_RELEASE', 'FULFILLED', 'CANCELLED'
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Repair order has already passed the work stage or is cancelled.';
    END IF;

    SELECT COUNT(*) INTO v_is_active_lead
    FROM repair_order_mechanics rom
    JOIN mechanic_positions mp ON mp.position_id = rom.position_id
    JOIN mechanics m ON m.mechanic_id = rom.mechanic_id
    JOIN users u ON u.user_id = m.user_id
    WHERE rom.order_id = p_order_id
      AND u.user_id = p_user_id
      AND mp.position_name = 'Lead Mechanic'
      AND m.status = 'ACTIVE'
      AND u.status = 'ACTIVE';

    IF v_is_active_lead = 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MYSQL_ERRNO = 1645,
            MESSAGE_TEXT = 'Only the active Lead Mechanic assigned to this repair order can mark it ready to invoice.';
    END IF;

    SELECT COUNT(*) INTO v_pending_parts_count
    FROM repair_order_parts
    WHERE order_id = p_order_id AND status = 'PENDING_PARTS';

    IF v_pending_parts_count > 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Cannot mark as Ready to Invoice: There are still parts pending stock fulfillment.';
    END IF;

    UPDATE repair_orders
    SET status = 'READY_TO_INVOICE',
        date_completed = NOW()
    WHERE order_id = p_order_id;

    COMMIT;
END$$

DELIMITER ;

DROP PROCEDURE IF EXISTS sp_get_order_history;

DELIMITER $$

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
        COALESCE(
            GROUP_CONCAT(DISTINCT mechanic_names.full_name SEPARATOR ', '),
            'Unassigned'
        ) AS mechanics_list,
        COALESCE(i.total_amount, 0.00) AS raw_total_paid,
        CONCAT('₱', FORMAT(COALESCE(i.total_amount, 0.00), 2)) AS formatted_total_paid
    FROM repair_orders ro
    JOIN vehicles v ON ro.vehicle_id = v.vehicle_id
    JOIN customers c ON v.customer_id = c.customer_id
    LEFT JOIN invoices i ON ro.order_id = i.order_id
    LEFT JOIN (
        SELECT rom.order_id, CONCAT(u.first_name, ' ', u.last_name) AS full_name
        FROM repair_order_mechanics rom
        JOIN mechanics m ON m.mechanic_id = rom.mechanic_id
        JOIN users u ON u.user_id = m.user_id
        UNION
        SELECT romh.order_id, CONCAT(u.first_name, ' ', u.last_name) AS full_name
        FROM repair_order_mechanic_handoffs romh
        JOIN mechanics m ON m.mechanic_id = romh.mechanic_id
        JOIN users u ON u.user_id = m.user_id
    ) mechanic_names ON mechanic_names.order_id = ro.order_id
    WHERE ro.status = 'FULFILLED'
      AND (
          p_search IS NULL
          OR CONCAT('RO-', ro.order_id) LIKE CONCAT('%', p_search, '%')
          OR CONCAT(c.first_name, ' ', c.last_name) LIKE CONCAT('%', p_search, '%')
          OR v.manufacturer LIKE CONCAT('%', p_search, '%')
          OR v.model LIKE CONCAT('%', p_search, '%')
          OR v.plate_number LIKE CONCAT('%', p_search, '%')
          OR mechanic_names.full_name LIKE CONCAT('%', p_search, '%')
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
END$$

DELIMITER ;
