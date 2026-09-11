<?php
    ini_set('display_errors', 0); 
    error_reporting(E_ALL);
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
    use App\Controllers\RoleController;
    use App\Models\Role;
    use App\Auth\Auth;
    use App\Models\RepairOrder;
    use App\Models\Reports;
    use App\Controllers\UserController;
    use App\Models\Mechanic;
    use App\Controllers\MechanicController;
    use App\Controllers\RepairOrderController;
    $db = new Database();
    
    $userModel = new User($db);
    $userController = new UserController($userModel);
    $registerUserController = new RegisterUserController($userModel); 
    $loginController = new LoginController($userModel);
    $roleController = new RoleController(new Role($db));
    $repairOrderController = new RepairOrderController();
    $auth = new Auth();
    $serviceAdvisorDashboard = new RepairOrder();
    $mechanicsController = new MechanicController(new Mechanic); 

    $action = $_GET['action'] ?? null;

    // Define actions that do not require authentication
    $publicActions = ['register', 'login', 'check-auth',"logout"];

    // 1. Guard Clause: Block unauthenticated access to protected routes
    if (!in_array($action, $publicActions) && !$auth->isAuthenticated()) {
        http_response_code(401);
        echo json_encode(["error" => "Unauthorized access. Please log in."]);
        exit();
    }
    //define role-based permissions for specific actions
    $rolePermissions = [
        "repair-orders"=>[
            "GET" => [1,2,3],
            "POST" => [1,2],
            "DELETE" => [1,2],
            "UPDATE" => [1,2,3]
        ],
        "reports"=>[
            "GET" => [1,2],
            "POST" => [1,2],
            "DELETE" => [1,2],
            "UPDATE" => [1,2,3]
        ],
        "users"=>[
            "GET" => [1],
            "POST" => [1],
            "DELETE" => [1],
            "UPDATE" => [1,2,3]
        ],
        "mechanics"=>[
            "GET" => [1],
            "POST" => [1],
            "DELETE" => [1],
            "UPDATE" => [1,3]
        ]
    ];

    $method = $_SERVER["REQUEST_METHOD"]; 

    if (isset($rolePermissions[$action])) {
        $userRoleId = $auth->getRoleId(); // Retrieve role_id stored in $_SESSION
        if (isset( $rolePermissions[$action][$method])) {
            if (!in_array($userRoleId, $rolePermissions[$action][$method])) {
                http_response_code(403); 
                echo json_encode(["error" => "Access denied. Insufficient permissions for this action."]);
                exit();
            }
        }
    }


    //routes
    switch ($action){
        //public routes
        case "register": {
            $registerUserController->registerUser(); 
            break;
        }
        case "login": {
            $loginController->loginUser();
            break;
        }
        case "check-auth": {
            $auth->checkAuthentication();
            break;
        }
        case "logout":{
            $loginController->logoutUser();
            break;
        }
        //protected routes
        case "test-auth":{
            echo json_encode(["message" => "Hello World " . $auth->getUsername() . "! You are authenticated." ]);
        }
            break;
        case "repair-orders":{
            if($_SERVER["REQUEST_METHOD"] === "GET"){
                if ($auth->getRoleId() == 2 ) {
                    if (isset($_GET["status"])) {
                        $repairOrderController->getActiveRepairOrders();
                    }else{
                        $dashboardData = $serviceAdvisorDashboard->getServiceAdvisorTable();
                        http_response_code(200);
                        echo json_encode(["data" => $dashboardData]);
                        exit();
                    }
                }
            }
            if ($_SERVER["REQUEST_METHOD"] === "POST"){
                $repairOrderController->createVehicleIntake();
            }
        }
        break;
        case "users": {
            if ($_SERVER["REQUEST_METHOD"] === "GET"){
               echo json_encode(["users" => User::getAllUsers()]);
            }
            if ($_SERVER["REQUEST_METHOD"] === "PUT"){
               $userController->updateUser();
            }
            if ($_SERVER["REQUEST_METHOD"] === "DELETE"){
               $userController->deleteUser();
            }
        }
        break;
        case "reports":{
            if($_SERVER["REQUEST_METHOD"] === "GET"){
                if ($auth->getRoleId() == 2 ) {
                    $dashboardData = (new Reports())->getServiceAdvisorCards();
                    http_response_code(200);
                    echo json_encode(["data" => $dashboardData]);
                    exit();
                }
            }
        }
        break;
        case "mechanics":{
            if ($_SERVER["REQUEST_METHOD"] === "GET"){
               echo json_encode(["mechanics" => Mechanic::getAllMechanics()]);
            }
            if ($_SERVER["REQUEST_METHOD"] === "PUT"){
               $mechanicsController->updateMechanics();
            }
            if ($_SERVER["REQUEST_METHOD"] === "POST"){
               $mechanicsController->createMechanic();
            }
            if ($_SERVER["REQUEST_METHOD"] === "DELETE"){
               $mechanicsController->deleteMechanic();
            }
        }
        break;
    }
?>