<?php
namespace App\Controllers;

use Exception;
use App\Models\Mechanic;

class MechanicController {
    private $mechanicModel;

    public function __construct(Mechanic $mechanicModel) {
        $this->mechanicModel = $mechanicModel;
    }

    // POST: Create Mechanic
    public function createMechanic() {
        header('Content-Type: application/json');

        $data = $this->getInputData();

        $userId         = $data['user_id'] ?? null;
        $specialization = isset($data['specialization']) ? trim($data['specialization']) : null;
        $dateHired      = isset($data['date_hired']) ? trim($data['date_hired']) : null;
        $status         = strtoupper(trim($data['status'] ?? 'ACTIVE'));

        if (!$userId || !$specialization || !$dateHired) {
            http_response_code(400); // Bad Request
            echo json_encode(["error" => "user_id, specialization, and date_hired are required"]);
            return;
        }
        if (filter_var($userId, FILTER_VALIDATE_INT) === false || (int)$userId <= 0 || !$this->isValidDate($dateHired)) {
            http_response_code(400);
            echo json_encode(["error" => "A valid user_id and date_hired (YYYY-MM-DD) are required"]);
            return;
        }
        if (!in_array($status, ['ACTIVE', 'INACTIVE'], true)) {
            http_response_code(400);
            echo json_encode(["error" => "Status must be ACTIVE or INACTIVE"]);
            return;
        }

        try {
            $newId = $this->mechanicModel->createMechanic(
                (int)$userId,
                $specialization,
                $dateHired,
                $status
            );

            if ($newId) {
                http_response_code(201); // Created
                echo json_encode([
                    "message"     => "Mechanic created successfully",
                    "mechanic_id" => $newId
                ]);
            } else {
                http_response_code(500);
                echo json_encode(["error" => "Failed to create mechanic"]);
            }
        } catch (Exception $e) {
            // Map the error codes raised by sp_create_mechanic to proper HTTP statuses
            switch ((int)$e->getCode()) {
                case 1062: // user is already a mechanic
                    http_response_code(409); // Conflict
                    break;
                case 1452: // user_id doesn't exist
                    http_response_code(404); // Not Found
                    break;
                case 1644: // invalid status
                    http_response_code(400); // Bad Request
                    break;
                default:
                    http_response_code(500); // Internal Server Error
            }

            echo json_encode(["error" => $e->getMessage()]);
        }
    }

    // PUT: Update Mechanic
    public function updateMechanics() {
        $data = $this->getInputData();

        $mechanicId     = $data['mechanic_id'] ?? null;
        $specialization = isset($data['specialization']) ? trim($data['specialization']) : null;
        $dateHired      = isset($data['date_hired']) ? trim($data['date_hired']) : null;
        $status         = strtoupper(trim($data['status'] ?? 'ACTIVE'));

        if (filter_var($mechanicId, FILTER_VALIDATE_INT) === false || (int)$mechanicId <= 0 || !$specialization || !$dateHired || !$this->isValidDate($dateHired)) {
            http_response_code(400);
            echo json_encode(["error" => "mechanic_id, specialization, and a valid date_hired (YYYY-MM-DD) are required"]);
            return;
        }
        if (!in_array($status, ['ACTIVE', 'INACTIVE'], true)) {
            http_response_code(400);
            echo json_encode(["error" => "Status must be ACTIVE or INACTIVE"]);
            return;
        }

        try {
            $affectedRows = $this->mechanicModel->updateMechanic(
                (int)$mechanicId,
                $specialization,
                $dateHired,
                $status
            );

            if ($affectedRows > 0) {
                http_response_code(200);
                echo json_encode([
                    "status" => "success",
                    "message" => "Mechanic and linked staff account updated successfully"
                ]);
            } else {
                http_response_code(404);
                echo json_encode(["error" => "Mechanic not found"]);
            }
        } catch (Exception $e) {
            error_log($e->getMessage());
            if ((int)$e->getCode() === 1644) {
                http_response_code(409);
                echo json_encode(["error" => $e->getMessage()]);
                return;
            }
            http_response_code(500);
            echo json_encode(["error" => "Failed to update mechanic"]);
        }
    }

