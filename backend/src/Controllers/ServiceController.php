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

    /**
     * GET: Retrieve service catalog items
     */
    public function getServices() {
        header('Content-Type: application/json');

        $search = $_GET['search'] ?? null;

        if ($search === null) {
            $input = $this->getInputData();
            $search = $input['search'] ?? null;
        }

        try {
            $response = self::$model->getAllServices($search);

            if (isset($response['success']) && $response['success']) {
                http_response_code(200);
                echo json_encode([
                    "status" => "success",
                    "count"  => count($response['data']),
                    "data"   => $response['data']
                ]);
            } else {
                http_response_code(500);
                echo json_encode([
                    "status" => "error",
                    "error"  => $response['error'] ?? "Failed to fetch service catalog"
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

    /**
     * Helper method to decode incoming JSON request body
     */
    public function getInputData() {
        $input = json_decode(file_get_contents('php://input'), true);
        return $input ?? [];
    }
}
?>