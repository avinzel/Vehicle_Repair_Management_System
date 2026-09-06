<?php
    namespace App\Controllers;
    use App\Models\Role;

    class RoleController{
        private $roleModel;

        public function __construct(Role $roleModel){
            $this->roleModel = $roleModel;
        }

        public static function roles(){
            try {
                http_response_code(200);
                return json_encode(["roles"=>Role::getAllRoles()]);
            } catch (\Throwable $th) {
                http_response_code(500); 
                return json_encode(["error" => "Failed to retrieve roles"]);
            }
        }

        public static function rolesID(){
            try {
                http_response_code(200);
                return json_encode(["roles"=>Role::getAllRoles()]);
            } catch (\Throwable $th) {
                http_response_code(500); 
                return json_encode(["error" => "Failed to retrieve roles"]);
            }
        }
    }

?>