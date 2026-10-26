<?php
function db(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        $pdo = new PDO(
            "mysql:host=sql2.minestrator.com;port=3306;dbname=minesr_AgDV2vCD;charset=utf8mb4",
            "minesr_AgDV2vCD",
            "URTaGYCtJ8l7uQpx",
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ]
        );
    }
    return $pdo;
}