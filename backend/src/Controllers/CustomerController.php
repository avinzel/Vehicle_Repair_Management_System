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

        public function getInputData(){
            $input = json_decode(file_get_contents('php://input'), true);
            return $input;
        }
    }
?>