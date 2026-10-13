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
/**
         * Fetch full invoice breakdown and assigned mechanics for modal UI
         * 
         * @param int $orderId
         * @return array
         */
        public function getInvoiceDetails($orderId) {
            try {
                $orderIdVal = (int)$orderId;
                $query = "CALL sp_get_invoice_details({$orderIdVal})";

                if (!self::$conn->multi_query($query)) {
                    throw new Exception("Query failed: " . self::$conn->error);
                }

                $invoiceData = [];
                $mechanics = [];
                $resultSetIndex = 0;

                do {
                    if ($result = self::$conn->store_result()) {
                        $rows = $result->fetch_all(MYSQLI_ASSOC);
                        
                        if ($resultSetIndex === 0) {
                            $invoiceData = !empty($rows) ? $rows[0] : [];
                        } elseif ($resultSetIndex === 1) {
                            $mechanics = $rows;
                        }
                        
                        $result->free();
                    }
                    $resultSetIndex++;
                } while (self::$conn->more_results() && self::$conn->next_result());

                // If mechanics came back in index 0 because invoice record wasn't returned
                if (empty($invoiceData) && !empty($mechanics)) {
                    return [
                        "success" => true,
                        "data" => [
                            "order_id"  => $orderIdVal,
                            "mechanics" => $mechanics
                        ]
                    ];
                }

                $invoiceData['mechanics'] = $mechanics;

                return [
                    "success" => true,
                    "data" => $invoiceData
                ];

            } catch (Exception $e) {
                return [
                    "success" => false,
                    "error" => "Failed to fetch invoice details: " . $e->getMessage()
                ];
            }
        }

        public function getInvoicePdfData(int $orderId) {
            $stmt = null;
            try {
                $query = "
                    SELECT
                        i.invoice_id,
                        i.order_id,
                        i.invoice_date,
                        i.labor_total,
                        i.parts_total,
                        i.discount,
                        i.tax_amount,
                        i.total_amount,
                        i.payment_method,
                        i.payment_reference,
                        i.payment_date,
                        i.status AS invoice_status,
                        ro.status AS order_status,
                        c.first_name,
                        c.middle_name,
                        c.last_name,
                        c.contact_no,
                        c.email,
                        c.address,
                        v.plate_number,
                        v.vehicle_type,
                        v.manufacturer,
                        v.model,
                        v.year_model,
                        v.current_mileage
                    FROM invoices i
                    INNER JOIN repair_orders ro ON ro.order_id = i.order_id
                    INNER JOIN vehicles v ON v.vehicle_id = ro.vehicle_id
                    INNER JOIN customers c ON c.customer_id = v.customer_id
                    WHERE i.order_id = ?
                    LIMIT 1
                ";
                $stmt = self::$conn->prepare($query);
                if (!$stmt) {
                    throw new Exception("Invoice PDF query prepare failed: " . self::$conn->error, self::$conn->errno);
                }
                $stmt->bind_param("i", $orderId);
                if (!$stmt->execute()) {
                    throw new Exception("Invoice PDF query failed: " . $stmt->error, $stmt->errno);
                }
                $result = $stmt->get_result();
                $invoice = $result ? $result->fetch_assoc() : null;
                if ($result) {
                    $result->free();
                }
                $stmt->close();
                $stmt = null;

                if (!$invoice) {
                    return ["success" => true, "data" => null];
                }

                $stmt = self::$conn->prepare("
                    SELECT sc.service_name, sc.standard_labor_cost
                    FROM repair_order_services ros
                    INNER JOIN service_catalog sc ON sc.service_catalog_id = ros.service_catalog_id
                    WHERE ros.order_id = ?
                    ORDER BY ros.order_service_id
                ");
                if (!$stmt) {
                    throw new Exception("Invoice services query prepare failed: " . self::$conn->error, self::$conn->errno);
                }
                $stmt->bind_param("i", $orderId);
                if (!$stmt->execute()) {
                    throw new Exception("Invoice services query failed: " . $stmt->error, $stmt->errno);
                }
                $result = $stmt->get_result();
                $invoice['services'] = $result ? $result->fetch_all(MYSQLI_ASSOC) : [];
                if ($result) {
                    $result->free();
                }
                $stmt->close();
                $stmt = null;

                $stmt = self::$conn->prepare("
                    SELECT
                        CASE
                            WHEN pi.part_code LIKE 'AUTO-%'
                            THEN CONCAT('PRT-', LPAD(pi.part_id, 3, '0'))
                            ELSE pi.part_code
                        END AS part_code,
                        pi.part_name,
                        rop.quantity_used,
                        rop.unit_price,
                        rop.status AS part_status
                    FROM repair_order_parts rop
                    INNER JOIN parts_inventory pi ON pi.part_id = rop.part_id
                    WHERE rop.order_id = ?
                      AND rop.status <> 'CANCELLED'
                    ORDER BY rop.order_part_id
                ");
                if (!$stmt) {
                    throw new Exception("Invoice parts query prepare failed: " . self::$conn->error, self::$conn->errno);
                }
                $stmt->bind_param("i", $orderId);
                if (!$stmt->execute()) {
                    throw new Exception("Invoice parts query failed: " . $stmt->error, $stmt->errno);
                }
                $result = $stmt->get_result();
                $invoice['parts'] = $result ? $result->fetch_all(MYSQLI_ASSOC) : [];
                if ($result) {
                    $result->free();
                }
                $stmt->close();
                $stmt = null;

                return ["success" => true, "data" => $invoice];
            } catch (\Throwable $e) {
                if ($stmt) {
                    $stmt->close();
                }
                return [
                    "success" => false,
                    "error" => $e->getMessage(),
                    "code" => (int)$e->getCode()
                ];
            }
        }

        /**
         * Fulfill and release a repair order by updating its status from READY_FOR_RELEASE to FULFILLED
         * 
         * @param int $orderId
         * @return array
         */
        public function fulfillRepairOrder($orderId) {
            try {
                $query = "CALL sp_fulfill_repair_order(?)";
                $stmt = self::$conn->prepare($query);

                if (!$stmt) {
                    throw new Exception("Prepare failed: " . self::$conn->error);
                }

                $orderIdVal = (int)$orderId;
                $stmt->bind_param("i", $orderIdVal);

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
                    "message" => "Repair order fulfilled and released successfully."
                ];

            } catch (Exception $e) {
                return [
                    "success" => false,
                    "error"   => "Failed to fulfill repair order: " . $e->getMessage()
                ];
            }
        }
    }
?>