<?php
    namespace App\Models;

    use App\Config\Database;
    use Exception;
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

        public function getAdminSummaryCards()
        {
            try {
                $query = "CALL sp_get_dashboard_summary_cards()";
                $stmt = self::$conn->prepare($query);

                if (!$stmt) {
                    throw new Exception("Prepare failed: " . self::$conn->error);
                }

                $stmt->execute();
                $result = $stmt->get_result();
                $data = $result ? $result->fetch_assoc() : null;
                $stmt->close();

                // Clear remaining stored procedure result sets from MySQLi connection buffer
                while (self::$conn->more_results() && self::$conn->next_result()) {
                    if ($extraResult = self::$conn->use_result()) {
                        $extraResult->free();
                    }
                }

                return [
                    "success" => true,
                    "data"    => $data
                ];

            } catch (Exception $e) {
                return [
                    "success" => false,
                    "error"   => "Database operation failed: " . $e->getMessage()
                ];
            }
        }
        public function getPipelineStatusCounts()
        {
            try {
                $query = "CALL sp_get_pipeline_status_counts()";
                $stmt = self::$conn->prepare($query);

                if (!$stmt) {
                    throw new Exception("Prepare failed: " . self::$conn->error);
                }

                $stmt->execute();
                $result = $stmt->get_result();
                $row = $result ? $result->fetch_assoc() : null;
                $stmt->close();

                // Clear connection buffer
                while (self::$conn->more_results() && self::$conn->next_result()) {
                    if ($extraResult = self::$conn->use_result()) {
                        $extraResult->free();
                    }
                }

                $keys = [
                    'pending_diagnosis',
                    'awaiting_diagnosis',
                    'pending_mechanics',
                    'in_progress',
                    'awaiting_parts',
                    'ready_to_invoice',
                    'awaiting_payment',
                    'ready_for_release'
                ];

                $statuses = [];
                foreach ($keys as $key) {
                    $statuses[$key] = [
                        "label"      => ucwords(str_replace('_', ' ', $key)),
                        "count"      => (int)($row[$key] ?? 0),
                        "percentage" => (float)($row[$key . '_pct'] ?? 0)
                    ];
                }

                return [
                    "success" => true,
                    "data"    => [
                        "total"    => (int)($row['total'] ?? 0),
                        "statuses" => $statuses
                    ]
                ];

            } catch (Exception $e) {
                return [
                    "success" => false,
                    "error"   => "Database operation failed: " . $e->getMessage()
                ];
            }
        }
        public function getRecentRepairOrders($limit = 5)
        {
            try {
                $query = "CALL sp_get_recent_repair_orders(?)";
                $stmt = self::$conn->prepare($query);

                if (!$stmt) {
                    throw new Exception("Prepare failed: " . self::$conn->error);
                }

                $stmt->bind_param("i", $limit);
                $stmt->execute();
                $result = $stmt->get_result();
                $data = $result ? $result->fetch_all(MYSQLI_ASSOC) : [];
                $stmt->close();

                // Clear connection buffer for multi-query execution
                while (self::$conn->more_results() && self::$conn->next_result()) {
                    if ($extraResult = self::$conn->use_result()) {
                        $extraResult->free();
                    }
                }

                return [
                    "success" => true,
                    "data"    => $data
                ];

            } catch (Exception $e) {
                return [
                    "success" => false,
                    "error"   => "Database operation failed: " . $e->getMessage()
                ];
            }
        }
        public function getRevenueByOrder($limit = 10, $status = null)
        {
            try {
                $query = "CALL sp_get_revenue_by_order(?, ?)";
                $stmt = self::$conn->prepare($query);

                if (!$stmt) {
                    throw new Exception("Prepare failed: " . self::$conn->error);
                }

                $stmt->bind_param("is", $limit, $status);
                $stmt->execute();
                $result = $stmt->get_result();
                $data = $result ? $result->fetch_all(MYSQLI_ASSOC) : [];
                $stmt->close();

                // Clear connection buffer for stored procedure multi-result set execution
                while (self::$conn->more_results() && self::$conn->next_result()) {
                    if ($extraResult = self::$conn->use_result()) {
                        $extraResult->free();
                    }
                }

                return [
                    "success" => true,
                    "data"    => $data
                ];

            } catch (Exception $e) {
                return [
                    "success" => false,
                    "error"   => "Database operation failed: " . $e->getMessage()
                ];
            }
        }
        public function getRevenueSplit()
        {
            try {
                $query = "CALL sp_get_revenue_split()";
                $stmt = self::$conn->prepare($query);

                if (!$stmt) {
                    throw new Exception("Prepare failed: " . self::$conn->error);
                }

                $stmt->execute();
                $result = $stmt->get_result();
                $data = $result ? $result->fetch_assoc() : null;
                $stmt->close();

                // Clear remaining stored procedure result sets from connection buffer
                while (self::$conn->more_results() && self::$conn->next_result()) {
                    if ($extraResult = self::$conn->use_result()) {
                        $extraResult->free();
                    }
                }

                return [
                    "success" => true,
                    "data"    => $data
                ];

            } catch (Exception $e) {
                return [
                    "success" => false,
                    "error"   => "Database operation failed: " . $e->getMessage()
                ];
            }
        }

        public function getPipelineStatusCountsOverall()
        {
            try {
                $query = "CALL sp_get_pipeline_status_counts_overall()";
                $stmt = self::$conn->prepare($query);

                if (!$stmt) {
                    throw new Exception("Prepare failed: " . self::$conn->error);
                }

                $stmt->execute();
                $result = $stmt->get_result();
                $data = $result ? $result->fetch_all(MYSQLI_ASSOC) : [];
                $stmt->close();

                // Clear remaining result sets from MySQLi connection buffer
                while (self::$conn->more_results() && self::$conn->next_result()) {
                    if ($extraResult = self::$conn->use_result()) {
                        $extraResult->free();
                    }
                }

                // Calculate grand total by summing up the count column across all statuses
                $grandTotal = array_sum(array_column($data, 'count'));

                return [
                    "success"     => true,
                    "grand_total" => $grandTotal,
                    "data"        => $data
                ];

            } catch (Exception $e) {
                return [
                    "success" => false,
                    "error"   => "Database operation failed: " . $e->getMessage()
                ];
            }
        }
        public function getPartsInventoryCards()
        {
            try {
                $query = "CALL sp_get_parts_inventory_cards()";
                $stmt = self::$conn->prepare($query);

                if (!$stmt) {
                    throw new Exception("Prepare failed: " . self::$conn->error);
                }

                $stmt->execute();
                $result = $stmt->get_result();
                $data = $result ? $result->fetch_assoc() : null;
                $stmt->close();

                // Clear connection buffer for stored procedure execution
                while (self::$conn->more_results() && self::$conn->next_result()) {
                    if ($extraResult = self::$conn->use_result()) {
                        $extraResult->free();
                    }
                }

                return [
                    "success" => true,
                    "data"    => $data
                ];

            } catch (Exception $e) {
                return [
                    "success" => false,
                    "error"   => "Database operation failed: " . $e->getMessage()
                ];
            }
        }
        public function getTopPartsUsed($limit = 100)
        {
            try {
                $query = "CALL sp_top_parts_used(?)";
                $stmt = self::$conn->prepare($query);

                if (!$stmt) {
                    throw new Exception("Prepare failed: " . self::$conn->error);
                }

                $stmt->bind_param("i", $limit);
                $stmt->execute();
                $result = $stmt->get_result();
                $data = $result ? $result->fetch_all(MYSQLI_ASSOC) : [];
                $stmt->close();

                // Clear connection buffer for stored procedure execution
                while (self::$conn->more_results() && self::$conn->next_result()) {
                    if ($extraResult = self::$conn->use_result()) {
                        $extraResult->free();
                    }
                }

                return [
                    "success" => true,
                    "data"    => $data
                ];

            } catch (Exception $e) {
                return [
                    "success" => false,
                    "error"   => "Database operation failed: " . $e->getMessage()
                ];
            }
        }
        public function getMechanicOrderLoad()
        {
            try {
                $query = "CALL sp_mechanic_order_load()";
                $stmt = self::$conn->prepare($query);

                if (!$stmt) {
                    throw new Exception("Prepare failed: " . self::$conn->error);
                }

                $stmt->execute();
                $result = $stmt->get_result();
                $data = $result ? $result->fetch_all(MYSQLI_ASSOC) : [];
                $stmt->close();

                // Clear connection buffer for stored procedure execution
                while (self::$conn->more_results() && self::$conn->next_result()) {
                    if ($extraResult = self::$conn->use_result()) {
                        $extraResult->free();
                    }
                }

                return [
                    "success" => true,
                    "data"    => $data
                ];

            } catch (Exception $e) {
                return [
                    "success" => false,
                    "error"   => "Database operation failed: " . $e->getMessage()
                ];
            }
        }
        public function getMechanicOrderCards($limit = 10)
            {
                try {
                    $query = "CALL sp_mechanic_order_cards(?)";
                    $stmt = self::$conn->prepare($query);

                    if (!$stmt) {
                        throw new Exception("Prepare failed: " . self::$conn->error);
                    }

                    $stmt->bind_param("i", $limit);
                    $stmt->execute();
                    $result = $stmt->get_result();
                    $rows = $result ? $result->fetch_all(MYSQLI_ASSOC) : [];
                    $stmt->close();

                    // Clear connection buffer for stored procedure execution
                    while (self::$conn->more_results() && self::$conn->next_result()) {
                        if ($extraResult = self::$conn->use_result()) {
                            $extraResult->free();
                        }
                    }

                    // Group flat rows into one card per mechanic
                    $cards = [];
                    foreach ($rows as $row) {
                        $id = $row['mechanic_id'];

                        if (!isset($cards[$id])) {
                            $cards[$id] = [
                                "mechanic_id"      => (int)$id,
                                "full_name"        => $row['full_name'],
                                "position_name"    => $row['position_name'],
                                "total_orders"     => (int)$row['total_orders'],
                                "completed_orders" => (int)$row['completed_orders'],
                                "completion_rate"  => (int)$row['completion_rate'],
                                "orders"           => []
                            ];
                        }

                        if ($row['order_id'] !== null) {
                            $cards[$id]['orders'][] = [
                                "order_id"      => (int)$row['order_id'],
                                "order_code"    => $row['order_code'],
                                "customer_name" => $row['customer_name'],
                                "status"        => $row['order_status']
                            ];
                        }
                    }

                    return [
                        "success" => true,
                        "data"    => array_values($cards)
                    ];

                } catch (Exception $e) {
                    return [
                        "success" => false,
                        "error"   => "Database operation failed: " . $e->getMessage()
                    ];
                }
            }
    }
?>