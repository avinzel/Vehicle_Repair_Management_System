<?php
    session_set_cookie_params([
        'lifetime' => 86400,
        'path'     => '/',
        'secure'   => false, 
        'httponly' => true,  
        'samesite' => 'Lax'
    ]);
    session_start();

    // CORS Headers
    header("Access-Control-Allow-Origin: http://localhost:5173");
    header("Access-Control-Allow-Credentials: true");
    header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization");
    header("Content-Type: application/json; charset=UTF-8");

    // Handle preflight requests
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { 
        http_response_code(200);
        exit();

    }
    //autoload function for imports and use statements
    require_once __DIR__ . '../../../vendor/autoload.php';

    //imports
    use App\Config\Database;
    use App\Models\User;
    use App\Controllers\RegisterUserController;
    use App\Controllers\LoginController;
    use App\Auth\Auth;

    $db = new Database();

    $userModel = new User($db);
    $registerUserController = new RegisterUserController($userModel); 
    $loginController = new LoginController($userModel);
    $auth = new Auth();

    $action = $_GET['action'] ?? null;

    //routes
    switch ($action){
        case "register": {
            $registerUserController->registerUser(); 
            break;
        }
        case "login": {
            $loginController->loginUser();
            break;
        }
        case "logout": {
            $loginController->logoutUser();
            break;
        }
        case "check-auth": {
            $auth->checkAuthentication();
            break;
        }

        case "test-auth":{
            if($auth->isAuthenticated()){
                echo json_encode(["message" => "Hello World " . $auth->getUsername() . "! You are authenticated."]);
            } else {
                http_response_code(401);
                echo json_encode(["error" => "Unauthorized access"]);
            }
        }
    }




?>