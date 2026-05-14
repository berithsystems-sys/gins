<?php
/**
 * Tally Church ERP - PHP Backend for Shared Hosting
 * Handle API requests via PHP/MySQL
 */

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json");

// 1. Database Configuration
$host = 'localhost'; 
$db   = 'u698772346_tally'; // YOUR_DATABASE_NAME
$user = 'u698772346_user';  // YOUR_DATABASE_USER
$pass = 'YOUR_ACTUAL_PASSWORD_HERE'; // <--- CHANGE THIS TO YOUR REAL PASSWORD
$charset = 'utf8mb4';

$dsn = "mysql:host=$host;dbname=$db;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

try {
     $pdo = new PDO($dsn, $user, $pass, $options);
} catch (\PDOException $e) {
     echo json_encode(['error' => 'Database connection failed: ' . $e->getMessage()]);
     exit;
}

// 2. Initialize Tables if they don't exist
function init_tables($pdo) {
    $pdo->exec("CREATE TABLE IF NOT EXISTS branches (
        id VARCHAR(50) PRIMARY KEY,
        code VARCHAR(20) NOT NULL,
        name VARCHAR(100) NOT NULL,
        location VARCHAR(100)
    )");

    $pdo->exec("CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(50) PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(100) NOT NULL,
        role VARCHAR(20) NOT NULL,
        branchId VARCHAR(50)
    )");

    $pdo->exec("CREATE TABLE IF NOT EXISTS ledgers (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        group_name VARCHAR(100) NOT NULL,
        openingBalance DECIMAL(15,2) DEFAULT 0,
        balanceType VARCHAR(5) NOT NULL,
        branchId VARCHAR(50)
    )");

    $pdo->exec("CREATE TABLE IF NOT EXISTS vouchers (
        id VARCHAR(50) PRIMARY KEY,
        number VARCHAR(50),
        date VARCHAR(20) NOT NULL,
        type VARCHAR(20) NOT NULL,
        narration TEXT,
        amount DECIMAL(15,2) NOT NULL,
        branchId VARCHAR(50)
    )");

    $pdo->exec("CREATE TABLE IF NOT EXISTS voucher_entries (
        id INT AUTO_INCREMENT PRIMARY KEY,
        voucherId VARCHAR(50),
        ledgerId VARCHAR(50),
        amount DECIMAL(15,2) NOT NULL,
        type VARCHAR(5) NOT NULL
    )");

    $pdo->exec("CREATE TABLE IF NOT EXISTS audit_logs (
        id VARCHAR(50) PRIMARY KEY,
        userId VARCHAR(50),
        username VARCHAR(50),
        action VARCHAR(50),
        timestamp VARCHAR(50),
        branchId VARCHAR(50),
        details TEXT
    )");

    // Seed Admin
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM users WHERE username = 'hq_admin'");
    $stmt->execute();
    if ($stmt->fetchColumn() == 0) {
        $stmt = $pdo->prepare("INSERT INTO users (id, username, password, role) VALUES (?,?,?,?)");
        $stmt->execute(['1', 'hq_admin', 'password', 'HQ']);
    }
}

// 3. Routing
$method = $_SERVER['REQUEST_METHOD'];
$path = isset($_GET['request']) ? $_GET['request'] : '';
$input = json_decode(file_get_contents('php://input'), true);

if ($method === 'OPTIONS') exit;

