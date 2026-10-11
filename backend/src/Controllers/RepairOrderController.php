<?php
namespace App\Controllers;

use Exception;
use App\Models\RepairOrder;
use App\Auth\Auth;
use App\Models\User; 

class RepairOrderController {
    private $repairOrderModel;

    public function __construct() {
        // Fallback to direct instantiation if no dependency is passed
        $this->repairOrderModel = $repairOrderModel ?? new RepairOrder();
    }
    // Helper method to parse input stream safely
    private function getInputData() {
        $input = json_decode(file_get_contents('php://input'), true);
        return $input ?? [];
    }
    // POST: Handle new vehicle intake & repair order creation
    public function createVehicleIntake() {
        header('Content-Type: application/json');

        $data = $this->getInputData();

        // Extract nested sub-objects (or fallback to root/empty array)
        $customer = $data['customer'] ?? $data;
        $vehicle  = $data['vehicle'] ?? $data;
        $order    = $data['order'] ?? $data;

        // Map required fields supporting both camelCase and snake_case keys
        $firstName   = $customer['firstName'] ?? $customer['first_name'] ?? null;
        $lastName    = $customer['lastName'] ?? $customer['last_name'] ?? null;
        $phoneNumber = $customer['phone'] ?? $customer['phone_number'] ?? null;

        $plateNumber = $vehicle['plateNumber'] ?? $vehicle['plate_number'] ?? null;
        $vehicleType = $vehicle['vehicleType'] ?? $vehicle['vehicle_type'] ?? null;
        $makeBrand   = $vehicle['make'] ?? $vehicle['make_brand'] ?? null;
        $model       = $vehicle['model'] ?? null;
        $complaint   = $order['complaint'] ?? null;

        // Validate required Step 1, 2, and 3 fields
        if (
            empty($firstName) || 
            empty($lastName) || 
            empty($phoneNumber) || 
            empty($plateNumber) || 
            empty($vehicleType) || 
            empty($makeBrand) || 
            empty($model) || 
            empty($complaint)
        ) {
            http_response_code(400);
            echo json_encode(["status" => "error", "error" => "Missing required intake fields"]);
            exit();
        }

        // Get authenticated user ID for created_by column
        $createdByUserId = Auth::getUserId();
        if (!$createdByUserId) {
            http_response_code(401);
            echo json_encode(["status" => "error", "error" => "User authentication required"]);
            exit();
        }

        // Build a clean, normalized payload array to pass to the model
        $normalizedData = [
            'first_name'      => $firstName,
            'middle_name'     => $customer['middleName'] ?? $customer['middle_name'] ?? null,
            'last_name'       => $lastName,
            'phone_number'    => $phoneNumber,
            'email_address'   => $customer['email'] ?? $customer['email_address'] ?? null,
            'address'         => $customer['address'] ?? null,

            'plate_number'    => $plateNumber,
            'vehicle_type'    => $vehicleType,
            'make_brand'      => $makeBrand,
            'model'           => $model,
            'year'            => isset($vehicle['year']) ? (int)$vehicle['year'] : null,
            'color'           => $vehicle['color'] ?? null,
            'vin_number'      => $vehicle['vinNumber'] ?? $vehicle['vin_number'] ?? null,
            'current_mileage' => isset($vehicle['currentMileage']) ? (int)$vehicle['currentMileage'] : (isset($vehicle['current_mileage']) ? (int)$vehicle['current_mileage'] : 0),

            'complaint'       => $complaint,
            'priority'        => $order['priority'] ?? 'STANDARD',
        ];

        try {
            // Call model to execute sp_create_vehicle_intake with normalized structure
            $response = $this->repairOrderModel->processIntake($normalizedData, $createdByUserId);

            if (isset($response['success']) && $response['success']) {
                http_response_code(201);
                echo json_encode([
                    "status"      => "success",
                    "message"     => "Vehicle intake and repair order created successfully",
                    "order_id"    => $response['order_id'],
                    "customer_id" => $response['customer_id'],
                    "vehicle_id"  => $response['vehicle_id']
                ]);
            } else {
                $errorMessage = $response['error'] ?? "Failed to complete intake process";
                if (($response['code'] ?? 0) === 1644) {
                    http_response_code(409);
                    echo json_encode(["status" => "error", "error" => $errorMessage]);
                } elseif (($response['code'] ?? 0) === 1062) {
                    if (stripos($errorMessage, 'email') !== false) {
                        $conflictMessage = "A customer with this email address already exists.";
                    } elseif (stripos($errorMessage, 'plate_number') !== false) {
                        $conflictMessage = "A vehicle with this plate number already exists.";
                    } elseif (stripos($errorMessage, 'vin_number') !== false) {
                        $conflictMessage = "A vehicle with this VIN already exists.";
                    } else {
                        $conflictMessage = "A customer or vehicle with the supplied unique value already exists.";
                    }
                    http_response_code(409);
                    echo json_encode(["status" => "error", "error" => $conflictMessage]);
                } else {
                    error_log("Vehicle intake failed: " . $errorMessage);
                    http_response_code(500);
                    echo json_encode(["status" => "error", "error" => "Failed to complete vehicle intake."]);
                }
            }

        } catch (Exception $e) {
            error_log("Vehicle intake controller failed: " . $e->getMessage());
            http_response_code(500);
            echo json_encode([
                "status" => "error",
                "error"  => "Failed to complete vehicle intake."
            ]);
        }
        exit();
    }

