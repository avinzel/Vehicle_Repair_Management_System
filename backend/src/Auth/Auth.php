<?php
    namespace App\Auth;
    use App\Resources\UserResource;
    class Auth {
        public static function isAuthenticated() {
            return isset($_SESSION['user_id']);
        }

        public static function checkAuthentication(){
            if (isset($_SESSION['user_id'])) {
                $userData = UserResource::toArray($_SESSION['user_id']);
                echo json_encode([
                    "user" => $userData,
                    "message" => "User is authenticated"
                ]);
            } else {
                http_response_code(401);
                echo json_encode(["error" => "Unauthorized access"]);
                exit;
            }
        }

        public static function getUserId() {
            return $_SESSION['user_id'] ?? null;
        }

        public static function getUsername() {
            return $_SESSION['username'] ?? null;
        }

        public static function getRoleId() {
            return $_SESSION['role_id'] ?? null;
        }
    }
?>