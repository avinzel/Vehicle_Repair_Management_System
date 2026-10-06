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
        public static function getAllMechanics(
            $search = null, 
            $status = null, 
            $sortBy = 'mechanic_id', 
            $sortOrder = 'ASC'
        ) {
            $query = "CALL get_all_mechanics(?, ?, ?, ?)";

            try {
                $stmt = self::$conn->prepare($query);

                if (!$stmt) {
                    throw new \Exception("Prepare failed: " . self::$conn->error);
                }

                // Sanitize parameters
                $searchVal    = empty($search) ? null : $search;
                $statusVal    = empty($status) || $status === 'ALL' ? null : $status;
                $sortByVal    = empty($sortBy) ? 'mechanic_id' : $sortBy;
                $sortOrderVal = strtoupper($sortOrder) === 'DESC' ? 'DESC' : 'ASC';

                $stmt->bind_param(
                    "ssss", 
                    $searchVal, 
                    $statusVal, 
                    $sortByVal, 
                    $sortOrderVal
                );

                $stmt->execute();
                $result = $stmt->get_result();

                $mechanics = [];
                if ($result) {
                    while ($row = $result->fetch_assoc()) {
                        $mechanics[] = $row;
                    }
                    $result->free();
                }

                $stmt->close();

                // Clear stored procedure multi-result sets to prevent "Commands out of sync" errors
                while (self::$conn->more_results() && self::$conn->next_result()) {
                    if ($extraResult = self::$conn->use_result()) {
                        $extraResult->free();
                    }
                }

        // Calculate active mechanics count from retrieved dataset (using 'mechanic_status')
                $activeCount = count(array_filter($mechanics, function ($mechanic) {
                    return isset($mechanic['mechanic_status']) && strtoupper($mechanic['mechanic_status']) === 'ACTIVE';
                }));

                return [
                    "success"      => true,
                    "active_count" => $activeCount,
                    "data"         => $mechanics
                ];

            } catch (\Exception $e) {
                return [
                    "success" => false,
                    "error"   => "Error fetching mechanics: " . $e->getMessage()
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

        // GET Available Mechanics (Not assigned to a specific repair order)
        public static function getAvailableMechanics($orderId) {
            $query = "CALL sp_get_available_mechanics(?)";

            try {
                $stmt = self::$conn->prepare($query);

                if (!$stmt) {
                    throw new Exception("Prepare failed: " . self::$conn->error);
                }

                $orderIdVal = (int)$orderId;
                $stmt->bind_param("i", $orderIdVal);
                $stmt->execute();

                $result = $stmt->get_result();
                $mechanics = [];

                if ($result) {
                    while ($row = $result->fetch_assoc()) {
                        $mechanics[] = $row;
                    }
                }

                $stmt->close();

                // Clear any stored procedure multi-result sets to prevent "Commands out of sync" errors
                while (self::$conn->more_results() && self::$conn->next_result()) {
                    if ($extraResult = self::$conn->use_result()) {
                        $extraResult->free();
                    }
                }

                return [
                    "success" => true,
                    "data" => $mechanics
                ];
            } catch (\Exception $e) {
                return [
                    "success" => false,
                    "error" => "Error fetching available mechanics: " . $e->getMessage()
                ];
            }
        }
    }

    
?>