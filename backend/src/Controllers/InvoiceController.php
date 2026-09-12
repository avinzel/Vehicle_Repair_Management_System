<?php
    namespace App\Controllers;

    use App\Models\Invoice;
    use Exception;

    class InvoiceController {
        private static $model;

        public function __construct()
        {
            self::$model = new Invoice();
        }

        /**
         * GET / POST: Fetch billing and invoicing list
         */
        public function getBillingAndInvoicingRecords() {

            // Read search term from GET query parameter or POST payload
            $search = $_GET['search'] ?? null;

            if ($search === null) {
                $input = $this->getInputData();
                $search = $input['search'] ?? null;
            }

            try {
                $response = self::$model->getBillingAndInvoicingRecords($search);

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
                        "error"  => $response['error'] ?? "Failed to fetch billing records"
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
         * POST: Process invoice payment and fulfill repair order
         */
        public function processPayment() {
            header('Content-Type: application/json');

            $input = $this->getInputData();

            // Validate required fields
            if (empty($input['order_id']) || empty($input['payment_method']) || empty($input['received_by'])) {
                http_response_code(400);
                echo json_encode([
                    "status" => "error",
                    "error"  => "Missing required payment details (order_id, payment_method, received_by)."
                ]);
                exit();
            }

            $orderId          = (int) $input['order_id'];
            $paymentMethod    = trim($input['payment_method']);
            $paymentReference = isset($input['payment_reference']) ? trim($input['payment_reference']) : null;
            $receivedBy       = (int) $input['received_by'];

            try {
                $response = self::$model->processInvoicePayment($orderId, $paymentMethod, $paymentReference, $receivedBy);

                if (isset($response['success']) && $response['success']) {
                    http_response_code(200);
                    echo json_encode([
                        "status"  => "success",
                        "message" => "Payment processed and repair order fulfilled successfully."
                    ]);
                } else {
                    http_response_code(500);
                    echo json_encode([
                        "status" => "error",
                        "error"  => $response['error'] ?? "Payment processing failed"
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
         * Helper method to decode incoming JSON request body
         */
        public function getInputData() {
            $input = json_decode(file_get_contents('php://input'), true);
            return $input ?? [];
        }
    }
?>