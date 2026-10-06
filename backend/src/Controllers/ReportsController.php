<?php
namespace App\Controllers;

use App\Models\Reports;
use App\Auth\Auth;
use Exception;

    class ReportsController {
        private static $model;

        public function __construct() {
            self::$model = new Reports();
        }
        public function getInputData() {
            $input = json_decode(file_get_contents('php://input'), true);
            return $input ?? [];
        }

/**
         * GET: Retrieve dashboard summary card metrics
         */
        public function getAdminCards() {
            header('Content-Type: application/json');

            try {
                $response = self::$model->getAdminSummaryCards();

                if (isset($response['success']) && $response['success']) {
                    http_response_code(200);
                    echo json_encode([
                        "status" => "success",
                        "data"   => $response['data']
                    ]);
                } else {
                    http_response_code(500);
                    echo json_encode([
                        "status" => "error",
                        "error"  => $response['error'] ?? "Failed to fetch dashboard summary metrics"
                    ]);
                }

            } catch (Exception $e) {
                http_response_code(500);
                echo json_encode([
                    "status" => "error",
                    "error"  => "Controller operation failed: " . $e->getMessage()
                ]);
            }
            exit();
        }
        /**
         * GET: Retrieve pipeline status breakdown metrics
         */
        public function getPipelineStatusCounts() {
            header('Content-Type: application/json');

            try {
                $response = self::$model->getPipelineStatusCounts();

                if (isset($response['success']) && $response['success']) {
                    http_response_code(200);
                    echo json_encode([
                        "status" => "success",
                        "data"   => $response['data']
                    ]);
                } else {
                    http_response_code(500);
                    echo json_encode([
                        "status" => "error",
                        "error"  => $response['error'] ?? "Failed to fetch pipeline status metrics"
                    ]);
                }

            } catch (Exception $e) {
                http_response_code(500);
                echo json_encode([
                    "status" => "error",
                    "error"  => "Controller operation failed: " . $e->getMessage()
                ]);
            }
            exit();
        }
        /**
         * GET: Retrieve recent repair orders list
         */
        public function getRecentRepairOrders() {
            header('Content-Type: application/json');

            $limit = $_GET['limit'] ?? null;

            if ($limit === null) {
                $input = $this->getInputData();
                $limit = $input['limit'] ?? 10;
            }

            try {
                $response = self::$model->getRecentRepairOrders((int)$limit);

                if (isset($response['success']) && $response['success']) {
                    http_response_code(200);
                    echo json_encode([
                        "status" => "success",
                        "count"  => count($response['data']),
                        "data"   => $response['data']
                    ]);
                } else {
                    http_response_code(500);
                    echo json_encode([
                        "status" => "error",
                        "error"  => $response['error'] ?? "Failed to fetch recent repair orders"
                    ]);
                }

            } catch (Exception $e) {
                http_response_code(500);
                echo json_encode([
                    "status" => "error",
                    "error"  => "Controller operation failed: " . $e->getMessage()
                ]);
            }
            exit();
        }
        /**
         * GET: Retrieve revenue breakdown by repair order
         */
        public function getRevenueByOrder() {
            header('Content-Type: application/json');

            $limit = $_GET['limit'] ?? null;
            $status = $_GET['status'] ?? null;

            if ($limit === null || $status === null) {
                $input = $this->getInputData();
                $limit = $limit ?? ($input['limit'] ?? 10);
                $status = $status ?? ($input['status'] ?? null);
            }

            try {
                $response = self::$model->getRevenueByOrder((int)$limit, $status);

                if (isset($response['success']) && $response['success']) {
                    http_response_code(200);
                    echo json_encode([
                        "status" => "success",
                        "count"  => count($response['data']),
                        "data"   => $response['data']
                    ]);
                } else {
                    http_response_code(500);
                    echo json_encode([
                        "status" => "error",
                        "error"  => $response['error'] ?? "Failed to fetch revenue by order metrics"
                    ]);
                }

            } catch (Exception $e) {
                http_response_code(500);
                echo json_encode([
                    "status" => "error",
                    "error"  => "Controller operation failed: " . $e->getMessage()
                ]);
            }
            exit();
        }
        /**
         * GET: Retrieve total revenue split (Labor vs Parts)
         */
        public function getRevenueSplit() {
            header('Content-Type: application/json');

            try {
                $response = self::$model->getRevenueSplit();

                if (isset($response['success']) && $response['success']) {
                    http_response_code(200);
                    echo json_encode([
                        "status" => "success",
                        "data"   => $response['data']
                    ]);
                } else {
                    http_response_code(500);
                    echo json_encode([
                        "status" => "error",
                        "error"  => $response['error'] ?? "Failed to fetch revenue split metrics"
                    ]);
                }

            } catch (Exception $e) {
                http_response_code(500);
                echo json_encode([
                    "status" => "error",
                    "error"  => "Controller operation failed: " . $e->getMessage()
                ]);
            }
            exit();
        }
        /**
         * GET: Retrieve overall pipeline status counts (All 10 statuses with grand_total)
         */
        public function getPipelineStatusCountsOverall() {
            header('Content-Type: application/json');

            try {
                $response = self::$model->getPipelineStatusCountsOverall();

                if (isset($response['success']) && $response['success']) {
                    http_response_code(200);
                    echo json_encode([
                        "status"      => "success",
                        "grand_total" => $response['grand_total'],
                        "data"        => $response['data']
                    ]);
                } else {
                    http_response_code(500);
                    echo json_encode([
                        "status" => "error",
                        "error"  => $response['error'] ?? "Failed to fetch overall pipeline status metrics"
                    ]);
                }

            } catch (Exception $e) {
                http_response_code(500);
                echo json_encode([
                    "status" => "error",
                    "error"  => "Controller operation failed: " . $e->getMessage()
                ]);
            }
            exit();
        }
        /**
         * GET: Retrieve parts inventory summary cards (Total SKUs, Inventory Value, Low Stock Count)
         */
        public function getPartsInventoryCards() {
            header('Content-Type: application/json');

            try {
                $response = self::$model->getPartsInventoryCards();

                if (isset($response['success']) && $response['success']) {
                    http_response_code(200);
                    echo json_encode([
                        "status" => "success",
                        "data"   => $response['data']
                    ]);
                } else {
                    http_response_code(500);
                    echo json_encode([
                        "status" => "error",
                        "error"  => $response['error'] ?? "Failed to fetch parts inventory card metrics"
                    ]);
                }

            } catch (Exception $e) {
                http_response_code(500);
                echo json_encode([
                    "status" => "error",
                    "error"  => "Controller operation failed: " . $e->getMessage()
                ]);
            }
            exit();
        }
        /**
         * GET: Retrieve top parts used (by total quantity across all orders)
         */
        public function getTopPartsUsed() {
            header('Content-Type: application/json');

            $limit = $_GET['limit'] ?? null;

            if ($limit === null) {
                $input = $this->getInputData();
                $limit = $input['limit'] ?? 100;
            }

            try {
                $response = self::$model->getTopPartsUsed((int)$limit);

                if (isset($response['success']) && $response['success']) {
                    http_response_code(200);
                    echo json_encode([
                        "status" => "success",
                        "count"  => count($response['data']),
                        "data"   => $response['data']
                    ]);
                } else {
                    http_response_code(500);
                    echo json_encode([
                        "status" => "error",
                        "error"  => $response['error'] ?? "Failed to fetch top parts used"
                    ]);
                }

            } catch (Exception $e) {
                http_response_code(500);
                echo json_encode([
                    "status" => "error",
                    "error"  => "Controller operation failed: " . $e->getMessage()
                ]);
            }
            exit();
        }
        /**
         * GET: Retrieve active vs. completed order counts per mechanic
         */
        public function getMechanicOrderLoad() {
            header('Content-Type: application/json');

            try {
                $response = self::$model->getMechanicOrderLoad();

                if (isset($response['success']) && $response['success']) {
                    http_response_code(200);
                    echo json_encode([
                        "status" => "success",
                        "count"  => count($response['data']),
                        "data"   => $response['data']
                    ]);
                } else {
                    http_response_code(500);
                    echo json_encode([
                        "status" => "error",
                        "error"  => $response['error'] ?? "Failed to fetch mechanic order load"
                    ]);
                }

            } catch (Exception $e) {
                http_response_code(500);
                echo json_encode([
                    "status" => "error",
                    "error"  => "Controller operation failed: " . $e->getMessage()
                ]);
            }
            exit();
        }
        /**
         * GET: Retrieve mechanic cards (completion rate + recent orders per mechanic)
         */
        public function getMechanicOrderCards() {
            header('Content-Type: application/json');

            $limit = $_GET['limit_recent_order'] ?? null;

            if ($limit === null) {
                $input = $this->getInputData();
                $limit = $input['limit_recent_order'] ?? 10;
            }

            try {
                $response = self::$model->getMechanicOrderCards((int)$limit);

                if (isset($response['success']) && $response['success']) {
                    http_response_code(200);
                    echo json_encode([
                        "status" => "success",
                        "count"  => count($response['data']),
                        "data"   => $response['data']
                    ]);
                } else {
                    http_response_code(500);
                    echo json_encode([
                        "status" => "error",
                        "error"  => $response['error'] ?? "Failed to fetch mechanic order cards"
                    ]);
                }

            } catch (Exception $e) {
                http_response_code(500);
                echo json_encode([
                    "status" => "error",
                    "error"  => "Controller operation failed: " . $e->getMessage()
                ]);
            }
            exit();
        }
    }
?>