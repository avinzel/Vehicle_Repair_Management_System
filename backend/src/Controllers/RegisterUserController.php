<?php 
    namespace App\Controllers;
    use App\Models\User;

    class RegisterUserController{
        private $userModel;

        public function __construct(User $userModel){
            $this->userModel = $userModel;
        }
        public function registerUser(){
            header('Content-Type: application/json');

            $data = $this->getInputData();

            $username    = isset($data['username'])    ? trim($data['username'])    : null;
            $password    = isset($data['password'])    ? trim($data['password'])    : null;
            $first_name  = isset($data['first_name'])  ? trim($data['first_name'])  : null;
            $middle_name = isset($data['middle_name']) ? trim($data['middle_name']) : '';
            $last_name   = isset($data['last_name'])   ? trim($data['last_name'])   : null;
            $contact_no  = isset($data['contact_no'])  ? trim($data['contact_no'])  : null;
            $email       = isset($data['email'])       ? trim($data['email'])       : null;
            $role_id     = $data['role_id'] ?? null;

            if (!$username || !$password || !$first_name || !$last_name || !$contact_no || !$email || !$role_id) {
                http_response_code(400);
                echo json_encode(["error" => "Missing required fields"]);
                return;
            }

            // Hash the password before storing it
            $password_hash = password_hash($password, PASSWORD_DEFAULT);

            $response = $this->userModel->createUser(
                $username,
                $password_hash,
                $first_name,
                $middle_name,
                $last_name,
                $contact_no,
                $email,
                (int)$role_id
            );

            if ($response["success"]) {
                http_response_code(201);
                echo json_encode([
                    "message" => "User registered successfully",
                    "user_id" => $response["user_id"] ?? null
                ]);
                return;
            }

            // Failure: map the model's error type to an HTTP status
            switch ($response["error"]) {
                case "duplicate":
                    http_response_code(409); // Conflict
                    echo json_encode([
                        "error" => $response["message"] ?? "Duplicate entry",
                        "field" => $response["field"] ?? null
                    ]);
                    break;

                case "invalid":
                    http_response_code(400); // Bad Request
                    echo json_encode(["error" => $response["message"] ?? "Invalid data"]);
                    break;

                default:
                    error_log($response["error"]); // keep the raw error server-side
                    http_response_code(500);
                    echo json_encode(["error" => "Failed to register user"]);
            }
        }
        public function getInputData(){
            $input = json_decode(file_get_contents('php://input'), true);
            return $input;
        }
    }

?>