
<?php
require __DIR__ . '/../config.php';

header('Content-Type: application/json; charset=utf-8');

$query = trim($_GET['q'] ?? '');

if (strlen($query) > 255) {
    http_response_code(400);
    echo json_encode(['error' => 'Recherche trop longue']);
    exit;
}

if (strlen($query) < 2) {
    echo json_encode([]);
    exit;
}

try {
    $st = db()->prepare(
    "SELECT uuid, name, online
     FROM players
     WHERE name LIKE ?
     ORDER BY online DESC, name ASC
     LIMIT 10"
);

    $st->execute(['%' . $query . '%']);

    echo json_encode($st->fetchAll());
} catch (Throwable $e) {
    error_log($e->getMessage());

    http_response_code(500);
    echo json_encode(['error' => 'Erreur serveur']);
}
