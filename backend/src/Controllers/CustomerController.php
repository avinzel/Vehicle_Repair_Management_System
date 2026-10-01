<?php
    namespace App\Controllers; 

    use App\Models\Customer; 
    use Exception;
    class CustomerController{
        private static $model;

        public function __construct()
        {
            self::$model = new Customer(); 
        }
        
        public function getCustomerRecordsByServiceProvider() {
            // 1. Check GET query param first, then check POST body payload
            $search = $_GET['search'] ?? null;

            if ($search === null) {
                $input = $this->getInputData();
                $search = $input['search'] ?? null;
            }

            try {
                // 2. Call the Customer model method
                $response = self::$model->getCustomerRecordsByServiceProvider($search);

                // 3. Return formatted API response
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
                        "error"  => $response['error'] ?? "Failed to fetch customer directory records"
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

        public function getCustomerDetailsWithHistory() {
            header('Content-Type: application/json');

            // 1. Check GET query params first, then check POST body payload
            $customerId = $_GET['customer_id'] ?? $_GET['customerId'] ?? null;

            if ($customerId === null) {
                $input = $this->getInputData();
                $customerId = $input['customer_id'] ?? $input['customerId'] ?? null;
            }

            // 2. Validate input parameter
            if (empty($customerId) || !is_numeric($customerId)) {
                http_response_code(400);
                echo json_encode([
                    "status" => "error",
                    "error"  => "Missing or invalid required parameter: customer_id"
                ]);
                exit();
            }

            try {
                // 3. Call the Customer model method
                $response = self::$model->getCustomerDetailsWithHistory((int)$customerId);

                // 4. Return formatted API response
                if (isset($response['success']) && $response['success']) {
                    http_response_code(200);
                    echo json_encode([
                        "status" => "success",
                        "data"   => $response['data']
                    ]);
                } else {
                    $statusCode = ($response['error'] ?? '') === "Customer not found" ? 404 : 500;
                    http_response_code($statusCode);
                    echo json_encode([
                        "status" => "error",
                        "error"  => $response['error'] ?? "Failed to fetch customer profile and history"
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
        public function getInputData(){
            $input = json_decode(file_get_contents('php://input'), true);
            return $input;
        }
    }
?>