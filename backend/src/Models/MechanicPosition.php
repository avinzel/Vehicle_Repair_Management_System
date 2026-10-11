<?php
    namespace App\Models;

    use App\Config\Database;
    use Exception;

    class MechanicPosition{
        private static $conn ;
        public function __construct(Database $db){
            self::$conn = Database::getConnection();
        }

        public static function getAllMechanicPositions() {
            header('Content-Type: application/json');

            if (!self::$conn) {
                http_response_code(500);
                echo json_encode(["success" => false, "error" => "Database connection error"]);
                return;
            }

            $query = "SELECT * FROM mechanic_positions";

            $stmt = self::$conn->prepare($query);
            if (!$stmt) {
                http_response_code(500);
                echo json_encode(["success" => false, "error" => "Failed to prepare query"]);
                return;
            }

            try {
                $stmt->execute();
                $result = $stmt->get_result();
                $positions = $result ? $result->fetch_all(MYSQLI_ASSOC) : [];
                $stmt->close();

                http_response_code(200);
                echo json_encode($positions);
            } catch (Exception $e) {
                http_response_code(500);
                echo json_encode(["success" => false, "error" => $e->getMessage()]);
            }
        }
    }
?>
