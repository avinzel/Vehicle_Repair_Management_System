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
    public function getAllServices($search = null) {
        try {
            $searchQuery = !empty($search) ? '%' . trim($search) . '%' : null;

            if ($searchQuery) {
                $query = "SELECT service_catalog_id, service_name, description, standard_labor_cost 
                          FROM service_catalog 
                          WHERE service_name LIKE ? OR description LIKE ?
                          ORDER BY service_name ASC";
                $stmt = self::$conn->prepare($query);
                $stmt->bind_param("ss", $searchQuery, $searchQuery);
            } else {
                $query = "SELECT service_catalog_id, service_name, description, standard_labor_cost 
                          FROM service_catalog 
                          ORDER BY service_name ASC";
                $stmt = self::$conn->prepare($query);
            }

            if (!$stmt) {
                throw new Exception("Prepare failed: " . self::$conn->error);
            }

            $stmt->execute();
            $result = $stmt->get_result();
            $services = $result ? $result->fetch_all(MYSQLI_ASSOC) : [];
            $stmt->close();

            return [
                "success" => true,
                "data"    => $services
            ];

        } catch (Exception $e) {
            return [
                "success" => false,
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
}
?>