<?php
    namespace App\Controllers;
    use Exception;
    use App\Config\Database;
    use App\Models\User;
    use App\Auth\Auth;

   class UserController{
        private $userModel;

        public function __construct(User $userModel){
            $this->userModel = $userModel;
        }

        public function deleteUser() {
            header('Content-Type: application/json');
            $data = $this->getInputData();

            $userId = $data["user_id"] ?? null;
            if (filter_var($userId, FILTER_VALIDATE_INT) === false || (int)$userId <= 0) {
                http_response_code(400);
                echo json_encode(["error" => "A valid user_id is required"]);
                return;
            }
            if ((int)$userId === (int)Auth::getUserId()) {
                http_response_code(400);
                echo json_encode(["error" => "You cannot deactivate your own account"]);
                return;
            }

            try {
                if ($this->userModel->softDeleteUser((int)$userId) > 0) {
                    http_response_code(204);
                } else {
                    http_response_code(404);
                    echo json_encode(["error" => "User not found or already inactive"]);
                }
            } catch (Exception $e) {
                error_log($e->getMessage());
                if ((int)$e->getCode() === 1644) {
                    http_response_code(409);
                    echo json_encode(["error" => $e->getMessage()]);
                    return;
                }
                http_response_code(500);
                echo json_encode(["error" => "Failed to deactivate user"]);
            }
        }
        public function updateUser() {
            header('Content-Type: application/json');

            $data = $this->getInputData();

            $user_id     = $data['user_id'] ?? null;
            $username    = isset($data['username'])   ? trim($data['username'])   : null;
            $first_name  = isset($data['first_name']) ? trim($data['first_name']) : null;
            $last_name   = isset($data['last_name'])  ? trim($data['last_name'])  : null;
            $contact_no  = isset($data['contact_no']) ? trim($data['contact_no']) : null;
            $email       = isset($data['email'])      ? trim($data['email'])      : null;
            $role_id     = $data['role_id'] ?? null;
            $status      = isset($data['status'])     ? trim($data['status'])     : 'ACTIVE';

            // Blank or null middle name -> null (stored as real NULL)
            $middle_name = (isset($data['middle_name']) && trim($data['middle_name']) !== '')
                ? trim($data['middle_name'])
                : null;

            if (!$user_id || !$username || !$first_name || !$last_name || !$contact_no || !$email || !$role_id) {
                http_response_code(400);
                echo json_encode(["error" => "Missing required fields"]);
                return;
            }

            $response = $this->userModel->updateUser(
                (int)$user_id,
                $username,
                $first_name,
                $middle_name,
                $last_name,
                $contact_no,
                $email,
                (int)$role_id,
                $status
            );

            if ($response["success"]) {
                http_response_code(200);
                echo json_encode(["message" => "User updated successfully"]);
                return;
            }

            switch ($response["error"]) {
                case "duplicate":
                    http_response_code(409); // Conflict
                    echo json_encode([
                        "error" => $response["message"] ?? "Duplicate entry",
                        "field" => $response["field"] ?? null
                    ]);
                    break;

                case "not_found":
                    http_response_code(404);
                    echo json_encode(["error" => $response["message"] ?? "User not found"]);
                    break;

                case "invalid":
                    $hasActiveMechanicOrders = strpos(
                        $response["message"] ?? '',
                        "mechanic still has active orders"
                    ) !== false;
                    http_response_code($hasActiveMechanicOrders ? 409 : 400);
                    echo json_encode(["error" => $response["message"] ?? "Invalid data"]);
                    break;

                default:
                    error_log($response["error"]); // raw error stays server-side
                    http_response_code(500);
                    echo json_encode(["error" => "Failed to update user"]);
            }
        }
/**
         * Endpoint handler to retrieve staff members with search, filters (role, status), and dynamic sorting (date, full_name, status, role_name).
         * Accepts query parameters (GET) or JSON body payload.
         */
    public function getStaffMembers() {
        header('Content-Type: application/json');

        try {
            $input = $this->getInputData();

            $search    = $_GET['search']     ?? $input['search']     ?? null;
            $roleId    = $_GET['role_id']    ?? $input['role_id']    ?? null;
            $status    = $_GET['status']     ?? $input['status']     ?? null;
            $sortBy    = $_GET['sort_by']    ?? $input['sort_by']    ?? 'user_id';
            $sortOrder = $_GET['sort_order'] ?? $input['sort_order'] ?? 'ASC';

            $response = User::getStaffMembers($search, $roleId, $status, $sortBy, $sortOrder);

            if ($response !== false) {
                http_response_code(200);
                echo json_encode([
                    "status"       => "success",
                    "active_count" => $response['active_count'] ?? 0,
                    "count"        => count($response['data']   ?? []),
                    "data"         => $response['data']         ?? []
                ]);
            } else {
                http_response_code(500);
                echo json_encode([
                    "status" => "error",
                    "error"  => "Failed to fetch staff members"
                ]);
            }

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                "status" => "error",
                "error"  => "Server error: " . $e->getMessage()
            ]);
        }
        exit();
    }
        public function getInputData(){
            $input = json_decode(file_get_contents('php://input'), true);
            return $input;
        }
    };
?>