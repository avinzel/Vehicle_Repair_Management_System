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
            $data = $this->getInputData();

            // Validate Input
            if (empty($data["user_id"])) {
                http_response_code(400); // Bad Request
                echo json_encode(["error" => "User ID is required"]);
                return;
            }
            $id = $data["user_id"];
            if ($data["user_id"] == Auth::getUserId() ) {
                http_response_code(400); // Bad Request
                echo json_encode(["error" => "This action is not expected"]);
                return;
            }

            try {
                $affectedRows = $this->userModel->softDeleteUser($id);

                if ($affectedRows > 0) {
                    http_response_code(204); // Success: No Content
                    // Note: HTTP 204 responses do not send a response body
                } else {
                    http_response_code(404); // Not Found
                    echo json_encode(["error" => "User not found or already inactive"]);
                }
            } catch (Exception $e) {
                http_response_code(500); // Internal Server Error
                echo json_encode(["error" => "Database operation failed: " . $e->getMessage()]);
            }
        }
        public function updateUser() {
            $data = $this->getInputData();  
     
            $user_id     = $data['user_id'] ?? null;
            $username    = isset($data['username']) ? trim($data['username']) : null;
            $first_name  = isset($data['first_name']) ? trim($data['first_name']) : null;
            $middle_name = isset($data['middle_name']) ? trim($data['middle_name']) : null;
            $last_name   = isset($data['last_name']) ? trim($data['last_name']) : null;
            $contact_no  = isset($data['contact_no']) ? trim($data['contact_no']) : null;
            $email       = isset($data['email']) ? trim($data['email']) : null;
            $role_id     = $data['role_id'] ?? null; 
            $status      = isset($data['status']) ? trim($data['status']) : 'ACTIVE';

            if (!$user_id || !$username || !$first_name || !$last_name || !$contact_no || !$email || !$role_id) {
                http_response_code(400);
                echo json_encode(["error" => "Missing required fields"]);
                return;
            }

            // Call the model to update the user
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
            } else {
                if ($response["error"] == "duplicate") {
                    http_response_code(409);
                    echo json_encode(["error" => "Username or Email already exists"]);
                } else {
                    http_response_code(500);
                    echo json_encode(["error" => "Failed to update user"]);
                }
            }
        }

        public function getInputData(){
            $input = json_decode(file_get_contents('php://input'), true);
            return $input;
        }
    };
?>