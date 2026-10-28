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

    // Récupération de la banque (n'empêche pas l'affichage du profil si ça échoue)
    $player['player_economy'] = ['money' => 0];
    try {
        $st = db()->prepare(
            "SELECT money
             FROM players_economy
             WHERE uuid = ?"
        );
        $st->execute([$player['uuid']]);
        $player['player_economy'] = $st->fetch(PDO::FETCH_ASSOC) ?: ['money' => 0];
    } catch (Throwable $e) {
        error_log('players_economy: ' . $e->getMessage());
    }

    // Historique des transactions (50 dernières)
    $player['economy_history'] = [];
    try {
        $st = db()->prepare(
            "SELECT amount, type, `timestamp`
             FROM players_economy_history
             WHERE uuid = ?
             ORDER BY `timestamp` DESC
             LIMIT 50"
        );
        $st->execute([$player['uuid']]);
        $player['economy_history'] = $st->fetchAll(PDO::FETCH_ASSOC);
    } catch (Throwable $e) {
        error_log('players_economy_history: ' . $e->getMessage());
    }

    // Métiers : les 6 sont toujours renvoyés (niveau 1 / prestige 0 par défaut)
    $jobs = [];
    foreach (['MINEUR', 'BUCHERON', 'PECHEUR', 'FERMIER', 'CONSTRUCTEUR', 'EXPLORATEUR'] as $job) {
        $jobs[$job] = ['metier' => $job, 'level' => 1, 'prestige' => 0];
    }
    try {
        $st = db()->prepare(
            "SELECT metier, level, prestige
             FROM players_jobs
             WHERE uuid = ?"
        );
        $st->execute([$player['uuid']]);
        foreach ($st->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $key = strtoupper($row['metier']);
            if (isset($jobs[$key])) {
                $jobs[$key]['level'] = (int) $row['level'];
                $jobs[$key]['prestige'] = (int) $row['prestige'];
            }
        }
    } catch (Throwable $e) {
        error_log('players_jobs: ' . $e->getMessage());
    }
    $player['jobs'] = array_values($jobs);

    // Ne pas exposer l'UUID
    unset($player['uuid']);

    echo json_encode($player);

} catch (Throwable $e) {
    error_log($e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Erreur serveur']);
}