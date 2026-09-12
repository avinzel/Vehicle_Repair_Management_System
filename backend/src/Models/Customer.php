<?php
    namespace App\Models; 

    use App\Config\Database;
    use Exception; 
    class Customer{
        private static $conn; 

        public function __construct()
        {
            self::$conn  = Database::getConnection();
        }
        
    public function  getCustomerRecordsByServiceProvider($search = null){
        try {
                $searchQuery = !empty($search) ? trim($search) : null;
                $query = "CALL sp_get_customer_directory(?)";

                $stmt = self::$conn->prepare($query);

                if (!$stmt) {
                    throw new Exception("Prepare failed: " . self::$conn->error);
                }

                $stmt->bind_param("s", $searchQuery);
                $stmt->execute();

                $result = $stmt->get_result();
                $customers = $result ? $result->fetch_all(MYSQLI_ASSOC) : [];
                $stmt->close();

                // Clear stored procedure result sets from MySQLi connection buffer
                while (self::$conn->more_results() && self::$conn->next_result()) {
                    if ($extraResult = self::$conn->use_result()) {
                        $extraResult->free();
                    }
                }

                return [
                    "success" => true,
                    "data" => $customers
                ];

            } catch (Exception $e) {
                return [
                    "success" => false,
                    "error" => "Database operation failed: " . $e->getMessage()
                ];
            }
        }
    }    
?>