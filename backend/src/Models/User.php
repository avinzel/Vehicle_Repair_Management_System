<?php
    namespace App\Models;

    use App\Config\Database;
    use \App\Resources\UserResource;
use Exception;

    class User{
        private static $conn;
        public function __construct(Database $db){
            self::$conn = $db->getConnection();
        }

        public static function getAllUsers(){
            $query = "SELECT * FROM users"; //procedure
            $stmt = self::$conn->prepare($query);
            try {
                $stmt->execute();
                $result = $stmt->get_result();
                $data = $result->fetch_all(MYSQLI_ASSOC);
                return UserResource::collection($data);
            } catch (\Exception $e) {
                return false;
            }
        }

        public static function getUserById(int $id){
            $query = "SELECT * FROM users WHERE user_id = ?"; //procedure
            $stmt = self::$conn->prepare($query);
            $stmt->bind_param("i", $id);
            try {
                $stmt->execute();
                $result = $stmt->get_result();
                $user = $result->fetch_assoc();
                return UserResource::toArray($user);
            } catch (\Exception $e) {
                return false;
            }
        }

        public static function getUserByUserName(String $username){
            $query = "SELECT * FROM users WHERE username = ?"; //procedure
            $stmt = self::$conn->prepare($query);
            $stmt->bind_param("s", $username);
            try {
                $stmt->execute();
                $result = $stmt->get_result();
                return $result->fetch_assoc();
            } catch (\Exception $e) {
                return false;
            }
        }

        public static function createUser(
            String $username,
            String $password_hash,
            String $first_name,
            String $middle_name,
            String $last_name,
            String $contact_no,
            String $email,
            int $role_id
        ){
            $query = 'INSERT INTO users (username, password_hash, first_name, middle_name, last_name, contact_no, email, role_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, "ACTIVE")'; //procedure
            $stmt = self::$conn->prepare($query);
            $stmt->bind_param(
                "sssssssi",
                $username,
                $password_hash,
                $first_name,
                $middle_name,
                $last_name,
                $contact_no,
                $email,
                $role_id,
            );
            try {
                $stmt->execute();
                return ["success" => true];
            } catch (\Exception $e) {
                // Handle the exception (e.g., log it, rethrow it, etc.)
                if ($e->getCode() === 1062) {
                    return [
                        "success" => false, 
                        "error" => "duplicate"
                    ];
                }
                return [
                    "success" => false, 
                    "error" => "Error creating user: " . $e->getMessage()
                ];
            }
        }
        public static function softDeleteUser($id) {
            $query = "UPDATE users SET status = 'INACTIVE' WHERE user_id = ?";
            
            $stmt = self::$conn->prepare($query);
            if (!$stmt) {
                throw new Exception("Failed to prepare statement: " . self::$conn->error);
            }

            // Use "s" if user_id is a string/UUID, otherwise "i" for integer
            $bindType = is_numeric($id) ? "i" : "s";
            $stmt->bind_param($bindType, $id);
            
            $stmt->execute();
            $affectedRows = $stmt->affected_rows;
            $stmt->close();

            return $affectedRows;

        }
        public static function updateUser(
            int $user_id,
            string $username,
            string $first_name,
            string $middle_name,
            string $last_name,
            string $contact_no,
            string $email,
            int $role_id,
            string $status = 'ACTIVE'
        ) {
            $query = 'UPDATE users 
                    SET username = ?, 
                        first_name = ?, 
                        middle_name = ?, 
                        last_name = ?, 
                        contact_no = ?, 
                        email = ?, 
                        role_id = ?, 
                        status = ? 
                    WHERE user_id = ?';

            $stmt = self::$conn->prepare($query);
            $stmt->bind_param(
                "ssssssisi",
                $username,
                $first_name,
                $middle_name,
                $last_name,
                $contact_no,
                $email,
                $role_id,
                $status,
                $user_id
            );

            try {
                $stmt->execute();
                return ["success" => true];
            } catch (\mysqli_sql_exception $e) {
                if ($e->getCode() === 1062) {
                    return [
                        "success" => false, 
                        "error" => "duplicate"
                    ];
                }
                return [
                    "success" => false, 
                    "error" => "Error updating user: " . $e->getMessage()
                ];
            } catch (\Exception $e) {
                return [
                    "success" => false, 
                    "error" => "Error updating user: " . $e->getMessage()
                ];
            }
        }
    }
    
?>