DELIMITER $$

DROP PROCEDURE IF EXISTS sp_get_dashboard_summary_cards$$

CREATE PROCEDURE sp_get_dashboard_summary_cards()
BEGIN
    SELECT
        IFNULL((SELECT SUM(total_amount) FROM invoices WHERE status = 'PAID'), 0.00) AS total_revenue,
        (SELECT COUNT(*) FROM invoices WHERE status = 'PAID') AS paid_invoice_count,
        (SELECT COUNT(*) FROM repair_orders WHERE status = 'FULFILLED') AS fulfilled_orders_count,
        (SELECT COUNT(*) FROM repair_orders
         WHERE status IN ('PENDING_DIAGNOSIS', 'AWAITING_DIAGNOSIS', 'PENDING_MECHANICS', 'IN_PROGRESS', 'AWAITING_PARTS', 'READY_TO_INVOICE', 'AWAITING_PAYMENT', 'READY_FOR_RELEASE')
        ) AS active_orders_count,
        (SELECT COUNT(*) FROM users WHERE status = 'ACTIVE') AS active_staff_count,
        (SELECT COUNT(*) FROM users) AS total_staff_count,
        (SELECT COUNT(*) FROM parts_inventory
         WHERE quantity_on_hand < 6 AND status = 'ACTIVE'
        ) AS low_stock_alerts_count,
        IFNULL((SELECT AVG(total_amount) FROM invoices WHERE status = 'PAID'), 0.00) AS avg_order_value,
        IFNULL((SELECT SUM(unit_price * quantity_on_hand) FROM parts_inventory WHERE status = 'ACTIVE'), 0.00) AS total_inventory_value,
        (SELECT COUNT(*) FROM parts_inventory
         WHERE status = 'ACTIVE' AND quantity_on_hand > 0
        ) AS total_part_skus,
        (SELECT COUNT(*) FROM parts_inventory
         WHERE quantity_on_hand BETWEEN 6 AND 20 AND status = 'ACTIVE'
        ) AS moderate_stock_count,
        (SELECT COUNT(*) FROM parts_inventory
         WHERE quantity_on_hand >= 21 AND status = 'ACTIVE'
        ) AS in_stock_count;
END$$

DROP PROCEDURE IF EXISTS sp_get_revenue_split$$

CREATE PROCEDURE sp_get_revenue_split()
BEGIN
    DECLARE v_labor_total DECIMAL(10,2) DEFAULT 0.00;
    DECLARE v_parts_total DECIMAL(10,2) DEFAULT 0.00;
    DECLARE v_unallocated_total DECIMAL(10,2) DEFAULT 0.00;
    DECLARE v_grand_total DECIMAL(10,2) DEFAULT 0.00;
    DECLARE v_labor_pct DECIMAL(5,2) DEFAULT 0.00;
    DECLARE v_parts_pct DECIMAL(5,2) DEFAULT 0.00;
    DECLARE v_unallocated_pct DECIMAL(5,2) DEFAULT 0.00;

    SELECT
        IFNULL(SUM(
            CASE
                WHEN labor_total + parts_total > 0
                THEN ROUND(total_amount * labor_total / (labor_total + parts_total), 2)
                ELSE 0.00
            END
        ), 0.00),
        IFNULL(SUM(
            CASE
                WHEN labor_total + parts_total > 0
                THEN total_amount - ROUND(total_amount * labor_total / (labor_total + parts_total), 2)
                ELSE 0.00
            END
        ), 0.00),
        IFNULL(SUM(
            CASE
                WHEN labor_total + parts_total <= 0 THEN total_amount
                ELSE 0.00
            END
        ), 0.00),
        IFNULL(SUM(total_amount), 0.00)
    INTO v_labor_total, v_parts_total, v_unallocated_total, v_grand_total
    FROM invoices
    WHERE status = 'PAID';

    IF v_grand_total > 0 THEN
        SET v_labor_pct = ROUND((v_labor_total / v_grand_total) * 100, 2);
        SET v_parts_pct = ROUND((v_parts_total / v_grand_total) * 100, 2);
        SET v_unallocated_pct = ROUND((v_unallocated_total / v_grand_total) * 100, 2);
    END IF;

    SELECT
        v_labor_total AS labor_total,
        v_labor_pct AS labor_percentage,
        v_parts_total AS parts_total,
        v_parts_pct AS parts_percentage,
        v_unallocated_total AS unallocated_total,
        v_unallocated_pct AS unallocated_percentage,
        v_grand_total AS total_revenue;
END$$

DELIMITER ;
