<?php 
    namespace App\Controllers;
    use App\Models\User;

    class RegisterUserController{
        private $userModel;

        public function __construct(User $userModel){
            $this->userModel = $userModel;
        }

        public function registerUser(){
            $data = $this->getInputData();  

            $username = $data['username'] ?? null;
            $password = $data['password'] ?? null;
            $first_name = $data['first_name'] ?? null;
            $middle_name = $data['middle_name'] ?? null;
            $last_name = $data['last_name'] ?? null;
            $contact_no = $data['contact_no'] ?? null;
            $email = $data['email'] ?? null;
            $role_id = $data['role_id'] ?? null; 

            if (!$username || !$password || !$first_name || !$last_name || !$contact_no || !$email || !$role_id) {
                http_response_code(400);
                echo json_encode(["error" => "Missing required fields"]);
                return;
            }

            // Hash the password before storing it
            $password_hash = password_hash($password, PASSWORD_DEFAULT);
            
            $response = $this->userModel->createUser($username, $password_hash, $first_name, $middle_name, $last_name, $contact_no, $email, $role_id);
            // Call the model to create the user
            if ($response["success"]) {
                http_response_code(201);
                echo json_encode(["message" => "User registered successfully"]);
            } else if (!$response["success"]) {
                if ($response["error"] == "duplicate") {
                  http_response_code(409);
                  echo json_encode(["error" => "Username already exists"]);
                } else {
                  http_response_code(500);
                  echo json_encode(["error" => "Failed to register user"]);
                }
            }
        }

        public function getInputData(){
            $input = json_decode(file_get_contents('php://input'), true);
            return $input;
        }
    }

?>