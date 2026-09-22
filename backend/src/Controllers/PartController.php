<?php
    namespace App\Controllers;

    use App\Models\Part;
    use App\Auth\Auth; 

    class PartController {
        private static $model; 

        public function __construct($model = null)
        {
            self::$model = $model ?? new Part(); 
        }

        // Helper method to parse input stream safely
        private function getInputData() {
            $input = json_decode(file_get_contents('php://input'), true);
            return $input ?? [];
        }

        /**
         * Restock inventory part and trigger backorder fulfillment
         */
        public function restockPart() {
            // 2. Parse payload using helper method
            $input = $this->getInputData();

            $partId   = $input['part_id'] ?? null;
            $quantity = $input['quantity'] ?? null;

            // 3. Input Validation
            if (empty($partId) || !is_numeric($partId) || (int)$partId <= 0) {
                http_response_code(400);
                echo json_encode([
                    "status" => "error",
                    "error"  => "Valid part_id is required."
                ]);
                return;
            }

            if (empty($quantity) || !is_numeric($quantity) || (int)$quantity <= 0) {
                http_response_code(400);
                echo json_encode([
                    "status" => "error",
                    "error"  => "Restock quantity must be a positive integer greater than zero."
                ]);
                return;
            }

            // 4. Call Model to execute the restocking stored procedure
            $result = self::$model::restockAndFulfill((int)$partId, (int)$quantity);

            // 5. Send JSON Response
            if ($result['success']) {
                http_response_code(200);
                echo json_encode([
                    "status"  => "success",
                    "message" => $result['message']
                ]);
            } else {
                http_response_code(400);
                echo json_encode([
                    "status" => "error",
                    "error"  => $result['error']
                ]);
            }
        }
                /**
         * Endpoint handler to retrieve all inventory parts.
         * Accepts GET query parameters: ?status=ACTIVE&search=filter
         */
        public function getParts() {

            // 2. Capture query parameters
            $status = $_GET['status'] ?? 'ALL';
            $search = $_GET['search'] ?? '';

            // 3. Fetch data from model
            $result = self::$model::getAllParts($status, $search);

            // 4. Send response
            if ($result['success']) {
                http_response_code(200);
                echo json_encode([
                    "status" => "success",
                    "data"   => $result['data']
                ]);
            } else {
                http_response_code(500);
                echo json_encode([
                    "status" => "error",
                    "error"  => $result['error']
                ]);
            }
        }
    }
?>