    public function getActiveRepairOrders() {

        $status = $_GET['status'] ?? null;
        $search = $_GET['search'] ?? null;
        $input = $this->getInputData();
        if ($search === null) {
            $search = $input['search'] ?? null;
        }
        if ($status === null) {
            $status = $input['status'] ?? "ALL";
        }
        try {
            $response = $this->repairOrderModel->getActiveRepairOrders($status, $search);

            if (isset($response['success']) && $response['success']) {
                http_response_code(200);
                echo json_encode([
                    "status" => "success",
                    "count"  => count($response['data']),
                    "data"   => $response['data']
                ]);
            } else {
                http_response_code(500);
                echo json_encode(["error" => $response['error'] ?? "Failed to fetch active repair orders"]);
            }

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(["error" => "Operation failed: " . $e->getMessage()]);
        }
    }

    public function getOrderManagementList() {
        header('Content-Type: application/json');

        $search = $_GET['search'] ?? null;
        $status = strtoupper(trim((string)($_GET['status'] ?? 'ALL')));
        $allowedStatuses = [
            'ALL',
            'PENDING_DIAGNOSIS',
            'AWAITING_DIAGNOSIS',
            'PENDING_MECHANICS',
            'IN_PROGRESS',
            'READY_TO_INVOICE',
            'AWAITING_PAYMENT',
            'READY_FOR_RELEASE',
            'FULFILLED',
            'CANCELLED',
            'AWAITING_PARTS'
        ];
        if (!in_array($status, $allowedStatuses, true)) {
            http_response_code(400);
            echo json_encode([
                "status" => "error",
                "error" => "Invalid status filter."
            ]);
            return;
        }

        try {
            $response = $this->repairOrderModel->getOrderManagementList($status, $search);
            if (!($response['success'] ?? false)) {
                error_log($response['error'] ?? 'Order management list query failed');
                http_response_code(500);
                echo json_encode(["status" => "error", "error" => "Failed to fetch repair orders."]);
                return;
            }

            http_response_code(200);
            echo json_encode([
                "status" => "success",
                "count" => count($response['data']),
                "data" => $response['data']
            ]);
        } catch (\Throwable $e) {
            error_log("Order management list request failed: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(["status" => "error", "error" => "Failed to fetch repair orders."]);
        }
    }

    public function cancelRepairOrder() {
        header('Content-Type: application/json');
        $input = $this->getInputData();
        $orderId = $_GET['order_id'] ?? $_GET['orderId'] ?? $input['order_id'] ?? $input['orderId'] ?? null;
        if (filter_var($orderId, FILTER_VALIDATE_INT) === false || (int)$orderId <= 0) {
            http_response_code(400);
            echo json_encode(["status" => "error", "error" => "A valid order_id is required."]);
            return;
        }

        try {
            $response = $this->repairOrderModel->cancelRepairOrder((int)$orderId);
            if ($response['success'] ?? false) {
                http_response_code(200);
                echo json_encode([
                    "status" => "success",
                    "message" => "Repair order cancelled successfully.",
                    "order_id" => (int)$orderId,
                    "order_status" => "CANCELLED",
                    "issued_part_rows_cancelled" => $response['issued_part_rows_cancelled'],
                    "pending_part_rows_cancelled" => $response['pending_part_rows_cancelled'],
                    "inventory_quantity_returned" => $response['inventory_quantity_returned']
                ]);
                return;
            }

            $code = (int)($response['code'] ?? 0);
            if ($code === 1644) {
                http_response_code($response['error'] === "Repair order not found." ? 404 : 409);
                echo json_encode(["status" => "error", "error" => $response['error']]);
                return;
            }

            error_log($response['error'] ?? 'Repair order cancellation failed');
            http_response_code(500);
            echo json_encode(["status" => "error", "error" => "Failed to cancel repair order."]);
        } catch (\Throwable $e) {
            error_log("Repair order cancellation request failed: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(["status" => "error", "error" => "Failed to cancel repair order."]);
        }
    }

    public function updateRepairOrder() {
        header('Content-Type: application/json');
        $input = $this->getInputData();
        $orderId = $_GET['order_id'] ?? $_GET['orderId'] ?? $input['order_id'] ?? $input['orderId'] ?? null;
        if (filter_var($orderId, FILTER_VALIDATE_INT) === false || (int)$orderId <= 0) {
            http_response_code(400);
            echo json_encode(["status" => "error", "error" => "A valid order_id is required."]);
            return;
        }

        $updates = [];
        if (array_key_exists('complaint', $input)) {
            if (!is_string($input['complaint']) || trim($input['complaint']) === '') {
                http_response_code(400);
                echo json_encode(["status" => "error", "error" => "complaint must be a non-empty string."]);
                return;
            }
            if (strlen($input['complaint']) > 500) {
                http_response_code(400);
                echo json_encode(["status" => "error", "error" => "complaint must not exceed 500 characters."]);
                return;
            }
            $updates['complaint'] = trim($input['complaint']);
        }

        if (array_key_exists('priority', $input)) {
            if (!is_string($input['priority'])) {
                http_response_code(400);
                echo json_encode(["status" => "error", "error" => "priority must be STANDARD, URGENT, or RUSH."]);
                return;
            }
            $priority = strtoupper(trim($input['priority']));
            if (!in_array($priority, ['STANDARD', 'URGENT', 'RUSH'], true)) {
                http_response_code(400);
                echo json_encode(["status" => "error", "error" => "priority must be STANDARD, URGENT, or RUSH."]);
                return;
            }
            $updates['priority'] = $priority;
        }

        if (array_key_exists('mileage_at_service', $input)) {
            $mileage = $input['mileage_at_service'];
            if ($mileage !== null && (filter_var($mileage, FILTER_VALIDATE_INT) === false || (int)$mileage < 0)) {
                http_response_code(400);
                echo json_encode(["status" => "error", "error" => "mileage_at_service must be a non-negative integer."]);
                return;
            }
            $updates['mileage_at_service'] = (int)$mileage;
        }

        if (array_key_exists('diagnosis_notes', $input)) {
            if ($input['diagnosis_notes'] !== null && !is_string($input['diagnosis_notes'])) {
                http_response_code(400);
                echo json_encode(["status" => "error", "error" => "diagnosis_notes must be a string or null."]);
                return;
            }
            $updates['diagnosis_notes'] = $input['diagnosis_notes'] === null
                ? null
                : trim($input['diagnosis_notes']);
        }

        if (!$updates) {
            http_response_code(400);
            echo json_encode([
                "status" => "error",
                "error" => "At least one editable field is required: complaint, priority, mileage_at_service, or diagnosis_notes."
            ]);
            return;
        }

        try {
            $response = $this->repairOrderModel->updateRepairOrder((int)$orderId, $updates);
            if ($response['success'] ?? false) {
                http_response_code(200);
                echo json_encode([
                    "status" => "success",
                    "message" => "Repair order information updated successfully.",
                    "order_id" => (int)$orderId
                ]);
                return;
            }

            $code = (int)($response['code'] ?? 0);
            if ($code === 1644 && ($response['error'] ?? '') === "Repair order not found.") {
                http_response_code(404);
                echo json_encode(["status" => "error", "error" => $response['error']]);
                return;
            }
            error_log($response['error'] ?? 'Repair order update failed');
            http_response_code(500);
            echo json_encode(["status" => "error", "error" => "Failed to update repair order information."]);
        } catch (\Throwable $e) {
            error_log("Repair order update request failed: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(["status" => "error", "error" => "Failed to update repair order information."]);
        }
    }

    public function getOrderHistory() {
        header('Content-Type: application/json');

        // 1. Check GET query param first, fallback to POST payload
        $search = $_GET['search'] ?? null;

        if ($search === null) {
            $input = $this->getInputData();
            $search = $input['search'] ?? null;
        }

        try {
            // 2. Call the RepairOrder model method
            $response = $this->repairOrderModel->getOrderHistory($search);

            // 3. Formulate JSON response
            if (isset($response['success']) && $response['success']) {
                
                // Compute total revenue KPI across returned completed orders
                $totalRevenue = array_reduce($response['data'], function ($sum, $item) {
                    return $sum + (float)($item['raw_total_paid'] ?? 0);
                }, 0.00);

                http_response_code(200);
                echo json_encode([
                    "status"        => "success",
                    "count"         => count($response['data']),
                    "total_revenue" => "₱" . number_format($totalRevenue, 2),
                    "data"          => $response['data']
                ]);
            } else {
                http_response_code(500);
                echo json_encode([
                    "status" => "error",
                    "error"  => $response['error'] ?? "Failed to fetch order history"
                ]);
            }

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                "status" => "error",
                "error"  => "Controller operation failed: " . $e->getMessage()
            ]);
        }
        exit();
    }
    public function getRepairOrderDetails() {
        header('Content-Type: application/json');

        $orderId = $_GET['order_id'] ?? null;

        if ($orderId === null) {
            $input = $this->getInputData();
            $orderId = $input['order_id'] ?? null;
        }

        if (empty($orderId)) {
            http_response_code(400);
            echo json_encode([
                "status" => "error",
                "error"  => "Missing required order_id parameter."
            ]);
            exit();
        }

        try {
            $response = $this->repairOrderModel->getRepairOrderDetails((int)$orderId);

            if (isset($response['status']) && $response['status'] === 'success') {
                http_response_code(200);
                echo json_encode([
                    "status" => "success",
                    "data"   => $response['data']
                ]);
            } else {
                http_response_code(404);
                echo json_encode([
                    "status" => "error",
                    "error"  => $response['message'] ?? $response['error'] ?? "Failed to fetch order details"
                ]);
            }

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                "status" => "error",
                "error"  => "Controller operation failed: " . $e->getMessage()
            ]);
        }
        exit();
    }
    // POST/PUT: Assign a diagnostician (mechanic) to a repair order
    public function assignDiagnostician() {

        $data = $this->getInputData();

        // Support both camelCase and snake_case request parameters
        $orderId    = $data['order_id'] ?? $data['orderId'] ?? null;
        $mechanicId = $data['mechanic_id'] ?? $data['mechanicId'] ?? $data['diagnostician_id'] ?? $data['diagnosticianId'] ?? null;

        if (empty($orderId) || empty($mechanicId)) {
            http_response_code(400);
            echo json_encode([
                "status" => "error",
                "error"  => "Missing required fields: order_id and mechanic_id"
            ]);
            exit();
        }

        $createdByUserId = Auth::getUserId();
        if (!$createdByUserId) {
            http_response_code(401);
            echo json_encode(["status" => "error", "error" => "User authentication required"]);
            exit();
        }

        try {
            $response = $this->repairOrderModel->assignDiagnostician($orderId, $mechanicId, $createdByUserId);

            if (isset($response['success']) && $response['success']) {
                http_response_code(200);
                echo json_encode([
                    "status"  => "success",
                    "message" => "Diagnostician assigned successfully"
                ]);
            } else {
                http_response_code(400);
                echo json_encode([
                    "status" => "error",
                    "error"  => $response['error'] ?? "Assignment failed"
                ]);
            }
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                "status" => "error",
                "error"  => "Controller operation failed: " . $e->getMessage()
            ]);
        }
        exit();
    }
    public function submitDiagnosis() {


        $data = $this->getInputData();

        $orderId    = $data['order_id'] ?? $data['orderId'] ?? null;
        $notes      = $data['diagnostic_notes'] ?? $data['diagnosis_notes'] ?? null;
        $serviceIds = $data['required_services'] ?? $data['services'] ?? [];

        if (empty($orderId) || empty($notes)) {
            http_response_code(400);
            echo json_encode([
                "status" => "error",
                "error"  => "Missing required fields: order_id and diagnostic_notes"
            ]);
            exit();
        }

        $createdByUserId = Auth::getUserId();
        if (!$createdByUserId) {
            http_response_code(401);
            echo json_encode(["status" => "error", "error" => "User authentication required"]);
            exit();
        }

        $response = $this->repairOrderModel->submitDiagnosis($orderId, $notes, $serviceIds, $createdByUserId);

        if ($response['success']) {
            http_response_code(200);
            echo json_encode([
                "status"  => "success",
                "message" => "Diagnosis submitted successfully. Status updated to Pending Mechanics."
            ]);
        } else {
            http_response_code(400);
            echo json_encode([
                "status" => "error",
                "error"  => $response['error']
            ]);
        }
        exit();
    }
    // POST/PUT: Assign a mechanic and position to a repair order
    public function assignMechanic() {

        $data = $this->getInputData();

        // Support both camelCase and snake_case request parameters
        $orderId    = $data['order_id'] ?? $data['orderId'] ?? null;
        $mechanicId = $data['mechanic_id'] ?? $data['mechanicId'] ?? null;
        $positionId = $data['position_id'] ?? $data['positionId'] ?? $data['pos_id'] ?? $data['posId'] ?? null;

        // Validate required fields
        if (empty($orderId) || empty($mechanicId) || empty($positionId)) {
            http_response_code(400);
            echo json_encode([
                "status" => "error",
                "error"  => "Missing required fields: order_id, mechanic_id, and position_id"
            ]);
            exit();
        }

        // Verify authentication
        $createdByUserId = Auth::getUserId();
        if (!$createdByUserId) {
            http_response_code(401);
            echo json_encode(["status" => "error", "error" => "User authentication required"]);
            exit();
        }

        try {
            $response = $this->repairOrderModel->assignMechanic($orderId, $mechanicId, $positionId, $createdByUserId);

            if (isset($response['success']) && $response['success']) {
                http_response_code(200);
                echo json_encode([
                    "status"  => "success",
                    "message" => "Mechanic assigned successfully"
                ]);
            } else {
                http_response_code(400);
                echo json_encode([
                    "status" => "error",
                    "error"  => $response['error'] ?? "Mechanic assignment failed"
                ]);
            }
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                "status" => "error",
                "error"  => "Controller operation failed: " . $e->getMessage()
            ]);
        }
        exit();
    }
    public function logPart() {
        header('Content-Type: application/json');

        $data = $this->getInputData();

        // Support both camelCase and snake_case request parameters
        $orderId  = $data['order_id'] ?? $data['orderId'] ?? null;
        $partId   = $data['part_id'] ?? $data['partId'] ?? null;
        $quantity = $data['quantity'] ?? $data['qty'] ?? null;

        // Validate required fields
        if (empty($orderId) || empty($partId) || empty($quantity)) {
            http_response_code(400);
            echo json_encode([
                "status" => "error",
                "error"  => "Missing required fields: order_id, part_id, and quantity"
            ]);
            exit();
        }

        try {
            $response = $this->repairOrderModel->logPart((int)$orderId, (int)$partId, (int)$quantity);

            if (isset($response['success']) && $response['success']) {
                http_response_code(200);
                echo json_encode([
                    "status"  => "success",
                    "message" => $response['message'] ?? "Part logged successfully"
                ]);
            } elseif (($response['code'] ?? 0) === 1644) {
                // Business rule rejected it: wrong status, incompatible vehicle type, inactive part, etc.
                http_response_code(400);
                echo json_encode([
                    "status" => "error",
                    "error"  => $response['error']
                ]);
            } else {
                // Unexpected database error: log it, don't expose it
                error_log($response['error'] ?? 'logPart failed');
                http_response_code(500);
                echo json_encode([
                    "status" => "error",
                    "error"  => "Failed to log part"
                ]);
            }
        } catch (Exception $e) {
            error_log($e->getMessage());
            http_response_code(500);
            echo json_encode([
                "status" => "error",
                "error"  => "Controller operation failed"
            ]);
        }
        exit();
    }
   public function getPartsByRepairOrder() {
        header('Content-Type: application/json');

        // Check GET query parameter first, fallback to JSON body parameter
        $orderId = $_GET['order_id'] ?? $_GET['orderId'] ?? null;

        if ($orderId === null) {
            $input = $this->getInputData();
            $orderId = $input['order_id'] ?? $input['orderId'] ?? null;
        }

        // Validate parameter
        if (empty($orderId) || !is_numeric($orderId)) {
            http_response_code(400);
            echo json_encode([
                "status" => "error",
                "error"  => "Missing or invalid required parameter: order_id"
            ]);
            exit();
        }

        try {
            // Call the model method on $this->repairOrderModel
            $response = $this->repairOrderModel->getPartsByRepairOrder((int)$orderId);

            if (isset($response['success']) && $response['success']) {
                http_response_code(200);
                echo json_encode([
                    "status"           => "success",
                    "count"            => count($response['data']),
                    "total_parts_cost" => $response['total_parts_cost'] ?? 0.00,
                    "data"             => $response['data']
                ]);
            } else {
                http_response_code(400);
                echo json_encode([
                    "status" => "error",
                    "error"  => $response['error'] ?? "Failed to fetch order parts"
                ]);
            }
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                "status" => "error",
                "error"  => "Controller operation failed: " . $e->getMessage()
            ]);
        }
        exit();
    }
    /**
     * POST/PUT: Mark a repair order as READY_TO_INVOICE (executed by Lead Mechanic)
     */
    public function markReadyToInvoice() {
        header('Content-Type: application/json');

        $data = $this->getInputData();

        // Support both camelCase and snake_case request parameters
        $orderId = $data['order_id'] ?? $data['orderId'] ?? null;

        if (empty($orderId) || !is_numeric($orderId)) {
            http_response_code(400);
            echo json_encode([
                "status" => "error",
                "error"  => "Missing or invalid required parameter: order_id"
            ]);
            exit();
        }

        // Verify authentication
        $createdByUserId = Auth::getUserId();
        if (!$createdByUserId) {
            http_response_code(401);
            echo json_encode([
                "status" => "error", 
                "error"  => "User authentication required"
            ]);
            exit();
        }

        try {
            // Call model method
            $response = $this->repairOrderModel->markReadyToInvoice((int)$orderId, (int)$createdByUserId);

            if (isset($response['success']) && $response['success']) {
                http_response_code(200);
                echo json_encode([
                    "status"  => "success",
                    "message" => $response['message'] ?? "Repair order marked as ready to invoice successfully"
                ]);
            } else {
                http_response_code(400);
                echo json_encode([
                    "status" => "error",
                    "error"  => $response['error'] ?? "Failed to mark order as ready to invoice"
                ]);
            }
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                "status" => "error",
                "error"  => "Controller operation failed: " . $e->getMessage()
            ]);
        }
        exit();
    }