    // DELETE: Soft Delete Mechanic
    public function deleteMechanic() {
        header('Content-Type: application/json');
        $data = $this->getInputData();
        $mechanicId = $data['mechanic_id'] ?? null;
        if (filter_var($mechanicId, FILTER_VALIDATE_INT) === false || (int)$mechanicId <= 0) {
            http_response_code(400);
            echo json_encode(["error" => "A valid mechanic_id is required"]);
            return;
        }

        try {
            if ($this->mechanicModel->softDeleteMechanic((int)$mechanicId) > 0) {
                http_response_code(204);
            } else {
                http_response_code(404);
                echo json_encode(["error" => "Mechanic not found"]);
            }
        } catch (Exception $e) {
            error_log($e->getMessage());
            if ((int)$e->getCode() === 1644) {
                http_response_code(409);
                echo json_encode(["error" => $e->getMessage()]);
                return;
            }
            http_response_code(500);
            echo json_encode(["error" => "Failed to deactivate mechanic and linked account"]);
        }
    }
    // GET: Fetch available mechanics not yet assigned to a given repair order
    public function getAvailableMechanics() {

        $orderId = $_GET['order_id'] ?? $_GET['orderId'] ?? null;

        if (!$orderId) {
            $data = $this->getInputData();
            $orderId = $data['order_id'] ?? $data['orderId'] ?? null;
        }

        if (!$orderId) {
            http_response_code(400);
            echo json_encode(["error" => "order_id is required"]);
            return;
        }

        try {
            $response = Mechanic::getAvailableMechanics((int)$orderId);

            if (isset($response['success']) && $response['success']) {
                http_response_code(200);
                echo json_encode([
                    "message" => "Available mechanics fetched successfully",
                    "data" => $response['data']
                ]);
            } else {
                http_response_code(500);
                echo json_encode(["error" => $response['error'] ?? "Failed to fetch available mechanics"]);
            }
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(["error" => "Database operation failed: " . $e->getMessage()]);
        }
    }
    // GET/POST: Fetch all mechanics with search, status filter, and dynamic sorting
    public function getAllMechanics() {
        header('Content-Type: application/json');

        try {
            // Parse request body if available
            $input = $this->getInputData();

            // Capture query params first, fallback to JSON body params
            $search    = $_GET['search']     ?? $input['search']     ?? null;
            $status    = $_GET['status']     ?? $input['status']     ?? null;
            $sortBy    = $_GET['sort_by']    ?? $input['sort_by']    ?? 'mechanic_id';
            $sortOrder = $_GET['sort_order'] ?? $input['sort_order'] ?? 'ASC';

            // Call model method passing all parameters
            $response = Mechanic::getAllMechanics(
                $search, 
                $status, 
                $sortBy, 
                $sortOrder
            );

            if (isset($response['success']) && $response['success']) {
                http_response_code(200);
                echo json_encode([
                    "status"       => "success",
                    "active_count" => $response['active_count'] ?? 0,
                    "count"        => count($response['data']), // Kept for backward compatibility
                    "data"         => $response['data']
                ]);
            } else {
                http_response_code(500);
                echo json_encode([
                    "status" => "error",
                    "error"  => $response['error'] ?? "Failed to fetch mechanics"
                ]);
            }
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                "status" => "error",
                "error"  => "Server error: " . $e->getMessage()
            ]);
        }
    }
    // Helper method to parse input stream safely
    public function getInputData() {
        $input = json_decode(file_get_contents('php://input'), true);
        return $input ?? [];
    }

    private function isValidDate($value) {
        $date = \DateTime::createFromFormat('!Y-m-d', $value);
        return $date && $date->format('Y-m-d') === $value;
    }
}