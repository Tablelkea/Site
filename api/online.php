<?php
require __DIR__ . '/../config.php';
header('Content-Type: application/json; charset=utf-8');

try {
    $rows = db()->query(
        "SELECT name FROM players WHERE online = TRUE ORDER BY name"
    )->fetchAll();
    echo json_encode($rows);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}