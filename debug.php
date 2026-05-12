<?php
/**
 * Tally Church ERP - Deployment Debugging Tool
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "<html><head><title>System Debug Mode</title><style>
    body { font-family: sans-serif; padding: 40px; line-height: 1.6; background: #f4f7f6; }
    .card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); margin-bottom: 20px; }
    .success { color: green; font-weight: bold; }
    .error { color: red; font-weight: bold; }
    pre { background: #eee; padding: 10px; overflow: auto; }
    h2 { border-bottom: 1px solid #ddd; padding-bottom: 10px; }
</style></head><body>";

echo "<h1>System Deployment Debugger</h1>";

// 1. Directory Info
echo "<div class='card'><h2>1. Directory Structure</h2>";
echo "Current File: " . __FILE__ . "<br>";
echo "Document Root: " . $_SERVER['DOCUMENT_ROOT'] . "<br>";
echo "Current Directory: " . getcwd() . "<br>";

$files = ['index.html', 'api.php', '.htaccess', 'dist/index.html'];
foreach ($files as $f) {
    if (file_exists($f)) {
        echo "<span class='success'>[FOUND]</span> $f (" . round(filesize($f)/1024, 2) . " KB)<br>";
    } else {
        echo "<span class='error'>[MISSING]</span> $f<br>";
    }
}
echo "</div>";

// 2. Database Connection Test
echo "<div class='card'><h2>2. Database Connection Test</h2>";
$host = 'localhost'; 
$db   = 'u698772346_tally'; 
$user = 'u698772346_user';  
$pass = 'YOUR_ACTUAL_PASSWORD_HERE'; // <--- CHANGE THIS TO YOUR REAL PASSWORD

try {
    $pdo = new PDO("mysql:host=$host;dbname=$db;charset=utf8mb4", $user, $pass);
    echo "<span class='success'>[CONNECTED]</span> Database successfully reached.<br>";
    
    $tables = $pdo->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);
    echo "Tables found: " . implode(", ", $tables);
} catch (Exception $e) {
    echo "<span class='error'>[FAILED]</span> " . $e->getMessage() . "<br>";
    echo "<i>Tip: Make sure you created the database and user in Hostinger hPanel.</i>";
}
echo "</div>";

// 3. React Frontend Check
echo "<div class='card'><h2>3. Frontend (React) Health</h2>";
if (file_exists('index.html')) {
    $content = file_get_contents('index.html');
    if (strpos($content, '<div id="root"></div>') !== false) {
        echo "React Root div found in index.html.<br>";
    }
    if (strpos($content, 'src="./assets/') !== false) {
        echo "<span class='success'>[OK]</span> index.html uses relative paths. Correct for builds.<br>";
    } else {
        echo "<span class='error'>[ERROR]</span> your index.html seems like the SOURCE file, not the BUILD file. Please upload the contents of the 'dist' folder.<br>";
    }
} else {
    echo "<span class='error'>[CRITICAL]</span> No index.html found. The browser has nothing to render.";
}
echo "</div>";

// 4. htaccess Check
echo "<div class='card'><h2>4. Server Configuration</h2>";
if (file_exists('.htaccess')) {
    echo ".htaccess exists.<br>";
    if (function_exists('apache_get_modules')) {
        $modules = apache_get_modules();
        if (in_array('mod_rewrite', $modules)) {
            echo "<span class='success'>[OK]</span> mod_rewrite is enabled.<br>";
        } else {
            echo "<span class='error'>[WARN]</span> mod_rewrite might be disabled. SPA routing will fail.<br>";
        }
    }
}
echo "</div>";

echo "</body></html>";
