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
        "SELECT uuid, name, first_login, last_login, online
         FROM players
         WHERE name = ?"
    );
    $st->execute([$name]);
    $player = $st->fetch(PDO::FETCH_ASSOC);

    if (!$player) {
        http_response_code(404);
        echo json_encode(['error' => 'Joueur introuvable']);
        exit;
    }

    // Récupération des sanctions
    $st = db()->prepare(
        "SELECT type, reason, created_at, expires_at, active
         FROM sanctions
         WHERE uuid = ?
         ORDER BY created_at DESC"
    );
    $st->execute([$player['uuid']]);
    $player['sanctions'] = $st->fetchAll(PDO::FETCH_ASSOC);

    // Récupération de la banque
    $st = db()->prepare(
        "SELECT money 
        FROM players_economy"
        WHERE uuid = ?
    );
    $st->execute([$player['uuid']]);
    $player['player_economy'] = $st->fetchAll(PDO::FETCH_ASSOC);

    // Ne pas exposer l'UUID
    unset($player['uuid']);

    echo json_encode($player);

} catch (Throwable $e) {
    error_log($e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Erreur serveur']);
}