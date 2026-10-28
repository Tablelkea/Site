<?php
require __DIR__ . '/../config.php';
header('Content-Type: application/json; charset=utf-8');

$name = trim($_GET['name'] ?? '');

if ($name === '' || strlen($name) > 255) {
    http_response_code(400);
    echo json_encode(['error' => 'Pseudo invalide']);
    exit;
}

try {
    $st = db()->prepare(
        "SELECT money, name
         FROM players_economy
         WHERE name = ?"
    );
    $st->execute([$name]);
    $eco = $st->fetch(PDO::FETCH_ASSOC);

    if (!$eco) {
        http_response_code(404);
        echo json_encode(['error' => 'Aucune donnée économique']);
        exit;
    }

    echo json_encode([
        'name'  => $eco['name'],
        'money' => (float) $eco['money'],
    ]);

} catch (Throwable $e) {
    error_log($e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Erreur serveur']);
}