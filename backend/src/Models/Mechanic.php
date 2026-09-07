<?php
    namespace App\Models ;
    use App\Config\Database;
    use Exception;
    class Mechanic{
        private static $conn;

        public function __construct()
        {
            self::$conn =  Database::getConnection();
        }

        public static function getAllMechanics() {
            $query = "CALL get_all_mechanics()"; 

            $stmt = self::$conn->prepare($query); 

            try {
                $stmt->execute();
                $result = $stmt->get_result();

                $mechanics = [];
                while ($row = $result->fetch_assoc()) {
                    $mechanics[] = $row;
                }

                $stmt->close();
                // Clear any stored procedure multi-result sets to prevent "Commands out of sync" errors
                self::$conn->next_result();

                return [
                    "success" => true,
                    "data" => $mechanics
                ];
            } catch (\Exception $e) {
                return [
                    "success" => false,
                    "error" => "Error fetching mechanics: " . $e->getMessage()
                ];
            }
        }

// POST (Create Mechanic)
        public function createMechanic($userId, $specialization, $dateHired, $status = 'ACTIVE') {
            $query = "INSERT INTO mechanics (user_id, specialization, date_hired, status) VALUES (?, ?, ?, ?)";
            
            $stmt = self::$conn->prepare($query);
            if (!$stmt) {
                throw new Exception("Prepare failed: " . self::$conn->error);
            }

            $stmt->bind_param("isss", $userId, $specialization, $dateHired, $status);
            
            if ($stmt->execute()) {
                $newId = $stmt->insert_id;
                $stmt->close();
                return $newId;
            }

            $stmt->close();
            return false;
        }

        // PUT (Update Mechanic)
        public function updateMechanic($mechanicId, $userId, $specialization, $dateHired, $status) {
            $query = "UPDATE mechanics 
                    SET user_id = ?, specialization = ?, date_hired = ?, status = ? 
                    WHERE mechanic_id = ?";
            
            $stmt = self::$conn->prepare($query);
            if (!$stmt) {
                throw new Exception("Prepare failed: " . self::$conn->error);
            }

            $stmt->bind_param("isssi", $userId, $specialization, $dateHired, $status, $mechanicId);
            
            $stmt->execute();
            $affectedRows = $stmt->affected_rows;
            $stmt->close();

            return $affectedRows;
        }

        // DELETE (Soft Delete Mechanic)
        public function softDeleteMechanic($mechanicId) {
            $query = "UPDATE mechanics SET status = 'INACTIVE' WHERE mechanic_id = ?";
            
            $stmt = self::$conn->prepare($query);
            if (!$stmt) {
                throw new Exception("Prepare failed: " . self::$conn->error);
            }

            $stmt->bind_param("i", $mechanicId);
            
            $stmt->execute();
            $affectedRows = $stmt->affected_rows;
            $stmt->close();

            return $affectedRows;
        }
    }

    
?>