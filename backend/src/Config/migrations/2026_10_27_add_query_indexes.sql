-- One-time migration for existing VehicleRepair databases.
-- These indexes are also defined in vehicle_repair_schema.sql and
-- vehicle_repair_schema-DDL.sql for newly created databases.
USE VehicleRepair;

ALTER TABLE repair_orders
    ADD INDEX idx_repair_orders_status_date_received (status, date_received);

ALTER TABLE repair_order_mechanics
    ADD INDEX idx_rom_order_mechanic (order_id, mechanic_id),
    ADD INDEX idx_rom_mechanic_order (mechanic_id, order_id),
    ADD INDEX idx_rom_order_position (order_id, position_id);

ALTER TABLE repair_order_parts
    ADD INDEX idx_rop_order_status (order_id, status),
    ADD INDEX idx_rop_status_part_order (status, part_id, order_id);

ALTER TABLE repair_order_services
    ADD INDEX idx_ros_order_catalog (order_id, service_catalog_id);
