<?php
namespace App\Controllers;

use Exception;
use App\Models\RepairOrder;
use App\Auth\Auth;

class RepairOrderController {
    private $repairOrderModel;

    public function __construct() {
        // Fallback to direct instantiation if no dependency is passed
        $this->repairOrderModel = $repairOrderModel ?? new RepairOrder();
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
                // Return 409 Conflict if the error is due to pre-existing records
                $errorMessage = $response['error'] ?? "Failed to complete intake process";
                $isConflict = strpos($errorMessage, 'already exists') !== false;

                http_response_code($isConflict ? 409 : 400);
                echo json_encode([
                    "status" => "error",
                    "error"  => $errorMessage
                ]);
            }

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                "status" => "error",
                "error"  => "Database operation failed: " . $e->getMessage()
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
    // POST: Log part to repair order (handles ISSUED vs PENDING_PARTS)
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
            // Call RepairOrder model logPart method
            $response = $this->repairOrderModel->logPart((int)$orderId, (int)$partId, (int)$quantity);

            if (isset($response['success']) && $response['success']) {
                http_response_code(200);
                echo json_encode([
                    "status"  => "success",
                    "message" => $response['message'] ?? "Part logged successfully"
                ]);
            } else {
                http_response_code(400);
                echo json_encode([
                    "status" => "error",
                    "error"  => $response['error'] ?? "Failed to log part"
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
    // Helper method to parse input stream safely
    private function getInputData() {
        $input = json_decode(file_get_contents('php://input'), true);
        return $input ?? [];
    }

}