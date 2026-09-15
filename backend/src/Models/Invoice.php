<?php
    namespace App\Models;

    use App\Config\Database;
    use Exception;

    class Invoice {
        private static $conn;

        public function __construct()
        {
            self::$conn = Database::getConnection();
        }

        /**
         * Fetch orders awaiting billing or completed invoices
         * 
         * @param string|null $search
         * @return array
         */
        public function getBillingAndInvoicingRecords($search = null) {
            try {
                $searchQuery = !empty($search) ? trim($search) : null;
                $query = "CALL sp_get_billing_and_invoicing(?)";

                $stmt = self::$conn->prepare($query);

                if (!$stmt) {
                    throw new Exception("Prepare failed: " . self::$conn->error);
                }

                $stmt->bind_param("s", $searchQuery);
                $stmt->execute();

                $result = $stmt->get_result();
                $records = $result ? $result->fetch_all(MYSQLI_ASSOC) : [];
                $stmt->close();

                // Clear stored procedure buffer
                while (self::$conn->more_results() && self::$conn->next_result()) {
                    if ($extraResult = self::$conn->use_result()) {
                        $extraResult->free();
                    }
                }

                return [
                    "success" => true,
                    "data" => $records
                ];

            } catch (Exception $e) {
                return [
                    "success" => false,
                    "error" => "Database operation failed: " . $e->getMessage()
                ];
            }
        }
    }
?>