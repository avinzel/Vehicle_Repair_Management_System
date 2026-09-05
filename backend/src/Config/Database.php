<?php   
    namespace App\Config;
    use mysqli;
    use Exception;
    class Database{
        private $host = "localhost"; 
        private $user = "root";
        private $pass = "mercadal123"; 
        private $db = "VehicleRepair";

        private $conn; 

        public function __construct(){
            try {
                $this->conn = new mysqli($this->host,$this->user, $this->pass, $this->db ); 

                if ($this->conn->connect_error) {
                    throw new Exception("Connection Error: " . $this->conn->connect_error );
                }
            } catch (Exception $e) {
                http_response_code(500);
                json_encode(["error" => $e->getMessage()]);
                exit;
            }
        }

        public function getConnection(){
            return $this->conn;
        }
        
    }

?>