<?php
    namespace App\Controllers;

    use App\Models\Part;
    use App\Auth\Auth; 

    class PartController {
        private static $model; 

        public function __construct($model = null)
        {
            self::$model = $model ?? new Part(); 
        }

        // Helper method to parse input stream safely
        private function getInputData() {
            $input = json_decode(file_get_contents('php://input'), true);
            return $input ?? [];
        }

        /**
         * Restock inventory part and trigger backorder fulfillment
         */
        public function restockPart() {
            // 2. Parse payload using helper method
            $input = $this->getInputData();

            $partId   = $input['part_id'] ?? null;
            $quantity = $input['quantity'] ?? null;

            // 3. Input Validation
            if (empty($partId) || !is_numeric($partId) || (int)$partId <= 0) {
                http_response_code(400);
                echo json_encode([
                    "status" => "error",
                    "error"  => "Valid part_id is required."
                ]);
                return;
            }

            if (empty($quantity) || !is_numeric($quantity) || (int)$quantity <= 0) {
                http_response_code(400);
                echo json_encode([
                    "status" => "error",
                    "error"  => "Restock quantity must be a positive integer greater than zero."
                ]);
                return;
            }

            // 4. Call Model to execute the restocking stored procedure
            $result = self::$model::restockAndFulfill((int)$partId, (int)$quantity);

            // 5. Send JSON Response
            if ($result['success']) {
                http_response_code(200);
                echo json_encode([
                    "status"  => "success",
                    "message" => $result['message']
                ]);
            } else {
                http_response_code(400);
                echo json_encode([
                    "status" => "error",
                    "error"  => $result['error']
                ]);
            }
        }

        public function createPart() {
            header('Content-Type: application/json');
            $input = $this->getInputData();
            $validated = $this->validatePartInput($input);

            if (isset($validated['error'])) {
                http_response_code(400);
                echo json_encode(["status" => "error", "error" => $validated['error']]);
                return;
            }

            $result = Part::createPart(
                $validated['part_name'],
                $validated['unit'],
                $validated['quantity_on_hand'],
                $validated['unit_price'],
                $validated['part_code'],
                $validated['category'],
                $validated['vehicle_types'],
                $validated['reorder_level'],
                $validated['batch_number']
            );

            if ($result['success']) {
                http_response_code(201);
                echo json_encode([
                    "status" => "success",
                    "message" => "Part created successfully",
                    "part_id" => $result['part_id']
                ]);
                return;
            }

            if (($result['code'] ?? 0) === 1062
                && ($result['error'] ?? '') === "A part with this name already exists.") {
                http_response_code(409);
                echo json_encode(["status" => "error", "error" => "A part with this name already exists."]);
                return;
            }
            if (($result['code'] ?? 0) === 1062) {
                http_response_code(409);
                echo json_encode(["status" => "error", "error" => "Part code already exists"]);
                return;
            }
            error_log($result['error'] ?? 'Part creation failed');
            http_response_code(500);
            echo json_encode(["status" => "error", "error" => "Failed to create part"]);
        }

        public function updatePart() {
            header('Content-Type: application/json');
            $input = $this->getInputData();
            $partId = $input['part_id'] ?? null;
            if (filter_var($partId, FILTER_VALIDATE_INT) === false || (int)$partId <= 0) {
                http_response_code(400);
                echo json_encode(["status" => "error", "error" => "A valid part_id is required"]);
                return;
            }

            $validated = $this->validatePartInput($input);
            if (isset($validated['error'])) {
                http_response_code(400);
                echo json_encode(["status" => "error", "error" => $validated['error']]);
                return;
            }

            $result = Part::updatePart(
                (int)$partId,
                $validated['part_name'],
                $validated['unit'],
                $validated['quantity_on_hand'],
                $validated['unit_price']
            );
            if (!empty($result['success'])) {
                http_response_code(200);
                echo json_encode(["status" => "success", "message" => "Part updated successfully"]);
            } elseif (!empty($result['not_found'])) {
                http_response_code(404);
                echo json_encode(["status" => "error", "error" => "Active part not found"]);
            } elseif (($result['code'] ?? 0) === 1062) {
                http_response_code(409);
                echo json_encode(["status" => "error", "error" => "A part with this name already exists."]);
            } else {
                error_log($result['error'] ?? 'Part update failed');
                http_response_code(500);
                echo json_encode(["status" => "error", "error" => "Failed to update part"]);
            }
        }

        public function deletePart() {
            header('Content-Type: application/json');
            $input = $this->getInputData();
            $partId = $input['part_id'] ?? null;
            if (filter_var($partId, FILTER_VALIDATE_INT) === false || (int)$partId <= 0) {
                http_response_code(400);
                echo json_encode(["status" => "error", "error" => "A valid part_id is required"]);
                return;
            }

            $result = Part::softDeletePart((int)$partId);
            if (is_array($result)) {
                if (($result['code'] ?? 0) === 1644) {
                    http_response_code(409);
                    echo json_encode(["status" => "error", "error" => $result['error']]);
                    return;
                }
                error_log($result['error'] ?? 'Part deactivation failed');
                http_response_code(500);
                echo json_encode(["status" => "error", "error" => "Failed to deactivate part"]);
            } elseif ($result > 0) {
                http_response_code(204);
            } else {
                http_response_code(404);
                echo json_encode(["status" => "error", "error" => "Active part not found"]);
            }
        }
                /**
         * Endpoint handler to retrieve all inventory parts.
         * Accepts GET query parameters: ?status=ACTIVE&search=filter
         */
        public function getParts() {
            header('Content-Type: application/json');

            // Capture query parameters
            $status  = $_GET['status']   ?? 'ALL';
            $search  = $_GET['search']   ?? '';
            $orderId = $_GET['order_id'] ?? null;   // optional: only parts that fit this order's vehicle

            // Fetch data from model
            $result = self::$model::getAllParts($status, $search, $orderId);

            // Send response
            if ($result['success']) {
                http_response_code(200);
                echo json_encode([
                    "status" => "success",
                    "count"  => count($result['data']),
                    "data"   => $result['data']
                ]);
            } elseif (($result['code'] ?? 0) === 1644) {
                // e.g. "Repair order not found."
                http_response_code(404);
                echo json_encode([
                    "status" => "error",
                    "error"  => $result['error']
                ]);
            } else {
                error_log($result['error']);
                http_response_code(500);
                echo json_encode([
                    "status" => "error",
                    "error"  => "Failed to fetch parts"
                ]);
            }
        }

        public function getPartsInventoryAdmin() {
            header('Content-Type: application/json');

            // Parse request body if available
            $input = $this->getInputData();

            // Fallback: Check $_GET params first, then $input body, then set default values
            $search      = $_GET['search']       ?? $input['search']       ?? null;
            $stockLevel  = $_GET['stock_level']  ?? $input['stock_level']  ?? null;
            $vehicleType = $_GET['vehicle_type'] ?? $_GET['vehicle_types'] ?? $input['vehicle_type'] ?? $input['vehicle_types'] ?? null;
            $sortBy      = $_GET['sort_by']      ?? $input['sort_by']      ?? 'name';
            $sortOrder   = $_GET['sort_order']   ?? $input['sort_order']   ?? 'ASC';

            // Sanitize sorting inputs
            $validSortBy    = ['name', 'qty', 'cost', 'stock_level'];
            $sortByVal      = in_array(strtolower($sortBy), $validSortBy) ? strtolower($sortBy) : 'name';
            $sortOrderVal   = strtoupper($sortOrder) === 'DESC' ? 'DESC' : 'ASC';

            try {
                // Call static Model method with vehicleType parameter
                $result = self::$model::getPartsInventoryAdmin($search, $stockLevel, $vehicleType, $sortByVal, $sortOrderVal);

                if (isset($result['success']) && $result['success']) {
                    http_response_code(200);
                    echo json_encode([
                        "status"          => "success",
                        "count"           => count($result['data']),
                        "low_stock_count" => $result['low_stock_count'] ?? 0,
                        "data"            => $result['data']
                    ]);
                } else {
                    http_response_code(500);
                    echo json_encode([
                        "status" => "error",
                        "error"  => $result['error'] ?? "Failed to fetch parts inventory."
                    ]);
                }

            } catch (\Exception $e) {
                http_response_code(500);
                echo json_encode([
                    "status" => "error",
                    "error"  => "Controller error: " . $e->getMessage()
                ]);
            }
        }

        private function validatePartInput(array $input) {
            $name = trim((string)($input['part_name'] ?? ''));
            $unit = trim((string)($input['unit'] ?? ''));
            $quantity = $input['quantity_on_hand'] ?? null;
            $unitPrice = $input['unit_price'] ?? null;

            if ($name === '' || strlen($name) > 150) {
                return ["error" => "part_name is required and must be 150 characters or fewer"];
            }
            if ($unit === '' || strlen($unit) > 20) {
                return ["error" => "unit is required and must be 20 characters or fewer"];
            }
            if (filter_var($quantity, FILTER_VALIDATE_INT) === false || (int)$quantity < 0) {
                return ["error" => "quantity_on_hand must be a non-negative integer"];
            }
            if (!is_numeric($unitPrice) || !is_finite((float)$unitPrice) || (float)$unitPrice < 0) {
                return ["error" => "unit_price must be a non-negative number"];
            }

            $vehicleTypes = trim((string)($input['vehicle_types'] ?? 'CAR,MOTORCYCLE,TRICYCLE'));
            $allowedVehicleTypes = ['CAR', 'MOTORCYCLE', 'TRICYCLE'];
            $selectedVehicleTypes = array_filter(array_map('trim', explode(',', strtoupper($vehicleTypes))));
            if (!$selectedVehicleTypes || array_diff($selectedVehicleTypes, $allowedVehicleTypes)) {
                return ["error" => "vehicle_types may contain only CAR, MOTORCYCLE, and TRICYCLE"];
            }

            $reorderLevel = $input['reorder_level'] ?? 5;
            if (filter_var($reorderLevel, FILTER_VALIDATE_INT) === false || (int)$reorderLevel < 0) {
                return ["error" => "reorder_level must be a non-negative integer"];
            }

            $partCode = isset($input['part_code']) ? trim((string)$input['part_code']) : null;
            $category = isset($input['category']) ? trim((string)$input['category']) : null;
            $batchNumber = isset($input['batch_number']) ? trim((string)$input['batch_number']) : null;
            if ($partCode !== null && $partCode !== '' && strlen($partCode) > 30) {
                return ["error" => "part_code must be 30 characters or fewer"];
            }
            if ($category !== null && strlen($category) > 50) {
                return ["error" => "category must be 50 characters or fewer"];
            }
            if ($batchNumber !== null && $batchNumber !== '' && strlen($batchNumber) > 50) {
                return ["error" => "batch_number must be 50 characters or fewer"];
            }

            return [
                'part_name' => $name,
                'unit' => $unit,
                'quantity_on_hand' => (int)$quantity,
                'unit_price' => (float)$unitPrice,
                'part_code' => $partCode ?: null,
                'category' => $category ?: null,
                'vehicle_types' => implode(',', array_values(array_unique($selectedVehicleTypes))),
                'reorder_level' => (int)$reorderLevel,
                'batch_number' => $batchNumber ?: null
            ];
        }
    }
?>