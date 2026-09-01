<?php   
    namespace App\Controllers;
    use App\Models\User;

    class LoginController{
        private $userModel;

        public function __construct(User $userModel){
            $this->userModel = $userModel;
        }

        public function loginUser(){
            $data = $this->getInputData();  

            $username = $data['username'] ?? null;
            $password = $data['password'] ?? null;

            if (!$username || !$password) {
                http_response_code(400);
                echo json_encode(["error" => "Missing required fields"]);
                return;
            }

            // Call the model to get the user by username
            $user = $this->userModel->getUserByUserName($username);

            if ($user && password_verify($password, $user['password_hash'])) {
                // Password is correct, set session variables and cookies
                session_regenerate_id(true);

                $_SESSION['user_id'] = $user['user_id'];
                $_SESSION['username'] = $user['username'];
                $_SESSION['role_id'] = $user['role_id'];

                http_response_code(200);
                echo json_encode([
                    "user_id" => $_SESSION['user_id'], 
                    "username" => $_SESSION['username'], 
                    "role_id" => $_SESSION['role_id'], 
                    "message" => "Login successful", 
                    "new_session_id" => session_id()
             ]);
            } else {
                http_response_code(401);
                echo json_encode(["error" => "Invalid username or password"]);
            }
        }

        public function logoutUser(){
            // Clear session variables
            $_SESSION = [];
            session_unset();
            session_destroy();

            http_response_code(200);
            echo json_encode(["message" => "Logout successful"]);
        }

        public function getInputData(){
            $input = json_decode(file_get_contents('php://input'), true);
            return $input;
        }
    };
?>