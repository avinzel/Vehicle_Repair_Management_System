<?php
    namespace App\Models;

    use App\Config\Database;

    class RepairOrder{
        private static $conn;
 
        public function __construct()
        {
            self::$conn = Database::getConnection();
        }

        public function getServiceAdvisorTable(){
        $query = "CALL sp_populate_dashboard_table()"; 
        $stmt = self::$conn->prepare($query);
        $stmt->execute();
        $result = $stmt->get_result();
        return $result->fetch_all(MYSQLI_ASSOC);
        }
    }
?>