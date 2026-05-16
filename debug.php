<?php
/**
 * Tally Church ERP - Hostinger Connection Debugger
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);

// Configuration - Matches api.php and .env
$db_config = [
    'host' => 'srv1994.hstgr.io', // External Host for local testing
    'local_host' => 'localhost',   // Host to use when running ON Hostinger
    'db'   => 'u698772346_ebctallys',
    'user' => 'u698772346_ebctallys',
    'pass' => '1pA2QIL5|xA|'
];

echo "<html><head><title>Hostinger DB Debugger</title><style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; line-height: 1.6; background: #f0f2f5; color: #333; }
    .card { background: white; padding: 25px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.08); margin-bottom: 25px; }
    .status-box { padding: 15px; border-radius: 8px; margin: 10px 0; font-weight: bold; }
    .success { background: #e6fffa; color: #2c7a7b; border: 1px solid #b2f5ea; }
    .error { background: #fff5f5; color: #c53030; border: 1px solid #fed7d7; }
    .info { background: #ebf8ff; color: #2b6cb0; border: 1px solid #bee3f8; }
    pre { background: #1a202c; color: #ebf8ff; padding: 15px; border-radius: 6px; overflow: auto; font-size: 14px; }
    h2 { border-bottom: 2px solid #edf2f7; padding-bottom: 10px; color: #2d3748; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; margin-left: 10px; }
    .badge-remote { background: #ecc94b; color: #744210; }
    .badge-local { background: #4299e1; color: #fff; }
</style></head><body>";

echo "<h1>🛠️ Database Connection Diagnostic</h1>";

// 1. Environment Info
echo "<div class='card'><h2>1. System Environment</h2>";
$is_local = ($_SERVER['REMOTE_ADDR'] == '127.0.0.1' || $_SERVER['REMOTE_ADDR'] == '::1' || strpos($_SERVER['HTTP_HOST'], 'localhost') !== false);
$current_host = $is_local ? $db_config['host'] : $db_config['local_host'];

echo "Running Environment: " . ($is_local ? "<span class='badge badge-remote'>LOCAL MACHINE</span>" : "<span class='badge badge-local'>HOSTINGER SERVER</span>") . "<br>";
echo "PHP Version: " . phpversion() . "<br>";
echo "Target DB Host: <code>$current_host</code><br>";
echo "Database Name: <code>{$db_config['db']}</code><br>";
echo "</div>";

// 2. Connection Test
echo "<div class='card'><h2>2. Connection Test</h2>";
try {
    $dsn = "mysql:host=$current_host;dbname={$db_config['db']};charset=utf8mb4";
    $start = microtime(true);
    $pdo = new PDO($dsn, $db_config['user'], $db_config['pass'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_TIMEOUT => 5
    ]);
    $end = microtime(true);
    $time = round(($end - $start) * 1000, 2);

    echo "<div class='status-box success'>✅ SUCCESS: Connected to database in {$time}ms</div>";
    
    // Check Tables
    $tables = $pdo->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);
    echo "<h3>Tables Found (" . count($tables) . "):</h3>";
    if (count($tables) > 0) {
        echo "<ul>";
        foreach ($tables as $t) echo "<li>$t</li>";
        echo "</ul>";
    } else {
        echo "<p class='error'>No tables found! Visit <a href='api.php?request=init'>api.php?request=init</a></p>";
    }

    // Check Users
    $userCount = $pdo->query("SELECT COUNT(*) FROM users")->fetchColumn();
    echo "<p class='info'>User Records: <strong>$userCount</strong></p>";

} catch (PDOException $e) {
    echo "<div class='status-box error'>❌ FAILED: " . $e->getMessage() . "</div>";
    
    echo "<h3>Common Fixes:</h3>";
    echo "<ul>";
    if ($is_local) {
        echo "<li><strong>Remote MySQL:</strong> Log in to Hostinger hPanel > Databases > Remote MySQL and add your IP: <code>{$_SERVER['REMOTE_ADDR']}</code></li>";
        echo "<li><strong>Firewall:</strong> Ensure your local firewall allows outgoing connections on port 3306.</li>";
    }
    echo "<li><strong>Credentials:</strong> Verify DB_USER and DB_PASSWORD match exactly what is in Hostinger hPanel.</li>";
    echo "</ul>";
    
    echo "<h3>Full Error Details:</h3>";
    echo "<pre>" . print_r($e, true) . "</pre>";
}
echo "</div>";

echo "</body></html>";
