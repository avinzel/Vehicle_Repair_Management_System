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
        public function getDashboardCards() {
            header('Content-Type: application/json');

            try {
                $response = self::$model->getDashboardSummaryCards();

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
    }
?>