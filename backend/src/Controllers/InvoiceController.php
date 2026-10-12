<?php
    namespace App\Controllers;

    use App\Models\Invoice;
    use App\Auth\Auth; 
    use Exception;
    use Dompdf\Dompdf;
    use Dompdf\Options;

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
         * POST: Process invoice payment and fulfill repair order
         */
      /**
         * POST: Process invoice payment and fulfill repair order
         */
        public function processInvoicePayment() {
            header('Content-Type: application/json');

            // Get authenticated user ID dynamically from session/token
            $receivedBy = Auth::getUserId();
            if (!$receivedBy) {
                http_response_code(401);
                echo json_encode([
                    "status" => "error",
                    "error"  => "User authentication required."
                ]);
                exit();
            }

            $input = $this->getInputData();

            // Validate required payload fields
            if (empty($input['order_id']) || empty($input['payment_method'])) {
                http_response_code(400);
                echo json_encode([
                    "status" => "error",
                    "error"  => "Missing required payment details (order_id, payment_method)."
                ]);
                exit();
            }

            $orderId       = (int) $input['order_id'];
            $paymentMethod = trim($input['payment_method']);

            // Generate a random 12-character alphanumeric reference if not provided
            if (!empty($input['payment_reference'])) {
                $paymentReference = trim($input['payment_reference']);
            } else {
                $paymentReference = 'PAY-' . strtoupper(bin2hex(random_bytes(6)));
            }

            try {
                $response = self::$model->processInvoicePayment($orderId, $paymentMethod, $paymentReference, (int)$receivedBy);

                if (isset($response['success']) && $response['success']) {
                    http_response_code(200);
                    echo json_encode([
                        "status"            => "success",
                        "message"           => "Payment processed and repair order is ready for realese",
                        "payment_reference" => $paymentReference
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
    /**
         * GET / POST: Fetch detailed breakdown and mechanics list for an invoice modal
         */
        public function getInvoiceDetails() {

            // Read order_id from GET query parameter or POST payload
            $orderId = $_GET['order_id'] ?? $_GET['orderId'] ?? null;

            if ($orderId === null) {
                $input = $this->getInputData();
                $orderId = $input['order_id'] ?? $input['orderId'] ?? null;
            }

            if (empty($orderId) || !is_numeric($orderId)) {
                http_response_code(400);
                echo json_encode([
                    "status" => "error",
                    "error"  => "Missing or invalid required parameter: order_id"
                ]);
                exit();
            }

            try {
                $response = self::$model->getInvoiceDetails((int)$orderId);

                if (isset($response['success']) && $response['success']) {
                    http_response_code(200);
                    echo json_encode([
                        "status" => "success",
                        "data"   => $response['data']
                    ]);
                } else {
                    http_response_code(404);
                    echo json_encode([
                        "status" => "error",
                        "error"  => $response['error'] ?? "Failed to fetch invoice details"
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

        public function downloadInvoicePdf() {
            $orderId = $_GET['order_id'] ?? $_GET['orderId'] ?? null;
            if (filter_var($orderId, FILTER_VALIDATE_INT) === false || (int)$orderId <= 0) {
                http_response_code(400);
                header('Content-Type: application/json');
                echo json_encode([
                    "status" => "error",
                    "error" => "A valid order_id is required."
                ]);
                exit();
            }

            try {
                $response = self::$model->getInvoicePdfData((int)$orderId);
                if (!($response['success'] ?? false)) {
                    error_log("Invoice PDF data lookup failed: " . ($response['error'] ?? 'Unknown database error'));
                    http_response_code(500);
                    header('Content-Type: application/json');
                    echo json_encode([
                        "status" => "error",
                        "error" => "Failed to generate invoice PDF."
                    ]);
                    exit();
                }
                if (empty($response['data'])) {
                    http_response_code(404);
                    header('Content-Type: application/json');
                    echo json_encode([
                        "status" => "error",
                        "error" => "No invoice has been created for this repair order."
                    ]);
                    exit();
                }

                $invoice = $response['data'];
                $escape = static function ($value): string {
                    return htmlspecialchars((string)($value ?? ''), ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
                };
                $money = static function ($value): string {
                    return 'PHP ' . number_format((float)$value, 2);
                };

                $serviceRows = '';
                foreach ($invoice['services'] as $service) {
                    $serviceRows .= '<tr><td>' . $escape($service['service_name']) .
                        '</td><td class="amount">' . $money($service['standard_labor_cost']) . '</td></tr>';
                }
                if ($serviceRows === '') {
                    $serviceRows = '<tr><td colspan="2" class="muted">No services recorded</td></tr>';
                }

                $partRows = '';
                foreach ($invoice['parts'] as $part) {
                    $lineTotal = (float)$part['quantity_used'] * (float)$part['unit_price'];
                    $partRows .= '<tr><td>' . $escape($part['part_name']) .
                        '<span class="muted"> (' . $escape($part['part_code']) . ') x ' .
                        (int)$part['quantity_used'] . '</span></td><td class="amount">' .
                        $money($lineTotal) . '</td></tr>';
                }
                if ($partRows === '') {
                    $partRows = '<tr><td colspan="2" class="muted">No parts recorded</td></tr>';
                }

                $customerName = trim(implode(' ', array_filter([
                    $invoice['first_name'],
                    $invoice['middle_name'],
                    $invoice['last_name']
                ], static fn($value) => $value !== null && trim((string)$value) !== '')));
                $vehicleName = trim(implode(' ', array_filter([
                    $invoice['manufacturer'],
                    $invoice['model'],
                    $invoice['year_model']
                ], static fn($value) => $value !== null && trim((string)$value) !== '')));
                $invoiceStatus = strtoupper((string)$invoice['invoice_status']);

                $html = '<!doctype html><html><head><meta charset="UTF-8"><style>
                    body{font-family:DejaVu Sans,sans-serif;color:#222;font-size:12px}
                    h1{font-size:24px;margin:0}h2{font-size:14px;margin:22px 0 8px}
                    .top{border-bottom:2px solid #333;padding-bottom:14px}
                    .meta{width:100%;margin-top:16px}.meta td{vertical-align:top;padding:3px 8px 3px 0}
                    table.lines{width:100%;border-collapse:collapse;margin-top:6px}
                    .lines th,.lines td{padding:8px;border-bottom:1px solid #ddd;text-align:left}
                    .lines th{background:#f2f2f2}.amount{text-align:right!important;white-space:nowrap}
                    .totals{width:48%;margin:18px 0 0 auto;border-collapse:collapse}
                    .totals td{padding:5px 8px}.total{font-weight:bold;border-top:2px solid #333;font-size:14px}
                    .status{font-weight:bold}.muted{color:#666}.footer{margin-top:30px;color:#666;font-size:10px}
                    </style></head><body>
                    <div class="top"><h1>INVOICE</h1>
                    <div>Invoice #' . $escape($invoice['invoice_id']) . ' &nbsp; | &nbsp; Order #' .
                    $escape('RO-' . $invoice['order_id']) . '</div></div>
                    <table class="meta"><tr><td><strong>Invoice date:</strong> ' .
                    $escape($invoice['invoice_date']) . '</td><td><strong>Invoice status:</strong> <span class="status">' .
                    $escape($invoiceStatus) . '</span></td></tr>
                    <tr><td><strong>Customer:</strong> ' . $escape($customerName) .
                    '</td><td><strong>Vehicle:</strong> ' . $escape($vehicleName) . '</td></tr>
                    <tr><td><strong>Contact:</strong> ' . $escape($invoice['contact_no']) .
                    '</td><td><strong>Plate:</strong> ' . $escape($invoice['plate_number']) . '</td></tr>
                    <tr><td><strong>Email:</strong> ' . $escape($invoice['email']) .
                    '</td><td><strong>Order status:</strong> ' . $escape($invoice['order_status']) . '</td></tr>
                    <tr><td colspan="2"><strong>Address:</strong> ' . $escape($invoice['address']) . '</td></tr></table>
                    <h2>Services / Labor</h2><table class="lines"><thead><tr><th>Description</th><th class="amount">Amount</th></tr></thead><tbody>' .
                    $serviceRows . '</tbody></table>
                    <h2>Parts</h2><table class="lines"><thead><tr><th>Description</th><th class="amount">Amount</th></tr></thead><tbody>' .
                    $partRows . '</tbody></table>
                    <table class="totals">
                    <tr><td>Labor</td><td class="amount">' . $money($invoice['labor_total']) . '</td></tr>
                    <tr><td>Parts</td><td class="amount">' . $money($invoice['parts_total']) . '</td></tr>
                    <tr><td>Discount</td><td class="amount">- ' . $money($invoice['discount']) . '</td></tr>
                    <tr><td>Tax</td><td class="amount">' . $money($invoice['tax_amount']) . '</td></tr>
                    <tr class="total"><td>Total</td><td class="amount">' . $money($invoice['total_amount']) . '</td></tr>
                    </table>
                    <h2>Payment</h2><div><strong>Method:</strong> ' .
                    $escape($invoice['payment_method'] ?: 'Not paid') . '</div><div><strong>Reference:</strong> ' .
                    $escape($invoice['payment_reference'] ?: 'Not recorded') . '</div><div><strong>Payment date:</strong> ' .
                    $escape($invoice['payment_date'] ?: 'Not paid') . '</div>
                    <div class="footer">Generated from the saved invoice record.</div>
                    </body></html>';

                $options = new Options();
                $options->set('defaultFont', 'DejaVu Sans');
                $dompdf = new Dompdf($options);
                $dompdf->loadHtml($html, 'UTF-8');
                $dompdf->setPaper('A4', 'portrait');
                $dompdf->render();
                $dompdf->stream('invoice-' . (int)$invoice['invoice_id'] . '.pdf', ['Attachment' => true]);
                exit();
            } catch (\Throwable $e) {
                error_log("Invoice PDF generation failed: " . $e->getMessage());
                http_response_code(500);
                header('Content-Type: application/json');
                echo json_encode([
                    "status" => "error",
                    "error" => "Failed to generate invoice PDF."
                ]);
                exit();
            }
        }

        /**
         * POST: Fulfill and release a repair order (READY_FOR_RELEASE -> FULFILLED)
         */
        public function fulfillRepairOrder() {
            header('Content-Type: application/json');

            // Authenticate user dynamic session/token check
            $userId = Auth::getUserId();
            if (!$userId) {
                http_response_code(401);
                echo json_encode([
                    "status" => "error",
                    "error"  => "User authentication required."
                ]);
                exit();
            }

            $input = $this->getInputData();

            // Extract order_id supporting GET query param or POST JSON body
            $orderId = $_GET['order_id'] ?? $_GET['orderId'] ?? $input['order_id'] ?? $input['orderId'] ?? null;

            if (empty($orderId) || !is_numeric($orderId)) {
                http_response_code(400);
                echo json_encode([
                    "status" => "error",
                    "error"  => "Missing or invalid required parameter: order_id"
                ]);
                exit();
            }

            try {
                $response = self::$model->fulfillRepairOrder((int)$orderId);

                if (isset($response['success']) && $response['success']) {
                    http_response_code(200);
                    echo json_encode([
                        "status"  => "success",
                        "message" => $response['message']
                    ]);
                } else {
                    http_response_code(400);
                    echo json_encode([
                        "status" => "error",
                        "error"  => $response['error'] ?? "Failed to fulfill repair order"
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