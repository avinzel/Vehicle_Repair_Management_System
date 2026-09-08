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
        $data = $this->getInputData();

        $userId         = $data['user_id'] ?? null;
        $specialization = isset($data['specialization']) ? trim($data['specialization']) : null;
        $dateHired      = isset($data['date_hired']) ? trim($data['date_hired']) : null;
        $status         = isset($data['status']) ? trim($data['status']) : 'ACTIVE';

        if (!$userId || !$specialization || !$dateHired) {
            http_response_code(400); // Bad Request
            echo json_encode(["error" => "user_id, specialization, and date_hired are required"]);
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
                    "message" => "Mechanic created successfully",
                    "mechanic_id" => $newId
                ]);
            } else {
                http_response_code(500);
                echo json_encode(["error" => "Failed to create mechanic"]);
            }
        } catch (Exception $e) {
            http_response_code(500); // Internal Server Error
            echo json_encode(["error" => "Database operation failed: " . $e->getMessage()]);
        }
    }

    // PUT: Update Mechanic
    public function updateMechanics() {
        $data = $this->getInputData();

        $mechanicId     = $data['mechanic_id'] ?? null;
        $userId         = $data['user_id'] ?? null;
        $specialization = isset($data['specialization']) ? trim($data['specialization']) : null;
        $dateHired      = isset($data['date_hired']) ? trim($data['date_hired']) : null;
        $status         = isset($data['status']) ? trim($data['status']) : 'ACTIVE';

        if (!$mechanicId || !$userId || !$specialization || !$dateHired) {
            http_response_code(400);
            echo json_encode(["error" => "Missing required fields for update"]);
            return;
        }

        try {
            $affectedRows = $this->mechanicModel->updateMechanic(
                (int)$mechanicId,
                (int)$userId,
                $specialization,
                $dateHired,
                $status
            );

            if ($affectedRows > 0) {
                http_response_code(200);
                echo json_encode(["message" => "Mechanic updated successfully"]);
            } else {
                http_response_code(404);
                echo json_encode(["error" => "Mechanic not found or no changes made"]);
            }
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(["error" => "Database operation failed: " . $e->getMessage()]);
        }
    }

    // DELETE: Soft Delete Mechanic
    public function deleteMechanic() {
        $data = $this->getInputData();

        if (empty($data['mechanic_id'])) {
            http_response_code(400);
            echo json_encode(["error" => "Mechanic ID is required"]);
            return;
        }

        $mechanicId = $data['mechanic_id'];

        try {
            $affectedRows = $this->mechanicModel->softDeleteMechanic((int)$mechanicId);

            if ($affectedRows > 0) {
                if (ob_get_length()) ob_clean(); // Prevent output body from breaking 204
                http_response_code(204); // Success: No Content
                exit();
            } else {
                http_response_code(404);
                echo json_encode(["error" => "Mechanic not found or already inactive"]);
            }
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(["error" => "Database operation failed: " . $e->getMessage()]);
        }
    }

    // Helper method to parse input stream safely
    public function getInputData() {
        $input = json_decode(file_get_contents('php://input'), true);
        return $input ?? [];
    }
}