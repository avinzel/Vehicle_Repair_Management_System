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
    }
?>