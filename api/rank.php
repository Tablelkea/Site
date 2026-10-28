
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
        "SELECT p.name, r.`rank`
         FROM players p
         LEFT JOIN players_rank_history r
             ON r.uuid = p.uuid
         WHERE p.name = ?
         ORDER BY r.id DESC
         LIMIT 1"
    );

    $st->execute([$name]);
    $player = $st->fetch(PDO::FETCH_ASSOC);

    if (!$player) {
        http_response_code(404);
        echo json_encode(['error' => 'Joueur introuvable']);
        exit;
    }

    if ($player['rank'] === null) {
        http_response_code(404);
        echo json_encode(['error' => 'Aucun grade enregistré']);
        exit;
    }

    echo json_encode([
        'name' => $player['name'],
        'rank' => $player['rank']
    ], JSON_UNESCAPED_UNICODE);

} catch (Throwable $e) {
    error_log($e->getMessage());

    http_response_code(500);
    echo json_encode(['error' => 'Erreur serveur']);
}
