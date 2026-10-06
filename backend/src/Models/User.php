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
/**
         * Fetches staff members with support for searching, filtering (role, status), and dynamic sorting (including date).
         * 
         * @param string|null $search    Search keyword
         * @param int|null    $roleId    Filter by role_id
         * @param string|null $status    Filter by status ('ACTIVE', 'INACTIVE', or 'ALL')
         * @param string      $sortBy    Field to sort by ('full_name', 'role_name', 'status', 'date')
         * @param string      $sortOrder Sort direction ('ASC' or 'DESC')
         * @return array|false
         */
    public static function getStaffMembers(
            $search = null, 
            $roleId = null, 
            $status = null, 
            $sortBy = 'user_id', 
            $sortOrder = 'ASC'
        ) {
            $query = "CALL sp_GetStaffMembers(?, ?, ?, ?, ?)";

            try {
                $stmt = self::$conn->prepare($query);

                if (!$stmt) {
                    throw new \Exception("Prepare failed: " . self::$conn->error);
                }

                // Sanitize parameters
                $searchVal    = empty($search) ? null : $search;
                $roleIdVal    = (!empty($roleId) && is_numeric($roleId) && (int)$roleId > 0) ? (int)$roleId : null;
                $statusVal    = empty($status) || $status === 'ALL' ? null : $status;
                $sortByVal    = empty($sortBy) ? 'user_id' : $sortBy;
                $sortOrderVal = strtoupper($sortOrder) === 'DESC' ? 'DESC' : 'ASC';

                $stmt->bind_param(
                    "sisss", 
                    $searchVal, 
                    $roleIdVal, 
                    $statusVal, 
                    $sortByVal, 
                    $sortOrderVal
                );

                $stmt->execute();
                $result = $stmt->get_result();
                $data = $result ? $result->fetch_all(MYSQLI_ASSOC) : [];

                if ($result) {
                    $result->free();
                }

                $stmt->close();

                // Clear result set buffer for stored procedures
                while (self::$conn->more_results() && self::$conn->next_result()) {
                    if ($extraResult = self::$conn->use_result()) {
                        $extraResult->free();
                    }
                }

                // Count active members in the returned result set
                $activeCount = count(array_filter($data, function ($member) {
                    return isset($member['status']) && strtoupper($member['status']) === 'ACTIVE';
                }));

                return [
                    'active_count' => $activeCount,
                    'data'         => $data
                ];

            } catch (\Exception $e) {
                return false;
            }
        }
            /**
         * Get mechanic_id associated with a given user_id
         * 
         * @param int $userId
         * @return int|null|false
         */
        public static function getMechanicIdByUserId(int $userId) {
            $query = "SELECT mechanic_id FROM mechanics WHERE user_id = ?";
            
            $stmt = self::$conn->prepare($query);
            if (!$stmt) {
                return false;
            }

            $stmt->bind_param("i", $userId);

            try {
                $stmt->execute();
                $result = $stmt->get_result();
                $row = $result->fetch_assoc();
                $stmt->close();

                return $row ? (int)$row['mechanic_id'] : null;
            } catch (\Exception $e) {
                return false;
            }
        }
    }
    
?>