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
        public static function getAllParts($status = 'ALL', $search = '') {
            $query = "CALL sp_get_parts_inventory(?, ?)";

            try {
                $stmt = self::$conn->prepare($query);

                if (!$stmt) {
                    throw new Exception("Prepare failed: " . self::$conn->error);
                }

                $statusVal = empty($status) ? 'ALL' : $status;
                $searchVal = empty($search) ? '' : $search;

                $stmt->bind_param("ss", $statusVal, $searchVal);
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
                return [
                    "success" => false,
                    "error"   => "Error fetching parts: " . $e->getMessage()
                ];
            }    
        }
        /**
         * Fetches parts inventory with support for searching, stock level filtering, and dynamic sorting.
         * 
         * @param string|null $search      Search keyword (ID, Code, Name, Category)
         * @param string|null $stockLevel  Filter by 'LOW_STOCK', 'MODERATE', 'IN_STOCK', or 'ALL'
         * @param string      $sortBy      Field to sort by ('name', 'qty', 'cost', 'stock_level')
         * @param string      $sortOrder   Sort direction ('ASC' or 'DESC')
         * @return array
         */
public static function getPartsInventoryAdmin($search = null, $stockLevel = null, $sortBy = 'name', $sortOrder = 'ASC') {
            $query = "CALL sp_get_parts_inventory_admin(?, ?, ?, ?)";

            try {
                $stmt = self::$conn->prepare($query);

                if (!$stmt) {
                    throw new Exception("Prepare failed: " . self::$conn->error);
                }

                $searchVal     = empty($search) ? null : $search;
                $stockLevelVal = empty($stockLevel) ? null : $stockLevel;
                $sortByVal     = empty($sortBy) ? 'name' : $sortBy;
                $sortOrderVal  = strtoupper($sortOrder) === 'DESC' ? 'DESC' : 'ASC';

                $stmt->bind_param("ssss", $searchVal, $stockLevelVal, $sortByVal, $sortOrderVal);
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

                // Clear buffer for stored procedure execution
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
    }
?>