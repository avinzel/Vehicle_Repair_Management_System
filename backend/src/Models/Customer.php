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

        public function createCustomer(array $customer, array $vehicles) {
            self::$conn->begin_transaction();
            try {
                $customerId = $this->callProcedure(
                    "CALL sp_create_customer(?, ?, ?, ?, ?, ?)",
                    "ssssss",
                    [
                        $customer['first_name'],
                        $customer['middle_name'],
                        $customer['last_name'],
                        $customer['contact_no'],
                        $customer['email'],
                        $customer['address']
                    ],
                    true
                );

                foreach ($vehicles as $vehicle) {
                    $this->saveVehicle((int)$customerId, $vehicle, false);
                }

                self::$conn->commit();
                return (int)$customerId;
            } catch (\Throwable $e) {
                self::$conn->rollback();
                throw $e;
            }
        }

        public function updateCustomer(int $customerId, array $customer, array $vehicles) {
            self::$conn->begin_transaction();
            try {
                $stmt = self::$conn->prepare(
                    "SELECT status FROM customers WHERE customer_id = ? FOR UPDATE"
                );
                if (!$stmt) {
                    throw new Exception("Customer lookup prepare failed: " . self::$conn->error, self::$conn->errno);
                }
                $stmt->bind_param("i", $customerId);
                $stmt->execute();
                $result = $stmt->get_result();
                $customerRecord = $result ? $result->fetch_assoc() : null;
                if ($result) {
                    $result->free();
                }
                $stmt->close();

                if (!$customerRecord) {
                    throw new Exception("Customer not found.", 404);
                }
                if ($customerRecord['status'] !== 'ACTIVE') {
                    throw new Exception("Cannot update an inactive customer.", 409);
                }

                $this->callProcedure(
                    "CALL sp_update_customer(?, ?, ?, ?, ?, ?, ?)",
                    "issssss",
                    [
                        $customerId,
                        $customer['first_name'],
                        $customer['middle_name'],
                        $customer['last_name'],
                        $customer['contact_no'],
                        $customer['email'],
                        $customer['address']
                    ]
                );

                foreach ($vehicles as $vehicle) {
                    $this->saveVehicle($customerId, $vehicle, true);
                }

                self::$conn->commit();
                return $customerId;
            } catch (\Throwable $e) {
                self::$conn->rollback();
                throw $e;
            }
        }

        public function deactivateCustomer(int $customerId) {
            $this->callProcedure("CALL sp_deactivate_customer(?)", "i", [$customerId]);
            return true;
        }

        private function saveVehicle(int $customerId, array $vehicle, bool $update) {
            $parameters = [
                $customerId,
                $vehicle['plate_number'],
                $vehicle['vehicle_type'],
                $vehicle['manufacturer'],
                $vehicle['model'],
                $vehicle['year_model'],
                $vehicle['color'],
                $vehicle['vin_number'],
                $vehicle['current_mileage']
            ];

            if ($update && isset($vehicle['vehicle_id'])) {
                $stmt = self::$conn->prepare(
                    "SELECT vehicle_id FROM vehicles WHERE vehicle_id = ? AND customer_id = ? FOR UPDATE"
                );
                if (!$stmt) {
                    throw new Exception("Vehicle lookup prepare failed: " . self::$conn->error, self::$conn->errno);
                }
                $stmt->bind_param("ii", $vehicle['vehicle_id'], $customerId);
                $stmt->execute();
                $result = $stmt->get_result();
                $exists = $result && $result->num_rows > 0;
                if ($result) {
                    $result->free();
                }
                $stmt->close();
                if (!$exists) {
                    throw new Exception("Vehicle not found for this customer.", 404);
                }

                array_splice($parameters, 1, 0, [(int)$vehicle['vehicle_id']]);
                $this->callProcedure(
                    "CALL sp_update_customer_vehicle(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    "iisssssssi",
                    $parameters
                );
                return;
            }

            $this->callProcedure(
                "CALL sp_create_customer_vehicle(?, ?, ?, ?, ?, ?, ?, ?, ?)",
                "isssssssi",
                $parameters
            );
        }

        private function callProcedure(string $query, string $types, array $values, bool $fetchId = false) {
            $stmt = self::$conn->prepare($query);
            if (!$stmt) {
                throw new Exception("Stored procedure prepare failed: " . self::$conn->error, self::$conn->errno);
            }

            try {
                $references = [];
                foreach ($values as $index => $value) {
                    $references[$index] = &$values[$index];
                }
                if ($references && !call_user_func_array([$stmt, 'bind_param'], array_merge([$types], $references))) {
                    throw new Exception("Stored procedure parameter binding failed: " . $stmt->error, $stmt->errno);
                }
                if (!$stmt->execute()) {
                    throw new Exception("Stored procedure execution failed: " . $stmt->error, $stmt->errno);
                }

                $resultValue = null;
                if ($fetchId) {
                    $result = $stmt->get_result();
                    $row = $result ? $result->fetch_assoc() : null;
                    if ($result) {
                        $result->free();
                    }
                    $resultValue = $row['customer_id'] ?? null;
                    if (!$resultValue) {
                        throw new Exception("Customer creation did not return an identifier.");
                    }
                }

                while ($stmt->more_results()) {
                    if (!$stmt->next_result()) {
                        break;
                    }
                    if ($result = $stmt->get_result()) {
                        $result->free();
                    }
                }
                $stmt->close();
                $this->clearProcedureResults();
                return $resultValue;
            } catch (\Throwable $e) {
                $stmt->close();
                $this->clearProcedureResults();
                throw $e;
            }
        }

        private function clearProcedureResults() {
            while (self::$conn->more_results() && self::$conn->next_result()) {
                if ($result = self::$conn->use_result()) {
                    $result->free();
                }
            }
        }
    }    
?>