<?php
namespace App\Controllers;

use App\Models\Service;
use App\Auth\Auth;
use Exception;

class ServiceController {
    private static $model;

    public function __construct() {
        self::$model = new Service();
    }

    public function getServices() {
        header('Content-Type: application/json');

        $search = $_GET['search'] ?? null;
        $status = $_GET['status'] ?? null;

        if ($search === null || $status === null) {
            $input  = $this->getInputData();
            $search = $search ?? ($input['search'] ?? null);
            $status = $status ?? ($input['status'] ?? null);
        }

        // Whitelist the status, default to ACTIVE
        $status = strtoupper(trim($status ?? 'ACTIVE'));
        if ($status === '') {
            $status = 'ACTIVE';
        }
        if (!in_array($status, ['ACTIVE', 'INACTIVE', 'ALL'], true)) {
            http_response_code(400);
            echo json_encode([
                "status" => "error",
                "error"  => "Invalid status filter. Use ACTIVE, INACTIVE or ALL."
            ]);
            exit();
        }

        try {
            $response = self::$model->getAllServices($search, $status);

            if (isset($response['success']) && $response['success']) {
                http_response_code(200);
                echo json_encode([
                    "status" => "success",
                    "count"  => count($response['data']),
                    "data"   => $response['data']
                ]);
            } else {
                error_log($response['error'] ?? 'getAllServices failed');
                http_response_code(500);
                echo json_encode([
                    "status" => "error",
                    "error"  => "Failed to fetch service catalog"
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
    /**
     * POST: Add a new service catalog entry
     */
    // public function addService() {
    //     header('Content-Type: application/json');

    //     $userId = Auth::getUserId();
    //     if (!$userId) {
    //         http_response_code(401);
    //         echo json_encode([
    //             "status" => "error",
    //             "error"  => "User authentication required."
    //         ]);
    //         exit();
    //     }

    //     $input = $this->getInputData();

    //     if (empty($input['service_name']) || !isset($input['standard_labor_cost'])) {
    //         http_response_code(400);
    //         echo json_encode([
    //             "status" => "error",
    //             "error"  => "Missing required fields (service_name, standard_labor_cost)."
    //         ]);
    //         exit();
    //     }

    //     if (!is_numeric($input['standard_labor_cost']) || (float)$input['standard_labor_cost'] < 0) {
    //         http_response_code(400);
    //         echo json_encode([
    //             "status" => "error",
    //             "error"  => "Standard labor cost must be a non-negative number."
    //         ]);
    //         exit();
    //     }

    //     $serviceName       = trim($input['service_name']);
    //     $description       = $input['description'] ?? null;
    //     $standardLaborCost = (float)$input['standard_labor_cost'];

    //     try {
    //         $response = self::$model->createService($serviceName, $description, $standardLaborCost);

    //         if (isset($response['success']) && $response['success']) {
    //             http_response_code(201);
    //             echo json_encode([
    //                 "status"     => "success",
    //                 "message"    => $response['message'],
    //                 "service_id" => $response['service_id']
    //             ]);
    //         } else {
    //             http_response_code(400);
    //             echo json_encode([
    //                 "status" => "error",
    //                 "error"  => $response['error'] ?? "Failed to add service catalog entry."
    //             ]);
    //         }

    //     } catch (Exception $e) {
    //         http_response_code(500);
    //         echo json_encode([
    //             "status" => "error",
    //             "error"  => "Controller operation failed: " . $e->getMessage()
    //         ]);
    //     }
    //     exit();
    // }

    // /**
    //  * PUT/POST: Update an existing service catalog entry
    //  */
    // public function updateService() {
    //     header('Content-Type: application/json');

    //     $userId = Auth::getUserId();
    //     if (!$userId) {
    //         http_response_code(401);
    //         echo json_encode([
    //             "status" => "error",
    //             "error"  => "User authentication required."
    //         ]);
    //         exit();
    //     }

    //     $input = $this->getInputData();

    //     if (empty($input['service_catalog_id']) || empty($input['service_name']) || !isset($input['standard_labor_cost'])) {
    //         http_response_code(400);
    //         echo json_encode([
    //             "status" => "error",
    //             "error"  => "Missing required fields (service_catalog_id, service_name, standard_labor_cost)."
    //         ]);
    //         exit();
    //     }

    //     if (!is_numeric($input['standard_labor_cost']) || (float)$input['standard_labor_cost'] < 0) {
    //         http_response_code(400);
    //         echo json_encode([
    //             "status" => "error",
    //             "error"  => "Standard labor cost must be a non-negative number."
    //         ]);
    //         exit();
    //     }

    //     $serviceId         = (int)$input['service_catalog_id'];
    //     $serviceName       = trim($input['service_name']);
    //     $description       = $input['description'] ?? null;
    //     $standardLaborCost = (float)$input['standard_labor_cost'];

    //     try {
    //         $response = self::$model->updateService($serviceId, $serviceName, $description, $standardLaborCost);

    //         if (isset($response['success']) && $response['success']) {
    //             http_response_code(200);
    //             echo json_encode([
    //                 "status"  => "success",
    //                 "message" => $response['message']
    //             ]);
    //         } else {
    //             http_response_code(400);
    //             echo json_encode([
    //                 "status" => "error",
    //                 "error"  => $response['error'] ?? "Failed to update service entry."
    //             ]);
    //         }

    //     } catch (Exception $e) {
    //         http_response_code(500);
    //         echo json_encode([
    //             "status" => "error",
    //             "error"  => "Controller operation failed: " . $e->getMessage()
    //         ]);
    //     }
    //     exit();
    // }

    public function addService() {
        header('Content-Type: application/json');
        $input = $this->getInputData();
        $validated = $this->validateServiceInput($input);
        if (isset($validated['error'])) {
            http_response_code(400);
            echo json_encode(["status" => "error", "error" => $validated['error']]);
            return;
        }

        $result = self::$model->createService(
            $validated['service_name'],
            $validated['description'],
            $validated['standard_labor_cost']
        );
        if ($result['success']) {
            http_response_code(201);
            echo json_encode([
                "status" => "success",
                "message" => "Service created successfully",
                "service_catalog_id" => $result['service_catalog_id']
            ]);
            return;
        }
        if (($result['code'] ?? 0) === 1062) {
            http_response_code(409);
            echo json_encode(["status" => "error", "error" => "A service with this name already exists"]);
            return;
        }
        error_log($result['error'] ?? 'Service creation failed');
        http_response_code(500);
        echo json_encode(["status" => "error", "error" => "Failed to create service"]);
    }

    public function updateService() {
        header('Content-Type: application/json');
        $input = $this->getInputData();
        $serviceId = $input['service_catalog_id'] ?? null;
        if (filter_var($serviceId, FILTER_VALIDATE_INT) === false || (int)$serviceId <= 0) {
            http_response_code(400);
            echo json_encode(["status" => "error", "error" => "A valid service_catalog_id is required"]);
            return;
        }

        $validated = $this->validateServiceInput($input);
        if (isset($validated['error'])) {
            http_response_code(400);
            echo json_encode(["status" => "error", "error" => $validated['error']]);
            return;
        }
        $result = self::$model->updateService(
            (int)$serviceId,
            $validated['service_name'],
            $validated['description'],
            $validated['standard_labor_cost']
        );
        if (!empty($result['success'])) {
            http_response_code(200);
            echo json_encode(["status" => "success", "message" => "Service updated successfully"]);
        } elseif (!empty($result['not_found'])) {
            http_response_code(404);
            echo json_encode(["status" => "error", "error" => "Active service not found"]);
        } elseif (($result['code'] ?? 0) === 1062) {
            http_response_code(409);
            echo json_encode(["status" => "error", "error" => "A service with this name already exists"]);
        } else {
            error_log($result['error'] ?? 'Service update failed');
            http_response_code(500);
            echo json_encode(["status" => "error", "error" => "Failed to update service"]);
        }
    }

    public function deleteService() {
        header('Content-Type: application/json');
        $input = $this->getInputData();
        $serviceId = $input['service_catalog_id'] ?? null;
        if (filter_var($serviceId, FILTER_VALIDATE_INT) === false || (int)$serviceId <= 0) {
            http_response_code(400);
            echo json_encode(["status" => "error", "error" => "A valid service_catalog_id is required"]);
            return;
        }

        $result = self::$model->softDeleteService((int)$serviceId);
        if (is_array($result)) {
            error_log($result['error'] ?? 'Service deactivation failed');
            http_response_code(500);
            echo json_encode(["status" => "error", "error" => "Failed to deactivate service"]);
        } elseif ($result > 0) {
            http_response_code(204);
        } else {
            http_response_code(404);
            echo json_encode(["status" => "error", "error" => "Active service not found"]);
        }
    }

    private function validateServiceInput(array $input) {
        $name = trim((string)($input['service_name'] ?? ''));
        $description = isset($input['description']) && trim((string)$input['description']) !== ''
            ? trim((string)$input['description'])
            : null;
        $cost = $input['standard_labor_cost'] ?? null;

        if ($name === '' || strlen($name) > 150) {
            return ["error" => "service_name is required and must be 150 characters or fewer"];
        }
        if ($description !== null && strlen($description) > 255) {
            return ["error" => "description must be 255 characters or fewer"];
        }
        if (!is_numeric($cost) || !is_finite((float)$cost) || (float)$cost < 0) {
            return ["error" => "standard_labor_cost must be a non-negative number"];
        }

        return [
            'service_name' => $name,
            'description' => $description,
            'standard_labor_cost' => (float)$cost
        ];
    }

    public function getInputData() {
        $input = json_decode(file_get_contents('php://input'), true);
        return $input ?? [];
    }
}
?>