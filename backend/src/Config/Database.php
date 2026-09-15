<?php   
    namespace App\Config;
    use mysqli;
    use Exception;
    class Database{
        private $host = "localhost"; 
        private $user = "root";
        private $pass = ""; 
        private $db = "VehicleRepair";

        private static $conn; 

        public function __construct(){
            try {
                self::$conn = new mysqli($this->host,$this->user, $this->pass, $this->db ); 
                if (self::$conn->connect_error) {
                    throw new Exception("Connection Error: " . self::$conn->connect_error );
                }
            } catch (Exception $e) {
                http_response_code(500);
                json_encode(["error" => $e->getMessage()]);
                exit;
            }
        }

        public static function getConnection(){
            return self::$conn;
        }
        

    }

?>