<?php
    namespace App\Models;

    use App\Config\Database;

    class Reports{
        private static $conn;
 
        public function __construct()
        {
            self::$conn = Database::getConnection();
        }

        public function getServiceAdvisorCards(){
        $query = "CALL sp_populate_dashboard_cards()"; 
        $stmt = self::$conn->prepare($query);
        $stmt->execute();
        $result = $stmt->get_result();
        return $result->fetch_all(MYSQLI_ASSOC);
        }
    }
?>