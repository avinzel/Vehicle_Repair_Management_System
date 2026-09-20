<?php
    namespace App\Models;

    use App\Config\Database;
    use Exception;

    class Invoice {
        private static $conn;

        public function __construct()
        {
            self::$conn = Database::getConnection();
        }

        /**
         * Fetch orders awaiting billing or completed invoices
         * 
         * @param string|null $search
         * @return array
         */
        public function getBillingAndInvoicingRecords($search = null) {
            try {
                $searchQuery = !empty($search) ? trim($search) : null;
                $query = "CALL sp_get_billing_and_invoicing(?)";

                $stmt = self::$conn->prepare($query);

                if (!$stmt) {
                    throw new Exception("Prepare failed: " . self::$conn->error);
                }

                $stmt->bind_param("s", $searchQuery);
                $stmt->execute();

                $result = $stmt->get_result();
                $records = $result ? $result->fetch_all(MYSQLI_ASSOC) : [];
                $stmt->close();

                // Clear stored procedure buffer
                while (self::$conn->more_results() && self::$conn->next_result()) {
                    if ($extraResult = self::$conn->use_result()) {
                        $extraResult->free();
                    }
                }

                return [
                    "success" => true,
                    "data" => $records
                ];

            } catch (Exception $e) {
                return [
                    "success" => false,
                    "error" => "Database operation failed: " . $e->getMessage()
                ];
            }
        }
        /**
     * Create an invoice for a repair order and transition status to AWAITING_PAYMENT
     * 
     * @param int $orderId
     * @param int $createdByUserId
     * @param float $taxRate
     * @param float $discount
     * @return array
     */
        public function createInvoice($orderId, $createdByUserId, $taxRate = 0.00, $discount = 0.00) {
            try {
                $query = "CALL sp_mark_awaiting_payment(?, ?, ?, ?)";
                $stmt = self::$conn->prepare($query);

                if (!$stmt) {
                    throw new Exception("Prepare failed: " . self::$conn->error);
                }

                $orderIdVal = (int)$orderId;
                $userIdVal  = (int)$createdByUserId;
                $taxVal     = (float)$taxRate;
                $discountVal = (float)$discount;

                $stmt->bind_param("iidd", $orderIdVal, $userIdVal, $taxVal, $discountVal);

                if (!$stmt->execute()) {
                    throw new Exception($stmt->error);
                }

                $stmt->close();

                // Clear stored procedure result sets from connection buffer
                while (self::$conn->more_results() && self::$conn->next_result()) {
                    if ($extraResult = self::$conn->use_result()) {
                        $extraResult->free();
                    }
                }

                return [
                    "success" => true,
                    "message" => "Invoice generated successfully. Repair order status updated to AWAITING_PAYMENT."
                ];

            } catch (Exception $e) {
                return [
                    "success" => false,
                    "error"   => "Failed to generate invoice: " . $e->getMessage()
                ];
            }
        }
        public function processInvoicePayment($orderId, $paymentMethod, $paymentReference, $receivedByUserId) {
            try {
                $query = "CALL sp_process_invoice_payment(?, ?, ?, ?)";
                $stmt = self::$conn->prepare($query);

                if (!$stmt) {
                    throw new Exception("Prepare failed: " . self::$conn->error);
                }

                $orderIdVal     = (int)$orderId;
                $methodVal      = trim($paymentMethod);
                $refVal         = !empty($paymentReference) ? trim($paymentReference) : null;
                $receivedByVal  = (int)$receivedByUserId;

                $stmt->bind_param("issi", $orderIdVal, $methodVal, $refVal, $receivedByVal);

                if (!$stmt->execute()) {
                    throw new Exception($stmt->error);
                }

                $stmt->close();

                // Clear stored procedure result sets from connection buffer
                while (self::$conn->more_results() && self::$conn->next_result()) {
                    if ($extraResult = self::$conn->use_result()) {
                        $extraResult->free();
                    }
                }

                return [
                    "success" => true,
                    "message" => "Payment processed, repair order fulfilled, and maintenance history logged successfully."
                ];

            } catch (Exception $e) {
                return [
                    "success" => false,
                    "error"   => "Payment processing failed: " . $e->getMessage()
                ];
            }
        }
    }
?>