switch ($path) {
    case 'login':
        if ($method === 'POST') {
            $username = $input['username'] ?? '';
            $password = $input['password'] ?? '';
            $code = $input['code'] ?? '';

            if ($code) {
                // Branch Login
                $stmt = $pdo->prepare("SELECT u.*, b.name as branchName FROM users u 
                                     JOIN branches b ON u.branchId = b.id 
                                     WHERE u.username = ? AND u.password = ? AND b.code = ?");
                $stmt->execute([$username, $password, $code]);
            } else {
                // HQ or General Login
                $stmt = $pdo->prepare("SELECT * FROM users WHERE username = ? AND password = ?");
                $stmt->execute([$username, $password]);
            }
            
            $user = $stmt->fetch();
            if ($user) {
                unset($user['password']); // Safety
                // Log audit
                $stmt = $pdo->prepare("INSERT INTO audit_logs (id, userId, username, action, timestamp, branchId, details) VALUES (?,?,?,?,?,?,?)");
                $stmt->execute([(string)time(), $user['id'], $user['username'], 'LOGIN', date('c'), $user['branchId'] ?? 'HQ', 'PHP LOGIN SUCCESS']);
                echo json_encode($user);
            } else {
                http_response_code(401);
                echo json_encode(['error' => 'Invalid username, password, or branch code']);
            }
        }
        break;

    case 'branches':
        if ($method === 'GET') {
            echo json_encode($pdo->query("SELECT * FROM branches")->fetchAll());
        } elseif ($method === 'POST') {
            $input['id'] = (string)time();
            $stmt = $pdo->prepare("INSERT INTO branches (id, code, name, location) VALUES (?,?,?,?)");
            $stmt->execute([$input['id'], $input['code'], $input['name'], $input['location']]);
            echo json_encode($input);
        } elseif ($method === 'DELETE') {
            // Handle /api/branches/123 -> $path is 'branches/123'
            $parts = explode('/', $_GET['request']);
            $id = $parts[1] ?? null;
            if ($id) {
                $stmt = $pdo->prepare("DELETE FROM branches WHERE id = ?");
                $stmt->execute([$id]);
                echo json_encode(['success' => true]);
            }
        }
        break;

    case 'ledgers':
        if ($method === 'GET') {
            $branchId = $_GET['branchId'] ?? null;
            if ($branchId) {
                $stmt = $pdo->prepare("SELECT *, group_name as `group` FROM ledgers WHERE branchId = ?");
                $stmt->execute([$branchId]);
                echo json_encode($stmt->fetchAll());
            } else {
                echo json_encode($pdo->query("SELECT *, group_name as `group` FROM ledgers")->fetchAll());
            }
        } elseif ($method === 'POST') {
            $input['id'] = (string)time();
            $stmt = $pdo->prepare("INSERT INTO ledgers (id, name, group_name, openingBalance, balanceType, branchId) VALUES (?,?,?,?,?,?)");
            $stmt->execute([$input['id'], $input['name'], $input['group'], $input['openingBalance'], $input['balanceType'], $input['branchId']]);
            echo json_encode($input);
        }
        break;

    case 'vouchers':
        if ($method === 'GET') {
            $branchId = $_GET['branchId'] ?? null;
            $where = $branchId ? "WHERE branchId = ?" : "";
            $stmt = $pdo->prepare("SELECT * FROM vouchers $where");
            $branchId ? $stmt->execute([$branchId]) : $stmt->execute();
            $vouchers = $stmt->fetchAll();
            foreach ($vouchers as &$v) {
                $stmt2 = $pdo->prepare("SELECT * FROM voucher_entries WHERE voucherId = ?");
                $stmt2->execute([$v['id']]);
                $v['entries'] = $stmt2->fetchAll();
            }
            echo json_encode($vouchers);
        } elseif ($method === 'POST') {
            $vId = (string)time();
            $stmt = $pdo->prepare("INSERT INTO vouchers (id, number, date, type, narration, amount, branchId) VALUES (?,?,?,?,?,?,?)");
            $stmt->execute([$vId, $input['number'], $input['date'], $input['type'], $input['narration'], $input['amount'], $input['branchId']]);
            if (isset($input['entries'])) {
                foreach ($input['entries'] as $e) {
                    $stmt2 = $pdo->prepare("INSERT INTO voucher_entries (voucherId, ledgerId, amount, type) VALUES (?,?,?,?)");
                    $stmt2->execute([$vId, $e['ledgerId'], $e['amount'], $e['type']]);
                }
            }
            $input['id'] = $vId;
            echo json_encode($input);
        }
        break;

    case 'audit':
        echo json_encode($pdo->query("SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 100")->fetchAll());
        break;

    case 'init': // Call this once to create tables
        init_tables($pdo);
        echo json_encode(['status' => 'success', 'message' => 'Tables initialized']);
        break;

    case 'health':
        echo json_encode(['status' => 'ok', 'service' => 'Tally Church ERP (PHP Edition)', 'db' => 'mysql']);
        break;

    case 'export':
        $data = [
            'branches' => $pdo->query("SELECT * FROM branches")->fetchAll(),
            'users' => $pdo->query("SELECT id, username, role, branchId FROM users")->fetchAll(),
            'ledgers' => $pdo->query("SELECT * FROM ledgers")->fetchAll(),
            'vouchers' => $pdo->query("SELECT * FROM vouchers")->fetchAll(),
            'entries' => $pdo->query("SELECT * FROM voucher_entries")->fetchAll(),
            'logs' => $pdo->query("SELECT * FROM audit_logs")->fetchAll(),
            'timestamp' => date('c')
        ];
        header('Content-Type: application/json');
        header('Content-Disposition: attachment; filename=tally_full_backup.json');
        echo json_encode($data, JSON_PRETTY_PRINT);
        exit;

    default:
        http_response_code(404);
        echo json_encode(['error' => 'Endpoint not found', 'path' => $path]);
        break;
}
