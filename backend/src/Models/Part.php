<?php
    namespace App\Models; 

    use App\Config\Database; 
    use Exception;

    class Part {
        private static $conn; 

        public function __construct($conn = null)
        {
            self::$conn = $conn ?? Database::getConnection(); 
        }

        /**
         * Restocks a part quantity and automatically fulfills pending repair order parts via FIFO queue.
         * 
         * @param int $partId
         * @param int $restockQty
         * @return array
         */
        public static function restockAndFulfill($partId, $restockQty) {
            $query = "CALL sp_restock_and_fulfill_part(?, ?)";

            try {
                $stmt = self::$conn->prepare($query);

                if (!$stmt) {
                    throw new Exception("Prepare failed: " . self::$conn->error);
                }

                $partIdVal     = (int)$partId;
                $restockQtyVal = (int)$restockQty;

                $stmt->bind_param("ii", $partIdVal, $restockQtyVal);
                $stmt->execute();
                $stmt->close();

                // Clear multi-result set buffer to prevent "Commands out of sync" errors on subsequent calls
                while (self::$conn->more_results() && self::$conn->next_result()) {
                    if ($extraResult = self::$conn->use_result()) {
                        $extraResult->free();
                    }
                }

                return [
                    "success" => true,
                    "message" => "Part restocked and pending repair orders fulfilled successfully."
                ];
            } catch (Exception $e) {
                return [
                    "success" => false,
                    "error"   => "Error restocking part: " . $e->getMessage()
                ];
            }
        }
                /**
         * Fetches all inventory parts with optional status and search filtering.
         * 
         * @param string $status  Defaults to 'ALL'
         * @param string $search  Optional search keyword
         * @return array
         */
        public static function getAllParts($status = 'ALL', $search = '', $orderId = null) {
            $query = "CALL sp_get_parts_inventory(?, ?, ?)";
            $stmt = null;

            try {
                $stmt = self::$conn->prepare($query);

                if (!$stmt) {
                    throw new Exception("Prepare failed: " . self::$conn->error, self::$conn->errno);
                }

                $statusVal  = empty($status) ? 'ALL' : $status;
                $searchVal  = empty($search) ? '' : $search;
                $orderIdVal = ($orderId !== null && $orderId !== '') ? (int)$orderId : null;

                $stmt->bind_param("ssi", $statusVal, $searchVal, $orderIdVal);

                // PHP < 8.1 returns false instead of throwing
                if (!$stmt->execute()) {
                    throw new Exception($stmt->error, $stmt->errno);
                }

                $result = $stmt->get_result();
                $parts = [];

                if ($result) {
                    while ($row = $result->fetch_assoc()) {
                        $parts[] = $row;
                    }
                    $result->free();
                }

                $stmt->close();
                $stmt = null;

                // Clear buffer for stored procedure execution
                while (self::$conn->more_results() && self::$conn->next_result()) {
                    if ($extraResult = self::$conn->use_result()) {
                        $extraResult->free();
                    }
                }

                return [
                    "success" => true,
                    "data"    => $parts
                ];
            } catch (Exception $e) {
                if ($stmt) {
                    $stmt->close();
                }

                return [
                    "success" => false,
                    "code"    => (int)$e->getCode(),
                    "error"   => "Error fetching parts: " . $e->getMessage()
                ];
            }
        }
        public static function getPartsInventoryAdmin($search = null, $stockLevel = null, $vehicleType = null, $sortBy = 'name', $sortOrder = 'ASC') {
            $query = "CALL sp_get_parts_inventory_admin(?, ?, ?, ?, ?)";

            try {
                $stmt = self::$conn->prepare($query);

                if (!$stmt) {
                    throw new Exception("Prepare failed: " . self::$conn->error);
                }

                $searchVal      = empty($search) ? null : $search;
                $stockLevelVal  = empty($stockLevel) ? null : $stockLevel;
                $vehicleTypeVal = empty($vehicleType) ? null : $vehicleType;
                $sortByVal      = empty($sortBy) ? 'name' : $sortBy;
                $sortOrderVal   = strtoupper($sortOrder) === 'DESC' ? 'DESC' : 'ASC';

                $stmt->bind_param("sssss", $searchVal, $stockLevelVal, $vehicleTypeVal, $sortByVal, $sortOrderVal);
                $stmt->execute();

                $result = $stmt->get_result();
                $parts = [];

                if ($result) {
                    while ($row = $result->fetch_assoc()) {
                        $parts[] = $row;
                    }
                    $result->free();
                }

                $stmt->close();

                // Clear connection buffer for stored procedure execution
                while (self::$conn->more_results() && self::$conn->next_result()) {
                    if ($extraResult = self::$conn->use_result()) {
                        $extraResult->free();
                    }
                }

                // Calculate total items with quantity_on_hand between 0 and 5
                $lowStockCount = count(array_filter($parts, function ($part) {
                    $qty = (int)($part['quantity_on_hand'] ?? 0);
                    return $qty >= 0 && $qty <= 5;
                }));

                return [
                    "success"         => true,
                    "low_stock_count" => $lowStockCount,
                    "data"            => $parts
                ];

            } catch (Exception $e) {
                return [
                    "success" => false,
                    "error"   => "Error fetching parts inventory: " . $e->getMessage()
                ];
            }
        }

        public static function createPart(
            $partName,
            $unit,
            $quantity,
            $unitPrice,
            $partCode = null,
            $category = null,
            $vehicleTypes = 'CAR,MOTORCYCLE,TRICYCLE',
            $reorderLevel = 5,
            $batchNumber = null
        ) {
            $partCode = $partCode ?: ('AUTO-' . strtoupper(bin2hex(random_bytes(10))));
            $batchNumber = $batchNumber ?: ('BATCH-' . date('YmdHis') . strtoupper(bin2hex(random_bytes(4))));
            $stmt = null;

            try {
                self::$conn->begin_transaction();
                $stmt = self::$conn->prepare(
                    "SELECT part_id FROM parts_inventory
                     WHERE LOWER(TRIM(part_name)) = LOWER(TRIM(?))
                     LIMIT 1 FOR UPDATE"
                );
                if (!$stmt) {
                    throw new Exception("Prepare failed: " . self::$conn->error, self::$conn->errno);
                }
                $stmt->bind_param("s", $partName);
                $stmt->execute();
                $duplicate = $stmt->get_result()->num_rows > 0;
                $stmt->close();
                $stmt = null;
                if ($duplicate) {
                    throw new Exception("A part with this name already exists.", 1062);
                }

                $stmt = self::$conn->prepare(
                    "INSERT INTO parts_inventory
                        (part_code, part_name, category, vehicle_types, unit, unit_price,
                         quantity_on_hand, reorder_level, batch_number, status)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE')"
                );
                if (!$stmt) {
                    throw new Exception("Prepare failed: " . self::$conn->error, self::$conn->errno);
                }

                $stmt->bind_param(
                    "sssssdiis",
                    $partCode,
                    $partName,
                    $category,
                    $vehicleTypes,
                    $unit,
                    $unitPrice,
                    $quantity,
                    $reorderLevel,
                    $batchNumber
                );
                if (!$stmt->execute()) {
                    throw new Exception($stmt->error, $stmt->errno);
                }
                $partId = (int)$stmt->insert_id;
                $stmt->close();
                $stmt = null;

                self::$conn->commit();
                return ["success" => true, "part_id" => $partId];
            } catch (\Throwable $e) {
                if ($stmt) {
                    $stmt->close();
                }
                self::$conn->rollback();
                return ["success" => false, "code" => (int)$e->getCode(), "error" => $e->getMessage()];
            }
        }

        public static function updatePart($partId, $partName, $unit, $quantity, $unitPrice) {
            $stmt = null;
            try {
                self::$conn->begin_transaction();
                $stmt = self::$conn->prepare(
                    "SELECT part_id FROM parts_inventory
                     WHERE LOWER(TRIM(part_name)) = LOWER(TRIM(?))
                       AND part_id <> ?
                     LIMIT 1 FOR UPDATE"
                );
                if (!$stmt) {
                    throw new Exception("Prepare failed: " . self::$conn->error, self::$conn->errno);
                }
                $stmt->bind_param("si", $partName, $partId);
                $stmt->execute();
                $duplicate = $stmt->get_result()->num_rows > 0;
                $stmt->close();
                $stmt = null;
                if ($duplicate) {
                    throw new Exception("A part with this name already exists.", 1062);
                }

                $stmt = self::$conn->prepare(
                    "UPDATE parts_inventory
                     SET part_name = ?, unit = ?, quantity_on_hand = ?, unit_price = ?
                     WHERE part_id = ? AND status = 'ACTIVE'"
                );
                if (!$stmt) {
                    throw new Exception("Prepare failed: " . self::$conn->error, self::$conn->errno);
                }
                $stmt->bind_param("ssidi", $partName, $unit, $quantity, $unitPrice, $partId);
                if (!$stmt->execute()) {
                    throw new Exception($stmt->error, $stmt->errno);
                }
                $affectedRows = $stmt->affected_rows;
                $stmt->close();
                $stmt = null;

                if ($affectedRows === 0) {
                    $check = self::$conn->prepare(
                        "SELECT part_id FROM parts_inventory WHERE part_id = ? AND status = 'ACTIVE'"
                    );
                    if (!$check) {
                        throw new Exception("Prepare failed: " . self::$conn->error, self::$conn->errno);
                    }
                    $check->bind_param("i", $partId);
                    $check->execute();
                    $exists = $check->get_result()->num_rows > 0;
                    $check->close();
                    if (!$exists) {
                        self::$conn->rollback();
                        return ["success" => false, "not_found" => true];
                    }
                }
                self::$conn->commit();
                return ["success" => true];
            } catch (\Throwable $e) {
                if ($stmt) {
                    $stmt->close();
                }
                self::$conn->rollback();
                return ["success" => false, "code" => (int)$e->getCode(), "error" => $e->getMessage()];
            }
        }

        public static function softDeletePart($partId) {
            $stmt = null;
            try {
                self::$conn->begin_transaction();
                $stmt = self::$conn->prepare(
                    "SELECT part_id FROM parts_inventory WHERE part_id = ? AND status = 'ACTIVE' FOR UPDATE"
                );
                if (!$stmt) {
                    throw new Exception("Prepare failed: " . self::$conn->error, self::$conn->errno);
                }
                $stmt->bind_param("i", $partId);
                $stmt->execute();
                $partExists = $stmt->get_result()->num_rows > 0;
                $stmt->close();
                $stmt = null;
                if (!$partExists) {
                    self::$conn->rollback();
                    return 0;
                }

                $stmt = self::$conn->prepare(
                    "SELECT order_part_id FROM repair_order_parts
                     WHERE part_id = ? AND status IN ('PENDING', 'PENDING_PARTS')
                     LIMIT 1 FOR UPDATE"
                );
                if (!$stmt) {
                    throw new Exception("Prepare failed: " . self::$conn->error, self::$conn->errno);
                }
                $stmt->bind_param("i", $partId);
                $stmt->execute();
                $hasPendingOrderParts = $stmt->get_result()->num_rows > 0;
                $stmt->close();
                $stmt = null;
                if ($hasPendingOrderParts) {
                    throw new Exception(
                        "Cannot deactivate part: it is still associated with a pending repair order.",
                        1644
                    );
                }

                $stmt = self::$conn->prepare(
                    "UPDATE parts_inventory SET status = 'INACTIVE' WHERE part_id = ? AND status = 'ACTIVE'"
                );
                if (!$stmt) {
                    throw new Exception("Prepare failed: " . self::$conn->error, self::$conn->errno);
                }
                $stmt->bind_param("i", $partId);
                if (!$stmt->execute()) {
                    throw new Exception($stmt->error, $stmt->errno);
                }
                $affectedRows = $stmt->affected_rows;
                $stmt->close();
                $stmt = null;
                self::$conn->commit();
                return $affectedRows;
            } catch (\Throwable $e) {
                if ($stmt) {
                    $stmt->close();
                }
                self::$conn->rollback();
                return ["success" => false, "code" => (int)$e->getCode(), "error" => $e->getMessage()];
            }
        }
    }
?>