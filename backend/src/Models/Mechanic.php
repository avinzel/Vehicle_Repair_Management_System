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

                $userIds = [];
                $userStmt = self::$conn->prepare("SELECT mechanic_id, user_id FROM mechanics");
                if (!$userStmt) {
                    throw new \Exception("Failed to prepare mechanic account lookup: " . self::$conn->error);
                }
                $userStmt->execute();
                $userResult = $userStmt->get_result();
                while ($userResult && ($row = $userResult->fetch_assoc())) {
                    $userIds[(int)$row['mechanic_id']] = (int)$row['user_id'];
                }
                $userStmt->close();

                foreach ($mechanics as &$mechanic) {
                    $mechanic['user_id'] = $userIds[(int)$mechanic['mechanic_id']] ?? null;
                }
                unset($mechanic);

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
            $stmt = null;
            try {
                self::$conn->begin_transaction();

                $stmt = self::$conn->prepare(
                    "INSERT INTO mechanics (user_id, specialization, date_hired, status) VALUES (?, ?, ?, ?)"
                );
                if (!$stmt) {
                    throw new Exception("Prepare failed: " . self::$conn->error, self::$conn->errno);
                }

                $stmt->bind_param("isss", $userId, $specialization, $dateHired, $status);
                if (!$stmt->execute()) {
                    throw new Exception($stmt->error, $stmt->errno);
                }
                $mechanicId = (int)$stmt->insert_id;
                $stmt->close();
                $stmt = null;

                $stmt = self::$conn->prepare("UPDATE users SET status = ? WHERE user_id = ?");
                if (!$stmt) {
                    throw new Exception("Prepare failed: " . self::$conn->error, self::$conn->errno);
                }
                $stmt->bind_param("si", $status, $userId);
                $stmt->execute();
                if ($stmt->affected_rows === 0) {
                    $check = self::$conn->prepare("SELECT user_id FROM users WHERE user_id = ?");
                    if (!$check) {
                        throw new Exception("Prepare failed: " . self::$conn->error, self::$conn->errno);
                    }
                    $check->bind_param("i", $userId);
                    $check->execute();
                    $exists = $check->get_result()->num_rows > 0;
                    $check->close();
                    if (!$exists) {
                        throw new Exception("Staff account not found.", 1452);
                    }
                }
                $stmt->close();

                self::$conn->commit();
                return $mechanicId;
            } catch (\Throwable $e) {
                if ($stmt) {
                    $stmt->close();
                }
                self::$conn->rollback();
                throw new Exception($e->getMessage(), (int)$e->getCode(), $e);
            }
        }
        // PUT (Update Mechanic)
        public function updateMechanic($mechanicId, $specialization, $dateHired, $status) {
            $stmt = null;
            try {
                self::$conn->begin_transaction();
                $stmt = self::$conn->prepare("SELECT user_id FROM mechanics WHERE mechanic_id = ? FOR UPDATE");
                if (!$stmt) {
                    throw new Exception("Prepare failed: " . self::$conn->error);
                }
                $stmt->bind_param("i", $mechanicId);
                $stmt->execute();
                $result = $stmt->get_result();
                $mechanic = $result ? $result->fetch_assoc() : null;
                $stmt->close();
                $stmt = null;

                if (!$mechanic) {
                    self::$conn->rollback();
                    return 0;
                }
                $userId = (int)$mechanic['user_id'];

                if ($status === 'INACTIVE') {
                    $activeOrderCount = $this->getActiveOrderCount((int)$mechanicId);
                    if ($activeOrderCount > 0) {
                        self::$conn->rollback();
                        throw new Exception(
                            "Cannot deactivate mechanic: this mechanic still has active orders. Complete or reassign them first.",
                            1644
                        );
                    }
                }

                $stmt = self::$conn->prepare(
                    "UPDATE mechanics SET specialization = ?, date_hired = ?, status = ? WHERE mechanic_id = ?"
                );
                if (!$stmt) {
                    throw new Exception("Prepare failed: " . self::$conn->error);
                }
                $stmt->bind_param("sssi", $specialization, $dateHired, $status, $mechanicId);
                $stmt->execute();
                $stmt->close();
                $stmt = null;

                $stmt = self::$conn->prepare("UPDATE users SET status = ? WHERE user_id = ?");
                if (!$stmt) {
                    throw new Exception("Prepare failed: " . self::$conn->error);
                }
                $stmt->bind_param("si", $status, $userId);
                $stmt->execute();
                $stmt->close();

                self::$conn->commit();
                return 1;
            } catch (\Throwable $e) {
                if ($stmt) {
                    $stmt->close();
                }
                self::$conn->rollback();
                throw new Exception("Failed to update mechanic and linked account: " . $e->getMessage(), (int)$e->getCode(), $e);
            }
        }

        // DELETE (Soft Delete Mechanic)
        public function softDeleteMechanic($mechanicId) {
            $stmt = null;
            try {
                self::$conn->begin_transaction();
                $stmt = self::$conn->prepare("SELECT user_id FROM mechanics WHERE mechanic_id = ? FOR UPDATE");
                if (!$stmt) {
                    throw new Exception("Prepare failed: " . self::$conn->error);
                }
                $stmt->bind_param("i", $mechanicId);
                $stmt->execute();
                $result = $stmt->get_result();
                $mechanic = $result ? $result->fetch_assoc() : null;
                $stmt->close();
                $stmt = null;

                if (!$mechanic) {
                    self::$conn->rollback();
                    return 0;
                }
                $userId = (int)$mechanic['user_id'];

                if ($this->getActiveOrderCount((int)$mechanicId) > 0) {
                    self::$conn->rollback();
                    throw new Exception(
                        "Cannot deactivate mechanic: this mechanic still has active orders. Complete or reassign them first.",
                        1644
                    );
                }

                $stmt = self::$conn->prepare("UPDATE mechanics SET status = 'INACTIVE' WHERE mechanic_id = ?");
                if (!$stmt) {
                    throw new Exception("Prepare failed: " . self::$conn->error);
                }
                $stmt->bind_param("i", $mechanicId);
                $stmt->execute();
                $stmt->close();
                $stmt = null;

                $stmt = self::$conn->prepare("UPDATE users SET status = 'INACTIVE' WHERE user_id = ?");
                if (!$stmt) {
                    throw new Exception("Prepare failed: " . self::$conn->error);
                }
                $stmt->bind_param("i", $userId);
                $stmt->execute();
                $stmt->close();

                self::$conn->commit();
                return 1;
            } catch (\Throwable $e) {
                if ($stmt) {
                    $stmt->close();
                }
                self::$conn->rollback();
                throw new Exception("Failed to deactivate mechanic and linked account: " . $e->getMessage(), (int)$e->getCode(), $e);
            }
        }

        private function getActiveOrderCount($mechanicId) {
            $stmt = self::$conn->prepare(
                "SELECT COUNT(DISTINCT ro.order_id) AS active_order_count
                 FROM repair_order_mechanics rom
                 JOIN repair_orders ro ON ro.order_id = rom.order_id
                 WHERE rom.mechanic_id = ?
                   AND ro.status IN (
                       'PENDING_DIAGNOSIS', 'AWAITING_DIAGNOSIS', 'PENDING_MECHANICS',
                       'IN_PROGRESS', 'AWAITING_PARTS'
                   )"
            );
            if (!$stmt) {
                throw new Exception("Failed to prepare active-order check: " . self::$conn->error);
            }
            $stmt->bind_param("i", $mechanicId);
            $stmt->execute();
            $count = (int)$stmt->get_result()->fetch_assoc()['active_order_count'];
            $stmt->close();
            return $count;
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