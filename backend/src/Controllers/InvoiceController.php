<?php
    namespace App\Controllers;

    use App\Models\Invoice;
    use App\Auth\Auth; 
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
         * POST: Generate invoice and transition repair order to AWAITING_PAYMENT
         */
        public function generateInvoice() {

            $data = $this->getInputData();

            $orderId  = $data['order_id'] ?? $data['orderId'] ?? null;
            $taxRate  = $data['tax_rate'] ?? $data['taxRate'] ?? 0.00;
            $discount = $data['discount'] ?? 0.00;

            if (empty($orderId) || !is_numeric($orderId)) {
                http_response_code(400);
                echo json_encode([
                    "status" => "error",
                    "error"  => "Missing or invalid required parameter: order_id"
                ]);
                exit();
            }

            // Validate non-negative financial inputs
            if (!is_numeric($taxRate) || (float)$taxRate < 0) {
                http_response_code(400);
                echo json_encode([
                    "status" => "error",
                    "error"  => "Tax rate cannot be negative or non-numeric."
                ]);
                exit();
            }

            if (!is_numeric($discount) || (float)$discount < 0) {
                http_response_code(400);
                echo json_encode([
                    "status" => "error",
                    "error"  => "Discount cannot be negative or non-numeric."
                ]);
                exit();
            }

            $createdByUserId = Auth::getUserId();
            if (!$createdByUserId) {
                http_response_code(401);
                echo json_encode([
                    "status" => "error",
                    "error"  => "User authentication required"
                ]);
                exit();
            }

            try {
                $response = self::$model->createInvoice(
                    (int)$orderId, 
                    (int)$createdByUserId, 
                    (float)$taxRate, 
                    (float)$discount
                );

                if (isset($response['success']) && $response['success']) {
                    http_response_code(201);
                    echo json_encode([
                        "status"  => "success",
                        "message" => $response['message']
                    ]);
                } else {
                    http_response_code(400);
                    echo json_encode([
                        "status" => "error",
                        "error"  => $response['error'] ?? "Failed to generate invoice"
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