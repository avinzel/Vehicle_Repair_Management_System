<?php
namespace App\Models;

use App\Config\Database;
use Exception;

class Service {
    private static $conn;

    public function __construct() {
        self::$conn = Database::getConnection();
    }

    /**
     * Fetch all services from the catalog with optional search filtering
     * 
     * @param string|null $search
     * @return array
     */
    public function getAllServices($search = null, $status = 'ACTIVE') {
        try {
            $stmt = self::$conn->prepare("CALL sp_get_services(?, ?)");

            if (!$stmt) {
                throw new Exception("Prepare failed: " . self::$conn->error, self::$conn->errno);
            }

            $stmt->bind_param("ss", $search, $status);

            if (!$stmt->execute()) {
                throw new Exception($stmt->error, $stmt->errno);
            }

            $result = $stmt->get_result();
            $services = $result ? $result->fetch_all(MYSQLI_ASSOC) : [];
            $stmt->close();

            // Clear connection buffer for stored procedure execution
            while (self::$conn->more_results() && self::$conn->next_result()) {
                if ($extra = self::$conn->use_result()) {
                    $extra->free();
                }
            }

            return [
                "success" => true,
                "data"    => $services
            ];

        } catch (Exception $e) {
            return [
                "success" => false,
                "code"    => (int)$e->getCode(),
                "error"   => "Failed to retrieve service catalog: " . $e->getMessage()
            ];
        }
    }

    // /**
    //  * Fetch a single service by ID
    //  * 
    //  * @param int $id
    //  * @return array
    //  */
    // public function getServiceById($id) {
    //     try {
    //         $query = "SELECT service_catalog_id, service_name, description, standard_labor_cost 
    //                   FROM service_catalog 
    //                   WHERE service_catalog_id = ? 
    //                   LIMIT 1";
    //         $stmt = self::$conn->prepare($query);

    //         if (!$stmt) {
    //             throw new Exception("Prepare failed: " . self::$conn->error);
    //         }

    //         $serviceId = (int)$id;
    //         $stmt->bind_param("i", $serviceId);
    //         $stmt->execute();

    //         $result = $stmt->get_result();
    //         $service = $result ? $result->fetch_assoc() : null;
    //         $stmt->close();

    //         if (!$service) {
    //             return [
    //                 "success" => false,
    //                 "error"   => "Service record not found."
    //             ];
    //         }

    //         return [
    //             "success" => true,
    //             "data"    => $service
    //         ];

    //     } catch (Exception $e) {
    //         return [
    //             "success" => false,
    //             "error"   => "Failed to fetch service record: " . $e->getMessage()
    //         ];
    //     }
    // }

    // /**
    //  * Add a new service to the catalog
    //  * 
    //  * @param string $serviceName
    //  * @param string|null $description
    //  * @param float $standardLaborCost
    //  * @return array
    //  */
    // public function createService($serviceName, $description, $standardLaborCost) {
    //     try {
    //         $query = "INSERT INTO service_catalog (service_name, description, standard_labor_cost) 
    //                   VALUES (?, ?, ?)";
    //         $stmt = self::$conn->prepare($query);

    //         if (!$stmt) {
    //             throw new Exception("Prepare failed: " . self::$conn->error);
    //         }

    //         $name = trim($serviceName);
    //         $desc = !empty($description) ? trim($description) : null;
    //         $cost = (float)$standardLaborCost;

    //         $stmt->bind_param("ssd", $name, $desc, $cost);

    //         if (!$stmt->execute()) {
    //             throw new Exception($stmt->error);
    //         }

    //         $newId = $stmt->insert_id;
    //         $stmt->close();

    //         return [
    //             "success"    => true,
    //             "message"    => "Service created successfully.",
    //             "service_id" => $newId
    //         ];

    //     } catch (Exception $e) {
    //         return [
    //             "success" => false,
    //             "error"   => "Failed to create service: " . $e->getMessage()
    //         ];
    //     }
    // }

