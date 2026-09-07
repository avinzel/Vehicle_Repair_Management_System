<?php
    namespace App\Models;
    use App\Config\Database;
    
    class Role {
        private static $conn;
        
        public function __construct(Database $db)
        {
            self::$conn = Database::getConnection();
        }

        public static function getAllRoles(){
            $query = "SELECT * FROM roles"; //procedure  
            $stmt = self::$conn->prepare($query);
            try {
                $stmt->execute();
                $result = $stmt->get_result();
                $data = $result->fetch_all(MYSQLI_ASSOC);
                return $data;
            } catch (\Exception $e) {
                return false;
            }
        }
    }
?>