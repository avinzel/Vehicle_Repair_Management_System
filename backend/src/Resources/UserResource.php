<?php
    namespace App\Resources;
    use App\Models\User;

    class UserResource{

        public static function toArray ($user){
            return [
                "user_id" => $user['user_id'],
                "username" => $user['username'],
                "first_name" => $user['first_name'],
                "middle_name" => $user['middle_name'],
                "last_name" => $user['last_name'],
                "contact_no" => $user['contact_no'],
                "email" => $user['email'],
                "role_id" => $user['role_id'],
                "status" => $user['status']
            ];
        }

        public static function collection(array $data){
            $users = []; 
            foreach($data as $user){
                $users[]= [
                    "user_id" => $user['user_id'],
                    "username" => $user['username'],
                    "first_name" => $user['first_name'],
                    "middle_name" => $user['middle_name'],
                    "last_name" => $user['last_name'],
                    "contact_no" => $user['contact_no'],
                    "email" => $user['email'],
                    "role_id" => $user['role_id'],
                    "status" => $user['status']
                ] ;
            };
            return $users;
        }
    }
?>