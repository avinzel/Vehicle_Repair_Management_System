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
                $data = $result ? $result->fetch_assoc() : null;
                $stmt->close();

                // Clear connection buffer
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

        public function getMonthlyRevenue($year)
        {
            try {
                $stmt = self::$conn->prepare(
                    "SELECT MONTH(payment_date) AS month_number, SUM(total_amount) AS revenue
                     FROM invoices
                     WHERE status = 'PAID'
                       AND payment_date IS NOT NULL
                       AND YEAR(payment_date) = ?
                     GROUP BY MONTH(payment_date)
                     ORDER BY month_number"
                );
                if (!$stmt) {
                    throw new Exception("Prepare failed: " . self::$conn->error);
                }

                $yearValue = (int)$year;
                $stmt->bind_param("i", $yearValue);
                $stmt->execute();
                $result = $stmt->get_result();
                $revenueByMonth = [];
                while ($row = $result->fetch_assoc()) {
                    $revenueByMonth[(int)$row['month_number']] = (float)$row['revenue'];
                }
                $stmt->close();

                $months = [];
                $monthNames = [
                    1 => "January", "February", "March", "April", "May", "June",
                    "July", "August", "September", "October", "November", "December"
                ];
                $totalRevenue = 0.0;
                foreach ($monthNames as $monthNumber => $monthName) {
                    $revenue = $revenueByMonth[$monthNumber] ?? 0.0;
                    $months[] = [
                        "month" => $monthNumber,
                        "label" => $monthName,
                        "revenue" => $revenue
                    ];
                    $totalRevenue += $revenue;
                }

                return [
                    "success" => true,
                    "data" => [
                        "year" => $yearValue,
                        "total_revenue" => $totalRevenue,
                        "months" => $months
                    ]
                ];
            } catch (Exception $e) {
                return [
                    "success" => false,
                    "error" => "Database operation failed: " . $e->getMessage()
                ];
            }
        }

        public function getTrendingPartsByVehicleModel()
        {
            try {
                $query = "SELECT
                              v.manufacturer,
                              v.model,
                              p.part_id,
                              p.part_name,
                              SUM(rop.quantity_used) AS total_used,
                              SUM(rop.quantity_used * rop.unit_price) AS total_cost,
                              p.unit_price AS current_unit_price,
                              p.quantity_on_hand,
                              p.reorder_level,
                              (
                                  SELECT GROUP_CONCAT(DISTINCT sc.service_name ORDER BY sc.service_name SEPARATOR ', ')
                                  FROM repair_order_parts rop_service
                                  JOIN repair_orders ro_service ON ro_service.order_id = rop_service.order_id
                                  JOIN vehicles v_service ON v_service.vehicle_id = ro_service.vehicle_id
                                  JOIN repair_order_services ros ON ros.order_id = ro_service.order_id
                                  JOIN service_catalog sc ON sc.service_catalog_id = ros.service_catalog_id
                                  WHERE rop_service.part_id = p.part_id
                                    AND rop_service.status = 'ISSUED'
                                    AND ro_service.status <> 'CANCELLED'
                                    AND v_service.manufacturer = v.manufacturer
                                    AND v_service.model = v.model
                              ) AS associated_services
                          FROM repair_order_parts rop
                          JOIN repair_orders ro ON ro.order_id = rop.order_id
                          JOIN vehicles v ON v.vehicle_id = ro.vehicle_id
                          JOIN parts_inventory p ON p.part_id = rop.part_id
                          WHERE rop.status = 'ISSUED'
                            AND ro.status <> 'CANCELLED'
                          GROUP BY
                              v.manufacturer, v.model, p.part_id, p.part_name,
                              p.unit_price, p.quantity_on_hand, p.reorder_level
                          ORDER BY v.manufacturer, v.model, total_used DESC, p.part_name";
                $result = self::$conn->query($query);
                if (!$result) {
                    throw new Exception("Query failed: " . self::$conn->error);
                }

                $models = [];
                while ($row = $result->fetch_assoc()) {
                    $modelName = trim($row['manufacturer'] . " " . $row['model']);
                    if (!isset($models[$modelName])) {
                        $models[$modelName] = [
                            "vehicle_model" => $modelName,
                            "total_used" => 0,
                            "total_cost" => 0.0,
                            "parts" => []
                        ];
                    }
                    $totalUsed = (int)$row['total_used'];
                    $totalCost = (float)$row['total_cost'];
                    $models[$modelName]["total_used"] += $totalUsed;
                    $models[$modelName]["total_cost"] += $totalCost;
                    $models[$modelName]["parts"][] = [
                        "part_id" => (int)$row['part_id'],
                        "part_name" => $row['part_name'],
                        "total_used" => $totalUsed,
                        "total_cost" => $totalCost,
                        "unit_price" => (float)$row['current_unit_price'],
                        "quantity_on_hand" => (int)$row['quantity_on_hand'],
                        "reorder_level" => (int)$row['reorder_level'],
                        "associated_services" => $row['associated_services']
                    ];
                }
                $result->free();

                foreach ($models as &$model) {
                    $topFiveUnits = 0;
                    foreach ($model["parts"] as $index => &$part) {
                        $part["share_percent"] = $model["total_used"] > 0
                            ? ($part["total_used"] / $model["total_used"]) * 100
                            : 0;
                        if ($index < 5) {
                            $topFiveUnits += $part["total_used"];
                        }
                    }
                    unset($part);
                    $model["other_used"] = max(0, $model["total_used"] - $topFiveUnits);
                }
                unset($model);

                return [
                    "success" => true,
                    "data" => array_values($models)
                ];
            } catch (Exception $e) {
                return [
                    "success" => false,
                    "error" => "Database operation failed: " . $e->getMessage()
                ];
            }
        }
    }
?>