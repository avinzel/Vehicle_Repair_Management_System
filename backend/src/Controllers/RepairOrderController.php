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

        $data = $this->getInputData();

        // Validate required Step 1, 2, and 3 fields
        if (
            empty($data['first_name']) || 
            empty($data['last_name']) || 
            empty($data['phone_number']) || 
            empty($data['plate_number']) || 
            empty($data['vehicle_type']) || 
            empty($data['make_brand']) || 
            empty($data['model']) || 
            empty($data['complaint'])
        ) {
            http_response_code(400); // Bad Request
            echo json_encode(["error" => "Missing required intake fields"]);
            return;
        }

        // Get authenticated user ID for created_by column
        $createdByUserId = Auth::getUserId();
        if (!$createdByUserId) {
            http_response_code(401); // Unauthorized
            echo json_encode(["error" => "User authentication required"]);
            return;
        }

        try {
            // Call model to execute sp_create_vehicle_intake
            $response = $this->repairOrderModel->processIntake($data, $createdByUserId);

            if (isset($response['success']) && $response['success']) {
                http_response_code(201); // Created
                echo json_encode([
                    "message" => "Vehicle intake and repair order created successfully",
                    "order_id" => $response['order_id'],
                    "customer_id" => $response['customer_id'],
                    "vehicle_id" => $response['vehicle_id']
                ]);
            } else {
                http_response_code(500);
                echo json_encode(["error" => $response['error'] ?? "Failed to complete intake process"]);
            }

        } catch (Exception $e) {
            http_response_code(500); // Internal Server Error
            echo json_encode(["error" => "Database operation failed: " . $e->getMessage()]);
        }
    }

    // Helper method to parse input stream safely
    private function getInputData() {
        $input = json_decode(file_get_contents('php://input'), true);
        return $input ?? [];
    }
}