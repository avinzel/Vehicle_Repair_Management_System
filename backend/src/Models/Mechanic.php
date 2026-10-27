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
        public function updateMechanic($mechanicId, $specialization, $dateHired, $status, $handoffs = [], $actorUserId = null) {
            $stmt = null;
            try {
                self::$conn->begin_transaction();
                $stmt = self::$conn->prepare("SELECT user_id, status FROM mechanics WHERE mechanic_id = ? FOR UPDATE");
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
                    $this->handoffOpenAssignments((int)$mechanicId, $handoffs, $actorUserId);
                } elseif (!empty($handoffs)) {
                    throw new Exception("Assignments can only be handed off while deactivating a mechanic.", 1644);
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
                        "Cannot deactivate this mechanic because they are assigned to active repair orders. Complete or reassign those orders first.",
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
                if ((int)$e->getCode() === 1644) {
                    throw new Exception($e->getMessage(), 1644, $e);
                }
                throw new Exception("Failed to deactivate mechanic and linked account: " . $e->getMessage(), (int)$e->getCode(), $e);
            }
        }

        public static function getOpenAssignments($mechanicId) {
            $stmt = self::$conn->prepare(
                "SELECT rom.assignment_id, rom.order_id, rom.position_id, mp.position_name,
                        ro.status AS order_status, ro.complaint,
                        GROUP_CONCAT(DISTINCT rom2.mechanic_id ORDER BY rom2.mechanic_id) AS assigned_mechanic_ids
                 FROM repair_order_mechanics rom
                 JOIN repair_orders ro ON ro.order_id = rom.order_id
                 JOIN mechanic_positions mp ON mp.position_id = rom.position_id
                 LEFT JOIN repair_order_mechanics rom2 ON rom2.order_id = rom.order_id
                 WHERE rom.mechanic_id = ?
                   AND ro.status IN (
                       'PENDING_DIAGNOSIS', 'AWAITING_DIAGNOSIS', 'PENDING_MECHANICS',
                       'IN_PROGRESS', 'AWAITING_PARTS'
                   )
                 GROUP BY rom.assignment_id, rom.order_id, rom.position_id, mp.position_name,
                          ro.status, ro.complaint
                 ORDER BY rom.order_id, rom.assignment_id"
            );
            if (!$stmt) {
                throw new Exception("Failed to prepare open-assignment lookup: " . self::$conn->error);
            }
            $stmt->bind_param("i", $mechanicId);
            if (!$stmt->execute()) {
                throw new Exception("Failed to load open assignments: " . $stmt->error);
            }

            $result = $stmt->get_result();
            $assignments = [];
            while ($row = $result->fetch_assoc()) {
                $row['assigned_mechanic_ids'] = $row['assigned_mechanic_ids'] === null
                    ? []
                    : array_map('intval', explode(',', $row['assigned_mechanic_ids']));
                $assignments[] = $row;
            }
            $stmt->close();
            return $assignments;
        }

        public static function getActiveHandoffCandidates($mechanicId) {
            $stmt = self::$conn->prepare(
                "SELECT m.mechanic_id AS id, CONCAT(u.first_name, ' ', u.last_name) AS name
                 FROM mechanics m
                 JOIN users u ON u.user_id = m.user_id
                 WHERE m.mechanic_id <> ?
                   AND m.status = 'ACTIVE'
                   AND u.status = 'ACTIVE'
                 ORDER BY u.first_name, u.last_name, m.mechanic_id"
            );
            if (!$stmt) {
                throw new Exception("Failed to prepare handoff-candidate lookup: " . self::$conn->error);
            }
            $stmt->bind_param("i", $mechanicId);
            if (!$stmt->execute()) {
                throw new Exception("Failed to load active handoff candidates: " . $stmt->error);
            }

            $result = $stmt->get_result();
            $candidates = [];
            while ($row = $result->fetch_assoc()) {
                $row['id'] = (int)$row['id'];
                $candidates[] = $row;
            }
            $stmt->close();
            return $candidates;
        }

        private function handoffOpenAssignments($mechanicId, $handoffs, $actorUserId) {
            if (!is_array($handoffs) || $actorUserId === null) {
                throw new Exception("Valid handoff assignments and an authenticated admin are required.", 1644);
            }

            $stmt = self::$conn->prepare(
                "SELECT ro.order_id
                 FROM repair_orders ro
                 WHERE ro.status IN (
                     'PENDING_DIAGNOSIS', 'AWAITING_DIAGNOSIS', 'PENDING_MECHANICS',
                     'IN_PROGRESS', 'AWAITING_PARTS'
                 )
                   AND EXISTS (
                       SELECT 1
                       FROM repair_order_mechanics rom
                       WHERE rom.order_id = ro.order_id AND rom.mechanic_id = ?
                   )
                 ORDER BY ro.order_id
                 FOR UPDATE"
            );
            if (!$stmt) {
                throw new Exception("Failed to prepare open-order lock: " . self::$conn->error);
            }
            $stmt->bind_param("i", $mechanicId);
            if (!$stmt->execute()) {
                throw new Exception("Failed to lock open repair orders: " . $stmt->error);
            }
            $stmt->get_result()->free();
            $stmt->close();

            $stmt = self::$conn->prepare(
                "SELECT rom.assignment_id, rom.order_id, rom.mechanic_id, rom.position_id,
                        rom.date_assigned, ro.status, mp.position_name
                 FROM repair_order_mechanics rom
                 JOIN repair_orders ro ON ro.order_id = rom.order_id
                 JOIN mechanic_positions mp ON mp.position_id = rom.position_id
                 WHERE rom.mechanic_id = ?
                   AND ro.status IN (
                       'PENDING_DIAGNOSIS', 'AWAITING_DIAGNOSIS', 'PENDING_MECHANICS',
                       'IN_PROGRESS', 'AWAITING_PARTS'
                   )
                 ORDER BY ro.order_id, rom.assignment_id
                 FOR UPDATE"
            );
            if (!$stmt) {
                throw new Exception("Failed to prepare open-assignment lock: " . self::$conn->error);
            }
            $stmt->bind_param("i", $mechanicId);
            if (!$stmt->execute()) {
                throw new Exception("Failed to lock open assignments: " . $stmt->error);
            }
            $result = $stmt->get_result();
            $openAssignments = [];
            while ($row = $result->fetch_assoc()) {
                $openAssignments[(int)$row['assignment_id']] = $row;
            }
            $stmt->close();

            $replacementIds = [];
            foreach ($handoffs as $handoff) {
                if (!is_array($handoff)
                    || !isset($handoff['assignment_id'], $handoff['replacement_mechanic_id'])
                    || filter_var($handoff['assignment_id'], FILTER_VALIDATE_INT) === false
                    || filter_var($handoff['replacement_mechanic_id'], FILTER_VALIDATE_INT) === false
                    || (int)$handoff['assignment_id'] <= 0
                    || (int)$handoff['replacement_mechanic_id'] <= 0
                ) {
                    throw new Exception("Each handoff must include a valid assignment_id and replacement_mechanic_id.", 1644);
                }

                $assignmentId = (int)$handoff['assignment_id'];
                if (!isset($openAssignments[$assignmentId]) || isset($replacementIds[$assignmentId])) {
                    throw new Exception("The mechanic's open assignments changed. Refresh and try again.", 1644);
                }
                $replacementIds[$assignmentId] = (int)$handoff['replacement_mechanic_id'];
            }

            if (count($replacementIds) !== count($openAssignments)) {
                throw new Exception("Choose an active replacement for every open repair-order assignment.", 1644);
            }

            $replacementByOrder = [];
            foreach ($openAssignments as $assignmentId => $assignment) {
                $replacementId = $replacementIds[$assignmentId];
                $orderId = (int)$assignment['order_id'];
                if ($replacementId === $mechanicId) {
                    throw new Exception("A mechanic cannot replace themselves.", 1644);
                }
                if (isset($replacementByOrder[$orderId][$replacementId])) {
                    throw new Exception("A replacement mechanic cannot hold multiple positions on the same order.", 1644);
                }
                $replacementByOrder[$orderId][$replacementId] = true;

                $stmt = self::$conn->prepare(
                    "SELECT m.mechanic_id
                     FROM mechanics m
                     JOIN users u ON u.user_id = m.user_id
                     WHERE m.mechanic_id = ? AND m.status = 'ACTIVE' AND u.status = 'ACTIVE'
                     FOR UPDATE"
                );
                if (!$stmt) {
                    throw new Exception("Failed to prepare replacement-mechanic validation: " . self::$conn->error);
                }
                $stmt->bind_param("i", $replacementId);
                if (!$stmt->execute()) {
                    throw new Exception("Failed to validate replacement mechanic: " . $stmt->error);
                }
                $isActive = $stmt->get_result()->num_rows === 1;
                $stmt->close();
                if (!$isActive) {
                    throw new Exception("Every replacement must be an active mechanic with an active staff account.", 1644);
                }

                $stmt = self::$conn->prepare(
                    "SELECT assignment_id
                     FROM repair_order_mechanics
                     WHERE order_id = ? AND mechanic_id = ? AND assignment_id <> ?
                     FOR UPDATE"
                );
                if (!$stmt) {
                    throw new Exception("Failed to prepare duplicate-assignment check: " . self::$conn->error);
                }
                $stmt->bind_param("iii", $orderId, $replacementId, $assignmentId);
                if (!$stmt->execute()) {
                    throw new Exception("Failed to check replacement assignment: " . $stmt->error);
                }
                $alreadyAssigned = $stmt->get_result()->num_rows > 0;
                $stmt->close();
                if ($alreadyAssigned) {
                    throw new Exception("A selected replacement is already assigned to repair order RO-" . $orderId . ".", 1644);
                }

                $stmt = self::$conn->prepare(
                    "INSERT INTO repair_order_mechanic_handoffs
                        (assignment_id, order_id, mechanic_id, position_id, date_assigned,
                         replacement_mechanic_id, reassigned_by)
                     VALUES (?, ?, ?, ?, ?, ?, ?)"
                );
                if (!$stmt) {
                    throw new Exception("Failed to prepare assignment-history insert: " . self::$conn->error);
                }
                $oldMechanicId = (int)$assignment['mechanic_id'];
                $positionId = (int)$assignment['position_id'];
                $dateAssigned = $assignment['date_assigned'];
                $stmt->bind_param(
                    "iiiisii",
                    $assignmentId,
                    $orderId,
                    $oldMechanicId,
                    $positionId,
                    $dateAssigned,
                    $replacementId,
                    $actorUserId
                );
                if (!$stmt->execute()) {
                    throw new Exception("Failed to save assignment history: " . $stmt->error);
                }
                $stmt->close();

                $stmt = self::$conn->prepare(
                    "UPDATE repair_order_mechanics SET mechanic_id = ?, date_assigned = NOW()
                     WHERE assignment_id = ? AND mechanic_id = ?"
                );
                if (!$stmt) {
                    throw new Exception("Failed to prepare assignment handoff: " . self::$conn->error);
                }
                $stmt->bind_param("iii", $replacementId, $assignmentId, $mechanicId);
                if (!$stmt->execute() || $stmt->affected_rows !== 1) {
                    throw new Exception("The assignment changed during handoff. No changes were saved.", 1644);
                }
                $stmt->close();
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