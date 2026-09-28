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
                "ssssssssssississi",
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
        public function assignDiagnostician($orderId, $mechanicId, $createdByUserId) {
            try {
                $query = "CALL sp_assign_diagnostician(?, ?, ?)";
                $stmt = self::$conn->prepare($query);

                if (!$stmt) {
                    throw new Exception("Prepare failed: " . self::$conn->error);
                }

                $orderIdVal    = (int)$orderId;
                $mechanicIdVal = (int)$mechanicId;
                $userIdVal     = (int)$createdByUserId;

                $stmt->bind_param("iii", $orderIdVal, $mechanicIdVal, $userIdVal);

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

                return ["success" => true];

            } catch (Exception $e) {
                return [
                    "success" => false,
                    "error"   => "Failed to assign diagnostician: " . $e->getMessage()
                ];
            }
        }

        public function submitDiagnosis($orderId, $notes, $serviceIds, $createdByUserId) {
            try {
                $query = "CALL sp_submit_diagnosis(?, ?, ?, ?)";
                $stmt = self::$conn->prepare($query);

                if (!$stmt) {
                    throw new Exception("Prepare failed: " . self::$conn->error);
                }

                $orderIdVal   = (int)$orderId;
                $notesVal     = trim($notes);
                $servicesJson = json_encode(array_map('intval', (array)$serviceIds));
                $userIdVal    = (int)$createdByUserId;

                $stmt->bind_param("issi", $orderIdVal, $notesVal, $servicesJson, $userIdVal);

                if (!$stmt->execute()) {
                    throw new Exception($stmt->error);
                }

                $stmt->close();

                while (self::$conn->more_results() && self::$conn->next_result()) {
                    if ($extra = self::$conn->use_result()) {
                        $extra->free();
                    }
                }

                return ["success" => true];

            } catch (Exception $e) {
                return [
                    "success" => false,
                    "error"   => "Failed to submit diagnosis: " . $e->getMessage()
                ];
            }
        }
        public function assignMechanic($orderId, $mechanicId, $positionId, $createdByUserId) {
            try {
                $query = "CALL sp_assign_mechanic(?, ?, ?, ?)";
                $stmt = self::$conn->prepare($query);

                if (!$stmt) {
                    throw new Exception("Prepare failed: " . self::$conn->error);
                }

                $orderIdVal    = (int)$orderId;
                $mechanicIdVal = (int)$mechanicId;
                $positionIdVal = (int)$positionId;
                $userIdVal     = (int)$createdByUserId;

                $stmt->bind_param("iiii", $orderIdVal, $mechanicIdVal, $positionIdVal, $userIdVal);

                if (!$stmt->execute()) {
                    throw new Exception($stmt->error);
                }

                $stmt->close();

                // Clear stored procedure result sets/buffers from MySQLi connection
                while (self::$conn->more_results() && self::$conn->next_result()) {
                    if ($extra = self::$conn->use_result()) {
                        $extra->free();
                    }
                }

                return ["success" => true];

            } catch (Exception $e) {
                return [
                    "success" => false,
                    "error"   => "Failed to assign mechanic: " . $e->getMessage()
                ];
            }
        }
        // POST: Log part to repair order (updates order status to AWAITING_PARTS if stock is insufficient)
        public static function logPart($orderId, $partId, $quantity) {
            $query = "CALL sp_log_repair_order_part(?, ?, ?)";

            try {
                $stmt = self::$conn->prepare($query);

                if (!$stmt) {
                    throw new Exception("Prepare failed: " . self::$conn->error);
                }

                $orderIdVal = (int)$orderId;
                $partIdVal  = (int)$partId;
                $qtyVal     = (int)$quantity;

                $stmt->bind_param("iii", $orderIdVal, $partIdVal, $qtyVal);
                $stmt->execute();
                $stmt->close();

                // Clear stored procedure multi-result set buffer to prevent out of sync errors
                while (self::$conn->more_results() && self::$conn->next_result()) {
                    if ($extraResult = self::$conn->use_result()) {
                        $extraResult->free();
                    }
                }

                return [
                    "success" => true,
                    "message" => "Part processed successfully."
                ];
            } catch (\Exception $e) {
                return [
                    "success" => false,
                    "error"   => "Error logging part: " . $e->getMessage()
                ];
            }
        }
        public function getPartsByRepairOrder($orderId) {
            try {
                $query = "CALL sp_get_parts_by_repair_order(?)";
                $stmt = self::$conn->prepare($query);

                if (!$stmt) {
                    throw new Exception("Prepare failed: " . self::$conn->error);
                }

                $orderIdVal = (int)$orderId;
                $stmt->bind_param("i", $orderIdVal);
                $stmt->execute();

                $result = $stmt->get_result();
                $parts = $result ? $result->fetch_all(MYSQLI_ASSOC) : [];
                $stmt->close();

                // Clear stored procedure result sets from connection buffer
                while (self::$conn->more_results() && self::$conn->next_result()) {
                    if ($extraResult = self::$conn->use_result()) {
                        $extraResult->free();
                    }
                }

                // Dynamically sum the 'subtotal' column across all returned part items
                $totalPartsCost = array_sum(array_column($parts, 'subtotal'));

                return [
                    "success"          => true,
                    "total_parts_cost" => (float)$totalPartsCost,
                    "data"             => $parts
                ];

            } catch (Exception $e) {
                return [
                    "success" => false,
                    "error"   => "Database operation failed: " . $e->getMessage()
                ];
            }
        }
            /**
         * Mark a repair order as READY_TO_INVOICE (executed by Lead Mechanic)
         * 
         * @param int $orderId
         * @param int $createdByUserId
         * @return array
         */
        public function markReadyToInvoice($orderId, $createdByUserId) {
            try {
                $query = "CALL sp_mark_ready_to_invoice(?, ?)";
                $stmt = self::$conn->prepare($query);

                if (!$stmt) {
                    throw new Exception("Prepare failed: " . self::$conn->error);
                }

                $orderIdVal = (int)$orderId;
                $userIdVal  = (int)$createdByUserId;

                $stmt->bind_param("ii", $orderIdVal, $userIdVal);

                if (!$stmt->execute()) {
                    throw new Exception($stmt->error);
                }

                $stmt->close();

                // Clear stored procedure result sets from connection buffer
                while (self::$conn->more_results() && self::$conn->next_result()) {
                    if ($extraResult = self::$conn->use_result()) {
                        $extraResult->free();
                    }
                }

                return [
                    "success" => true,
                    "message" => "Repair order successfully marked as READY_TO_INVOICE."
                ];

            } catch (Exception $e) {
                return [
                    "success" => false,
                    "error"   => "Failed to mark ready to invoice: " . $e->getMessage()
                ];
            }
        }
        public function cancelRepairOrderPart($orderPartId) {
            try {
                $query = "CALL sp_cancel_repair_order_part(?)";
                $stmt = self::$conn->prepare($query);

                if (!$stmt) {
                    throw new Exception("Prepare failed: " . self::$conn->error);
                }

                $orderPartIdVal = (int)$orderPartId;

                $stmt->bind_param("i", $orderPartIdVal);

                if (!$stmt->execute()) {
                    throw new Exception($stmt->error);
                }

                $stmt->close();

                // Clear stored procedure result sets from connection buffer
                while (self::$conn->more_results() && self::$conn->next_result()) {
                    if ($extraResult = self::$conn->use_result()) {
                        $extraResult->free();
                    }
                }

                return [
                    "success" => true,
                    "message" => "Repair order part successfully cancelled and inventory stock restored."
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