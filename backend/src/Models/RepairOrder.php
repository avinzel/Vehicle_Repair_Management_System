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

            // Extract & cast variables explicitly to prevent bind_param reference errors
            $firstName   = $data['first_name'] ?? null;
            $middleName  = $data['middle_name'] ?? null;
            $lastName    = $data['last_name'] ?? null;
            $phoneNumber = $data['phone_number'] ?? null;
            $email       = $data['email_address'] ?? null;
            $address     = $data['address'] ?? null;

            $plateNumber = $data['plate_number'] ?? null;
            $vehicleType = $data['vehicle_type'] ?? null;
            $makeBrand   = $data['make_brand'] ?? null;
            $model       = $data['model'] ?? null;
            $year        = isset($data['year']) ? (int)$data['year'] : null;
            $color       = $data['color'] ?? null;
            $vin         = $data['vin_number'] ?? null;
            $mileage     = (int)($data['current_mileage'] ?? 0);

            $complaint   = $data['complaint'] ?? null;
            $priority    = $data['priority'] ?? 'STANDARD';
            $userId      = (int)$createdByUserId;

            $stmt->bind_param(
                "sssssssssiississi",
                $firstName,
                $middleName,
                $lastName,
                $phoneNumber,
                $email,
                $address,
                $plateNumber,
                $vehicleType,
                $makeBrand,
                $model,
                $year,
                $color,
                $vin,
                $mileage,
                $complaint,
                $priority,
                $userId
            );

            if (!$stmt->execute()) {
                throw new Exception($stmt->error);
            }

            $stmt->close();

            // Clear stored procedure result sets/buffers
            while (self::$conn->more_results() && self::$conn->next_result()) {
                if ($extra = self::$conn->use_result()) { 
                    $extra->free(); 
                }
            }

            // Fetch output variables set by procedure
            $res = self::$conn->query("SELECT @order_id AS order_id, @customer_id AS customer_id, @vehicle_id AS vehicle_id");
            $output = $res->fetch_assoc();

            return [
                "success"     => true,
                "order_id"    => $output['order_id'] ?? null,
                "customer_id" => $output['customer_id'] ?? null,
                "vehicle_id"  => $output['vehicle_id'] ?? null
            ];

        } catch (Exception $e) {
            return [
                "success" => false,
                "error"   => "Intake processing failed: " . $e->getMessage()
            ];
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
 /**
     * Fetch complete repair order details, including diagnosis notes, mechanics, services, parts, and totals.
     * 
     * @param int $orderId
     * @return array
     */
        public function getRepairOrderDetails($orderId) {
            try {
                $query = "CALL sp_get_repair_order_details(?)";
                $stmt = self::$conn->prepare($query);

                if (!$stmt) {
                    throw new Exception("Prepare failed: " . self::$conn->error);
                }

                $stmt->bind_param("i", $orderId);
                $stmt->execute();

                $result = $stmt->get_result();
                $data = $result ? $result->fetch_assoc() : null;
                $stmt->close();

                // Clear remaining stored procedure execution buffers
                while (self::$conn->more_results() && self::$conn->next_result()) {
                    if ($extraResult = self::$conn->use_result()) {
                        $extraResult->free();
                    }
                }

                if (!$data) {
                    return [
                        "status"  => "error",
                        "message" => "Repair Order not found"
                    ];
                }

                // Handle optional diagnosis notes safely
                $data['diagnosis_notes']          = $data['diagnosis_notes'] ?? null;
                $data['formatted_diagnosis_date'] = $data['formatted_diagnosis_date'] ?? null;

                // Decode JSON array strings into native PHP arrays with array fallbacks []
                $data['assigned_mechanics'] = !empty($data['assigned_mechanics']) 
                    ? json_decode($data['assigned_mechanics'], true) 
                    : [];

                $data['services'] = !empty($data['services']) 
                    ? json_decode($data['services'], true) 
                    : [];

                $data['parts'] = !empty($data['parts']) 
                    ? json_decode($data['parts'], true) 
                    : [];

                // Cast financial metrics to floating-point numbers
                $data['total_labor_cost'] = (float)($data['total_labor_cost'] ?? 0.00);
                $data['total_parts_cost'] = (float)($data['total_parts_cost'] ?? 0.00);
                $data['grand_total']      = (float)($data['grand_total'] ?? 0.00);

                return [
                    "status" => "success",
                    "data"   => $data
                ];

            } catch (Exception $e) {
                return [
                    "status"  => "error",
                    "message" => "Database operation failed: " . $e->getMessage()
                ];
            }
        }
    }
?>