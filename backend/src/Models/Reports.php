<?php
    namespace App\Models;

    use App\Config\Database;
    use Exception;
    class Reports{
        private static $conn;
 
        public function __construct()
        {
            self::$conn = Database::getConnection();
        }

        public function getServiceAdvisorCards(){
            $query = "CALL sp_populate_dashboard_cards()"; 
            $stmt = self::$conn->prepare($query);
            $stmt->execute();
            $result = $stmt->get_result();
            return $result->fetch_all(MYSQLI_ASSOC);
        }

        public function getDashboardSummaryCards()
        {
            try {
                $query = "CALL sp_get_dashboard_summary_cards()";
                $stmt = self::$conn->prepare($query);

                if (!$stmt) {
                    throw new Exception("Prepare failed: " . self::$conn->error);
                }

                $stmt->execute();
                $result = $stmt->get_result();
                $data = $result ? $result->fetch_assoc() : null;
                $stmt->close();

                // Clear remaining stored procedure result sets from MySQLi connection buffer
                while (self::$conn->more_results() && self::$conn->next_result()) {
                    if ($extraResult = self::$conn->use_result()) {
                        $extraResult->free();
                    }
                }

                return [
                    "success" => true,
                    "data"    => $data
                ];

            } catch (Exception $e) {
                return [
                    "success" => false,
                    "error"   => "Database operation failed: " . $e->getMessage()
                ];
            }
        }
        public function getPipelineStatusCounts()
        {
            try {
                $query = "CALL sp_get_pipeline_status_counts()";
                $stmt = self::$conn->prepare($query);

                if (!$stmt) {
                    throw new Exception("Prepare failed: " . self::$conn->error);
                }

                $stmt->execute();
                $result = $stmt->get_result();
                $data = $result ? $result->fetch_assoc() : null;
                $stmt->close();

                // Clear connection buffer
                while (self::$conn->more_results() && self::$conn->next_result()) {
                    if ($extraResult = self::$conn->use_result()) {
                        $extraResult->free();
                    }
                }

                return [
                    "success" => true,
                    "data"    => $data
                ];

            } catch (Exception $e) {
                return [
                    "success" => false,
                    "error"   => "Database operation failed: " . $e->getMessage()
                ];
            }
        }
        public function getRecentRepairOrders($limit = 5)
        {
            try {
                $query = "CALL sp_get_recent_repair_orders(?)";
                $stmt = self::$conn->prepare($query);

                if (!$stmt) {
                    throw new Exception("Prepare failed: " . self::$conn->error);
                }

                $stmt->bind_param("i", $limit);
                $stmt->execute();
                $result = $stmt->get_result();
                $data = $result ? $result->fetch_all(MYSQLI_ASSOC) : [];
                $stmt->close();

                // Clear connection buffer for multi-query execution
                while (self::$conn->more_results() && self::$conn->next_result()) {
                    if ($extraResult = self::$conn->use_result()) {
                        $extraResult->free();
                    }
                }

                return [
                    "success" => true,
                    "data"    => $data
                ];

            } catch (Exception $e) {
                return [
                    "success" => false,
                    "error"   => "Database operation failed: " . $e->getMessage()
                ];
            }
        }
    }
?>