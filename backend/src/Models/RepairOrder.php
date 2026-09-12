<?php
    namespace App\Models;

    use App\Config\Database;
    use Exception;
    class RepairOrder{
        private static $conn;
 
        public function __construct()
        {
            self::$conn = Database::getConnection();
        }

        public function getServiceAdvisorTable() {
            try {
                $query = "CALL sp_populate_dashboard_table()"; 
                $stmt = self::$conn->prepare($query);

                if (!$stmt) {
                    throw new Exception("Prepare failed: " . self::$conn->error);
                }

                $stmt->execute();
                $result = $stmt->get_result();
                $tableData = $result ? $result->fetch_all(MYSQLI_ASSOC) : [];
                $stmt->close();

                // Clear stored procedure result sets from MySQLi connection buffer
                while (self::$conn->more_results() && self::$conn->next_result()) {
                    if ($extraResult = self::$conn->use_result()) {
                        $extraResult->free();
                    }
                }

                return $tableData;

            } catch (Exception $e) {
                return ["error" => "Database operation failed: " . $e->getMessage()];
            }
        }

        public function processIntake($data, $createdByUserId) {
            try {
                $query = "CALL sp_create_vehicle_intake(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, @order_id, @customer_id, @vehicle_id)";
                $stmt = self::$conn->prepare($query);

                if (!$stmt) {
                    throw new Exception("Prepare failed: " . self::$conn->error);
                }

                // Handle optional values gracefully
                $middleName = $data['middle_name'] ?? null;
                $address    = $data['address'] ?? null;
                $vin        = $data['vin_number'] ?? null;
                $mileage    = (int)($data['current_mileage'] ?? 0);
                $priority   = $data['priority'] ?? 'STANDARD';

                $stmt->bind_param(
                    "sssssssssiississi",
                    $data['first_name'],
                    $middleName,
                    $data['last_name'],
                    $data['phone_number'],
                    $data['email_address'],
                    $address,
                    $data['plate_number'],
                    $data['vehicle_type'], // 'CAR', 'MOTORCYCLE', or 'TRICYCLE'
                    $data['make_brand'],
                    $data['model'],
                    $data['year'],
                    $data['color'],
                    $vin,
                    $mileage,
                    $data['complaint'],
                    $priority,
                    $createdByUserId
                );

                $stmt->execute();
                $stmt->close();

                // Clear stored procedure buffers
                while (self::$conn->more_results() && self::$conn->next_result()) {
                    if ($extra = self::$conn->use_result()) { $extra->free(); }
                }

                // Retrieve output IDs from MySQL variables
                $res = self::$conn->query("SELECT @order_id AS order_id, @customer_id AS customer_id, @vehicle_id AS vehicle_id");
                $output = $res->fetch_assoc();

                return [
                    "success" => true,
                    "order_id" => $output['order_id'],
                    "customer_id" => $output['customer_id'],
                    "vehicle_id" => $output['vehicle_id']
                ];

            } catch (Exception $e) {
                return ["error" => "Intake processing failed: " . $e->getMessage()];
            }
        }
       public function getActiveRepairOrders($status = 'ALL', $search = '') {
            try {
                $filterStatus = !empty($status) ? $status : 'ALL';
                $searchQuery  = !empty($search) ? trim($search) : null;

                $query = "CALL sp_get_active_repair_orders(?, ?)"; 
                
                $stmt = self::$conn->prepare($query);

                if (!$stmt) {
                    throw new Exception("Prepare failed: " . self::$conn->error);
                }

                $stmt->bind_param("ss", $filterStatus, $searchQuery);
                $stmt->execute();
                
                $result = $stmt->get_result();
                $orders = $result ? $result->fetch_all(MYSQLI_ASSOC) : [];
                $stmt->close();

                // Clear stored procedure result sets from MySQLi connection buffer
                while (self::$conn->more_results() && self::$conn->next_result()) {
                    if ($extraResult = self::$conn->use_result()) {
                        $extraResult->free();
                    }
                }

                return [
                    "success" => true,
                    "data" => $orders
                ];

            } catch (Exception $e) {
                return ["error" => "Database operation failed: " . $e->getMessage()];
            }
        }
        
        // Fetch fulfilled/completed repair order history 
        public function getOrderHistory($search = null) {
            try {
                $searchQuery = !empty($search) ? trim($search) : null;
                $query = "CALL sp_get_order_history(?)";

                $stmt = self::$conn->prepare($query);

                if (!$stmt) {
                    throw new Exception("Prepare failed: " . self::$conn->error);
                }

                $stmt->bind_param("s", $searchQuery);
                $stmt->execute();

                $result = $stmt->get_result();
                $history = $result ? $result->fetch_all(MYSQLI_ASSOC) : [];
                $stmt->close();

                // Clear stored procedure result sets from connection buffer
                while (self::$conn->more_results() && self::$conn->next_result()) {
                    if ($extraResult = self::$conn->use_result()) {
                        $extraResult->free();
                    }
                }

                return [
                    "success" => true,
                    "data" => $history
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