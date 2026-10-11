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
                    error_log("Customer directory query failed: " . ($response['error'] ?? 'Unknown database error'));
                    http_response_code(500);
                    echo json_encode([
                        "status" => "error",
                        "error"  => "Failed to fetch customer directory records."
                    ]);
                }

            } catch (Exception $e) {
                error_log("Customer directory request failed: " . $e->getMessage());
                http_response_code(500);
                echo json_encode([
                    "status" => "error",
                    "error"  => "Failed to fetch customer directory records."
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
                    if ($statusCode === 500) {
                        error_log("Customer detail query failed: " . ($response['error'] ?? 'Unknown database error'));
                    }
                    http_response_code($statusCode);
                    echo json_encode([
                        "status" => "error",
                        "error"  => $statusCode === 404 ? "Customer not found." : "Failed to fetch customer profile and history."
                    ]);
                }

            } catch (Exception $e) {
                error_log("Customer detail request failed: " . $e->getMessage());
                http_response_code(500);
                echo json_encode([
                    "status" => "error",
                    "error"  => "Failed to fetch customer profile and history."
                ]);
            }
            exit();
        }

        public function createCustomer() {
            $input = $this->getInputData();
            $validated = $this->validateCustomerPayload($input, false);
            if (isset($validated['error'])) {
                $this->respondError(400, $validated['error']);
                return;
            }

            try {
                $customerId = self::$model->createCustomer($validated['customer'], $validated['vehicles']);
                http_response_code(201);
                echo json_encode([
                    "status" => "success",
                    "message" => "Customer created successfully.",
                    "customer_id" => $customerId
                ]);
            } catch (\Throwable $e) {
                $this->respondModelError($e);
            }
        }

        public function updateCustomer() {
            $input = $this->getInputData();
            $customerId = $_GET['customer_id'] ?? $_GET['customerId'] ?? $input['customer_id'] ?? $input['customerId'] ?? null;
            if (filter_var($customerId, FILTER_VALIDATE_INT) === false || (int)$customerId <= 0) {
                $this->respondError(400, "A valid customer_id is required.");
                return;
            }

            $validated = $this->validateCustomerPayload($input, true);
            if (isset($validated['error'])) {
                $this->respondError(400, $validated['error']);
                return;
            }

            try {
                self::$model->updateCustomer((int)$customerId, $validated['customer'], $validated['vehicles']);
                http_response_code(200);
                echo json_encode([
                    "status" => "success",
                    "message" => "Customer updated successfully.",
                    "customer_id" => (int)$customerId
                ]);
            } catch (\Throwable $e) {
                $this->respondModelError($e);
            }
        }

        public function deactivateCustomer() {
            $input = $this->getInputData();
            $customerId = $_GET['customer_id'] ?? $_GET['customerId'] ?? $input['customer_id'] ?? $input['customerId'] ?? null;
            if (filter_var($customerId, FILTER_VALIDATE_INT) === false || (int)$customerId <= 0) {
                $this->respondError(400, "A valid customer_id is required.");
                return;
            }

            try {
                self::$model->deactivateCustomer((int)$customerId);
                http_response_code(200);
                echo json_encode([
                    "status" => "success",
                    "message" => "Customer deactivated successfully.",
                    "customer_id" => (int)$customerId,
                    "customer_status" => "INACTIVE"
                ]);
            } catch (\Throwable $e) {
                $this->respondModelError($e);
            }
        }

        private function validateCustomerPayload(array $input, bool $update) {
            $requiredFields = [
                'first_name' => 'First name',
                'last_name' => 'Last name',
                'contact_no' => 'Contact number'
            ];
            foreach ($requiredFields as $required => $label) {
                if (!isset($input[$required]) || !is_string($input[$required]) || trim($input[$required]) === '') {
                    return ['error' => "{$label} is required."];
                }
            }

            $customer = [
                'first_name' => trim($input['first_name']),
                'middle_name' => $this->optionalString($input['middle_name'] ?? null),
                'last_name' => trim($input['last_name']),
                'contact_no' => trim($input['contact_no']),
                'email' => $this->optionalString($input['email'] ?? null),
                'address' => $this->optionalString($input['address'] ?? null)
            ];

            foreach (['middle_name', 'email', 'address'] as $optionalField) {
                if (array_key_exists($optionalField, $input)
                    && $input[$optionalField] !== null
                    && !is_string($input[$optionalField])) {
                    return ['error' => "{$optionalField} must be a string or null."];
                }
            }

            $limits = [
                'first_name' => 75,
                'middle_name' => 75,
                'last_name' => 75,
                'contact_no' => 20,
                'email' => 100,
                'address' => 255
            ];
            foreach ($limits as $field => $maxLength) {
                if ($customer[$field] !== null && $this->stringLength($customer[$field]) > $maxLength) {
                    $label = ucwords(str_replace('_', ' ', $field));
                    return ['error' => "{$label} must be {$maxLength} characters or fewer."];
                }
            }
            foreach (['first_name' => 'First name', 'middle_name' => 'Middle name', 'last_name' => 'Last name'] as $field => $label) {
                if ($customer[$field] !== null
                    && preg_match("/\\A[\\p{L}\\p{M}][\\p{L}\\p{M} .'-]*\\z/u", $customer[$field]) !== 1) {
                    return ['error' => "{$label} can contain letters, spaces, apostrophes, periods, and hyphens only."];
                }
            }
            $contactDigits = preg_replace('/[\\s()-]/u', '', $customer['contact_no']);
            if (!is_string($contactDigits) || preg_match('/^(?:09[0-9]{9}|\\+639[0-9]{9})$/', $contactDigits) !== 1) {
                return ['error' => "Enter a valid Philippine mobile number (e.g. 09171234567 or +639171234567)."];
            }
            if ($customer['email'] !== null && filter_var($customer['email'], FILTER_VALIDATE_EMAIL) === false) {
                return ['error' => "Enter a valid email address."];
            }

            $vehicles = $input['vehicles'] ?? [];
            if (!is_array($vehicles) || !array_is_list($vehicles)) {
                return ['error' => "vehicles must be an array of vehicle objects."];
            }
            foreach ($vehicles as $index => $vehicle) {
                if (!is_array($vehicle)) {
                    return ['error' => "vehicles[{$index}] must be an object."];
                }
                $normalizedVehicle = $this->validateVehicle($vehicle, $index);
                if (isset($normalizedVehicle['error'])) {
                    return $normalizedVehicle;
                }
                if (!$update && isset($normalizedVehicle['vehicle_id'])) {
                    return ['error' => "vehicles[{$index}].vehicle_id must not be supplied when creating a customer."];
                }
                $vehicles[$index] = $normalizedVehicle;
            }

            return ['customer' => $customer, 'vehicles' => $vehicles];
        }

        private function validateVehicle(array $vehicle, int $index) {
            $labels = [
                'plate_number' => 'plate number',
                'vehicle_type' => 'type',
                'manufacturer' => 'manufacturer',
                'model' => 'model'
            ];
            foreach ($labels as $required => $label) {
                if (!isset($vehicle[$required]) || !is_string($vehicle[$required]) || trim($vehicle[$required]) === '') {
                    return ['error' => "Vehicle " . ($index + 1) . " {$label} is required."];
                }
            }
            $fields = [
                'plate_number' => [20, true],
                'vehicle_type' => [20, true],
                'manufacturer' => [50, true],
                'model' => [50, true],
                'color' => [30, false],
                'vin_number' => [50, false]
            ];
            $normalized = [];
            foreach ($fields as $field => [$maxLength, $required]) {
                if (!$required && array_key_exists($field, $vehicle)
                    && $vehicle[$field] !== null
                    && !is_string($vehicle[$field])) {
                    return ['error' => "Vehicle " . ($index + 1) . " {$field} must be text."];
                }
                $value = $required ? trim($vehicle[$field]) : $this->optionalString($vehicle[$field] ?? null);
                if ($value !== null && $this->stringLength($value) > $maxLength) {
                    $label = $labels[$field] ?? ucwords(str_replace('_', ' ', $field));
                    return ['error' => "Vehicle " . ($index + 1) . " {$label} must be {$maxLength} characters or fewer."];
                }
                $normalized[$field] = $value;
            }
            $normalized['vehicle_type'] = strtoupper($normalized['vehicle_type']);
            if (!in_array($normalized['vehicle_type'], ['CAR', 'MOTORCYCLE', 'TRICYCLE'], true)) {
                return ['error' => "Vehicle " . ($index + 1) . " type must be Car, Motorcycle, or Tricycle."];
            }

            $year = $vehicle['year_model'] ?? null;
            if ($year === '' || $year === null) {
                $normalized['year_model'] = null;
            } elseif (filter_var($year, FILTER_VALIDATE_INT) === false || (int)$year < 1901 || (int)$year > 2155) {
                return ['error' => "Vehicle " . ($index + 1) . " year must be between 1901 and 2155."];
            } else {
                $normalized['year_model'] = (int)$year;
            }

            $mileage = $vehicle['current_mileage'] ?? 0;
            if (filter_var($mileage, FILTER_VALIDATE_INT) === false || (int)$mileage < 0) {
                return ['error' => "Vehicle " . ($index + 1) . " mileage must be a non-negative whole number."];
            }
            $normalized['current_mileage'] = (int)$mileage;

            $vehicleId = $vehicle['vehicle_id'] ?? null;
            if ($vehicleId !== null && (filter_var($vehicleId, FILTER_VALIDATE_INT) === false || (int)$vehicleId <= 0)) {
                return ['error' => "Vehicle " . ($index + 1) . " has an invalid record identifier."];
            }
            if ($vehicleId !== null) {
                $normalized['vehicle_id'] = (int)$vehicleId;
            }

            return $normalized;
        }

        private function optionalString($value) {
            if ($value === null || !is_string($value)) {
                return null;
            }
            $trimmed = trim($value);
            return $trimmed === '' ? null : $trimmed;
        }

        private function stringLength(string $value) {
            preg_match_all('/./us', $value, $characters);
            return count($characters[0]);
        }

        private function respondModelError(\Throwable $e) {
            $code = (int)$e->getCode();
            $message = $e->getMessage();
            if ($code === 1062) {
                if (stripos($message, 'email') !== false) {
                    $this->respondError(409, "A customer with this email address already exists.");
                } elseif (stripos($message, 'plate_number') !== false) {
                    $this->respondError(409, "A vehicle with this plate number already exists.");
                } elseif (stripos($message, 'vin_number') !== false) {
                    $this->respondError(409, "A vehicle with this VIN already exists.");
                } else {
                    $this->respondError(409, "A customer or vehicle with the supplied unique value already exists.");
                }
                return;
            }
            if ($code === 1644 && $message === "Customer not found.") {
                $this->respondError(404, $message);
                return;
            }
            if ($code === 404 || $code === 409 || $code === 1644) {
                $this->respondError($code === 1644 ? 409 : $code, $message);
                return;
            }

            error_log("Customer write request failed: " . $message);
            $this->respondError(500, "The customer operation could not be completed.");
        }

        private function respondError(int $httpCode, string $message) {
            http_response_code($httpCode);
            echo json_encode(["status" => "error", "error" => $message]);
        }

        public function getInputData(){
            $input = json_decode(file_get_contents('php://input'), true);
            return is_array($input) ? $input : [];
        }
    }
?>