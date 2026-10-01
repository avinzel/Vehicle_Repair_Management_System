<?php
    namespace App\Models; 

    use App\Config\Database;
    use Exception; 
    class Customer{
        private static $conn; 

        public function __construct()
        {
            self::$conn  = Database::getConnection();
        }
        
    public function  getCustomerRecordsByServiceProvider($search = null){
        try {
                $searchQuery = !empty($search) ? trim($search) : null;
                $query = "CALL sp_get_customer_directory(?)";

                $stmt = self::$conn->prepare($query);

                if (!$stmt) {
                    throw new Exception("Prepare failed: " . self::$conn->error);
                }

                $stmt->bind_param("s", $searchQuery);
                $stmt->execute();

                $result = $stmt->get_result();
                $customers = $result ? $result->fetch_all(MYSQLI_ASSOC) : [];
                $stmt->close();

                // Clear stored procedure result sets from MySQLi connection buffer
                while (self::$conn->more_results() && self::$conn->next_result()) {
                    if ($extraResult = self::$conn->use_result()) {
                        $extraResult->free();
                    }
                }

                return [
                    "success" => true,
                    "data" => $customers
                ];

            } catch (Exception $e) {
                return [
                    "success" => false,
                    "error" => "Database operation failed: " . $e->getMessage()
                ];
            }
        }
        public function getCustomerDetailsWithHistory($customerId) {
            try {
                $query = "CALL sp_GetCustomerDetailsWithHistory(?)";

                $stmt = self::$conn->prepare($query);

                if (!$stmt) {
                    throw new Exception("Prepare failed: " . self::$conn->error);
                }

                $stmt->bind_param("i", $customerId);
                $stmt->execute();

                $customerInfo = null;
                $vehicles = [];
                $repairHistory = [];

                // Retrieve Result Set 1: Customer Info
                $result1 = $stmt->get_result();
                if ($result1) {
                    $customerInfo = $result1->fetch_assoc() ?: null;
                    $result1->free();
                }

                // Move to Result Set 2: Registered Vehicles
                if ($stmt->next_result()) {
                    $result2 = $stmt->get_result();
                    if ($result2) {
                        $vehicles = $result2->fetch_all(MYSQLI_ASSOC);
                        $result2->free();
                    }
                }

                // Move to Result Set 3: Repair Order History
                if ($stmt->next_result()) {
                    $result3 = $stmt->get_result();
                    if ($result3) {
                        $repairHistory = $result3->fetch_all(MYSQLI_ASSOC);
                        $result3->free();
                    }
                }

                $stmt->close();

                // Clear remaining stored procedure result sets from MySQLi connection buffer
                while (self::$conn->more_results() && self::$conn->next_result()) {
                    if ($extraResult = self::$conn->use_result()) {
                        $extraResult->free();
                    }
                }

                if (!$customerInfo) {
                    return [
                        "success" => false,
                        "error" => "Customer not found"
                    ];
                }

                return [
                    "success" => true,
                    "data" => [
                        "customer" => $customerInfo,
                        "vehicles" => $vehicles,
                        "repair_history" => $repairHistory
                    ]
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