    // /**
    //  * Update an existing service item
    //  * 
    //  * @param int $id
    //  * @param string $serviceName
    //  * @param string|null $description
    //  * @param float $standardLaborCost
    //  * @return array
    //  */
    // public function updateService($id, $serviceName, $description, $standardLaborCost) {
    //     try {
    //         $query = "UPDATE service_catalog 
    //                   SET service_name = ?, description = ?, standard_labor_cost = ? 
    //                   WHERE service_catalog_id = ?";
    //         $stmt = self::$conn->prepare($query);

    //         if (!$stmt) {
    //             throw new Exception("Prepare failed: " . self::$conn->error);
    //         }

    //         $serviceId = (int)$id;
    //         $name      = trim($serviceName);
    //         $desc      = !empty($description) ? trim($description) : null;
    //         $cost      = (float)$standardLaborCost;

    //         $stmt->bind_param("ssdi", $name, $desc, $cost, $serviceId);

    //         if (!$stmt->execute()) {
    //             throw new Exception($stmt->error);
    //         }

    //         $stmt->close();

    //         return [
    //             "success" => true,
    //             "message" => "Service updated successfully."
    //         ];

    //     } catch (Exception $e) {
    //         return [
    //             "success" => false,
    //             "error"   => "Failed to update service: " . $e->getMessage()
    //         ];
    //     }
    // }

    public function createService($serviceName, $description, $standardLaborCost) {
        try {
            $stmt = self::$conn->prepare(
                "INSERT INTO service_catalog (service_name, description, standard_labor_cost, status)
                 VALUES (?, ?, ?, 'ACTIVE')"
            );
            if (!$stmt) {
                throw new Exception("Prepare failed: " . self::$conn->error, self::$conn->errno);
            }
            $stmt->bind_param("ssd", $serviceName, $description, $standardLaborCost);
            if (!$stmt->execute()) {
                throw new Exception($stmt->error, $stmt->errno);
            }
            $serviceId = (int)$stmt->insert_id;
            $stmt->close();
            return ["success" => true, "service_catalog_id" => $serviceId];
        } catch (\Throwable $e) {
            return ["success" => false, "code" => (int)$e->getCode(), "error" => $e->getMessage()];
        }
    }

    public function updateService($serviceId, $serviceName, $description, $standardLaborCost) {
        try {
            $stmt = self::$conn->prepare(
                "UPDATE service_catalog
                 SET service_name = ?, description = ?, standard_labor_cost = ?
                 WHERE service_catalog_id = ? AND status = 'ACTIVE'"
            );
            if (!$stmt) {
                throw new Exception("Prepare failed: " . self::$conn->error, self::$conn->errno);
            }
            $stmt->bind_param("ssdi", $serviceName, $description, $standardLaborCost, $serviceId);
            if (!$stmt->execute()) {
                throw new Exception($stmt->error, $stmt->errno);
            }
            $affectedRows = $stmt->affected_rows;
            $stmt->close();

            if ($affectedRows === 0) {
                $check = self::$conn->prepare(
                    "SELECT service_catalog_id FROM service_catalog
                     WHERE service_catalog_id = ? AND status = 'ACTIVE'"
                );
                if (!$check) {
                    throw new Exception("Prepare failed: " . self::$conn->error, self::$conn->errno);
                }
                $check->bind_param("i", $serviceId);
                $check->execute();
                $exists = $check->get_result()->num_rows > 0;
                $check->close();
                if (!$exists) {
                    return ["success" => false, "not_found" => true];
                }
            }
            return ["success" => true];
        } catch (\Throwable $e) {
            return ["success" => false, "code" => (int)$e->getCode(), "error" => $e->getMessage()];
        }
    }

    public function softDeleteService($serviceId) {
        try {
            $stmt = self::$conn->prepare(
                "UPDATE service_catalog SET status = 'INACTIVE'
                 WHERE service_catalog_id = ? AND status = 'ACTIVE'"
            );
            if (!$stmt) {
                throw new Exception("Prepare failed: " . self::$conn->error, self::$conn->errno);
            }
            $stmt->bind_param("i", $serviceId);
            if (!$stmt->execute()) {
                throw new Exception($stmt->error, $stmt->errno);
            }
            $affectedRows = $stmt->affected_rows;
            $stmt->close();
            return $affectedRows;
        } catch (\Throwable $e) {
            return ["success" => false, "code" => (int)$e->getCode(), "error" => $e->getMessage()];
        }
    }
}
?>