// POST/PUT: Cancel a repair order part and restore inventory stock
    public function cancelRepairOrderPart() {
        header('Content-Type: application/json');

        $data = $this->getInputData();

        // Support both camelCase and snake_case request parameters, fallback to $_GET
        $orderPartId = $_GET['order_part_id'] ?? $_GET['orderPartId'] ?? $data['order_part_id'] ?? $data['orderPartId'] ?? null;

        // Validate required parameter
        if (empty($orderPartId) || !is_numeric($orderPartId)) {
            http_response_code(400);
            echo json_encode([
                "status" => "error",
                "error"  => "Missing or invalid required parameter: order_part_id"
            ]);
            exit();
        }

        try {
            // Call repair order model cancel method
            $response = $this->repairOrderModel->cancelRepairOrderPart((int)$orderPartId);

            if (isset($response['success']) && $response['success']) {
                http_response_code(200);
                echo json_encode([
                    "status"  => "success",
                    "message" => $response['message'] ?? "Part cancelled and inventory restored successfully"
                ]);
            } else {
                http_response_code(400);
                echo json_encode([
                    "status" => "error",
                    "error"  => $response['error'] ?? "Failed to cancel repair order part"
                ]);
            }
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                "status" => "error",
                "error"  => "Controller operation failed: " . $e->getMessage()
            ]);
        }
        exit();
    }
    // GET: Retrieve work orders assigned to a mechanic
    public function getMechanicWorkOrders() {
        header('Content-Type: application/json');

        // Extract mechanic ID from query parameters or request payload (supports camelCase and snake_case)
        $data = $this->getInputData();
        $mechanicId = $_GET['mechanic_id'] 
                   ?? $_GET['mechanicId'] 
                   ?? $data['mechanic_id'] 
                   ?? $data['mechanicId'] 
                   ?? null;

        // Fallback: If no mechanic_id is passed, attempt to fetch from authenticated session
        if (empty($mechanicId)) {
            $mechanicId = User::getMechanicIdByUserId(Auth::getUserId());
        }

        // Validate parameter
        if (empty($mechanicId) || !is_numeric($mechanicId)) {
            http_response_code(400);
            echo json_encode([
                "status" => "error",
                "error"  => "Missing or invalid required parameter: mechanic_id"
            ]);
            exit();
        }

        try {
            // Call model method executing CALL sp_get_mechanic_work_orders(?)
            $workOrders = $this->repairOrderModel->getMechanicWorkOrders((int)$mechanicId);

            http_response_code(200);
            echo json_encode([
                "status" => "success",
                "data"   => $workOrders
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                "status" => "error",
                "error"  => "Controller operation failed: " . $e->getMessage()
            ]);
        }
        exit();
    }

}