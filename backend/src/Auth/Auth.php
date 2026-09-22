<?php
    namespace App\Auth;
    use App\Models\User;
    class Auth {
        public static function isAuthenticated() {
            return isset($_SESSION['user_id']);
        }
        
        public static function checkAuthentication(){
            if (isset($_SESSION['user_id'])) {
                $userData = User::getUserById($_SESSION['user_id']);
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

        
        public static function getRolePermissions(){
            return [
                "repair-orders"=>[
                    "GET" => [1,2,3],
                    "POST" => [1,2],
                    "DELETE" => [1,2],
                    "UPDATE" => [1,2,3]
                ],
                "reports"=>[
                    "GET" => [1,2],
                    "POST" => [1,2],
                    "DELETE" => [1,2],
                    "UPDATE" => [1,2,3]
                ],
                "users"=>[
                    "GET" => [1],
                    "POST" => [1],
                    "DELETE" => [1],
                    "UPDATE" => [1,2,3]
                ],
                "mechanics"=>[
                    "GET" => [1,2],
                    "POST" => [1],
                    "DELETE" => [1],
                    "UPDATE" => [1,3]
                ],
                "customers" => [
                    "GET" => [1,2,3],
                    "POST" => [1,2],
                    "DELETE" => [1],
                    "UPDATE" => [1,2,3]
                ],
                "invoices" =>[
                    "GET" => [1,2,3],
                    "POST" => [1,2],
                    "DELETE" => [1],
                    "UPDATE" => [1]
                ],
                "parts" =>[
                    "GET" => [1,2,3],
                    "POST" => [1,2],
                    "DELETE" => [1],
                    "UPDATE" => [1]
                ],
                "services" =>[
                    "GET" => [1,2,3],
                    "POST" => [1],
                    "DELETE" => [1],
                    "UPDATE" => [1]
                ]
            ];
        }
    }
?>