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
                    http_response_code(201); // Created
                    echo json_encode([
                        "message"     => "Vehicle intake and repair order created successfully",
                        "order_id"    => $response['order_id'],
                        "customer_id" => $response['customer_id'],
                        "vehicle_id"  => $response['vehicle_id']
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

    public function getActiveRepairOrders() {

        $status = $_GET['status'] ?? 'ALL';
        $search = $_GET['search'] ?? '';

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
    // Helper method to parse input stream safely
    private function getInputData() {
        $input = json_decode(file_get_contents('php://input'), true);
        return $input ?? [];
    }
}