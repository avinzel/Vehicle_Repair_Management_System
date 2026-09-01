<?php
    namespace App\Models;

    use App\Config\Database;
    class User{
        private $conn;
        public function __construct(Database $db){
            $this->conn = $db->getConnection();
        }

        public function getAllUsers(){
            $query = "SELECT * FROM users"; //procedure
            $stmt = $this->conn->prepare($query);
            try {
                $stmt->execute();
                $result = $stmt->get_result();
                return $result->fetch_all(MYSQLI_ASSOC);
            } catch (\Exception $e) {
                return false;
            }
        }

        public function getUserById(int $id){
            $query = "SELECT * FROM users WHERE id = ?"; //procedure
            $stmt = $this->conn->prepare($query);
            $stmt->bind_param("i", $id);
            try {
                $stmt->execute();
                $result = $stmt->get_result();
                return $result->fetch_assoc();
            } catch (\Exception $e) {
                return false;
            }
        }

        public function createUser(
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
            $stmt = $this->conn->prepare($query);
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
                return true;
            } catch (\Exception $e) {
                // Handle the exception (e.g., log it, rethrow it, etc.)
                error_log("Error creating user: " . $e->getMessage());
                return false;
            }
        }

    }
?>