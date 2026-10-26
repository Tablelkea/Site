<?php

require __DIR__ . '/../config.php';

header('Content-Type: application/json; charset=utf-8');

try {
    $pdo = db();

    // Nombre de joueurs ayant déjà rejoint le serveur.
    $totalPlayers = (int) $pdo->query(
        "SELECT COUNT(DISTINCT uuid) FROM player_sessions"
    )->fetchColumn();

    // Joueurs ayant effectué au moins deux sessions.
    $returnedPlayers = (int) $pdo->query("
        SELECT COUNT(*)
        FROM (
            SELECT uuid
            FROM player_sessions
            GROUP BY uuid
            HAVING COUNT(*) >= 2
        ) AS returning_players
    ")->fetchColumn();

    $globalReturnRate = $totalPlayers > 0
        ? round($returnedPlayers / $totalPlayers * 100, 1)
        : 0;

    // Rétention à J+1, J+7 et J+30.
    // Un joueur est retenu s'il se reconnecte le jour exact
    // correspondant à son premier jour de connexion.
    $retention = [];

    foreach ([1, 7, 30] as $days) {
        $sql = "
            SELECT
                COUNT(*) AS eligible,
                COALESCE(SUM(
                    EXISTS (
                        SELECT 1
                        FROM player_sessions AS later
                        WHERE later.uuid = first_sessions.uuid
                          AND later.joined_at >= DATE_ADD(
                              DATE(first_sessions.first_join),
                              INTERVAL {$days} DAY
                          )
                          AND later.joined_at < DATE_ADD(
                              DATE(first_sessions.first_join),
                              INTERVAL " . ($days + 1) . " DAY
                          )
                    )
                ), 0) AS returned
            FROM (
                SELECT uuid, MIN(joined_at) AS first_join
                FROM player_sessions
                GROUP BY uuid
            ) AS first_sessions
            WHERE DATE(first_sessions.first_join)
                <= DATE_SUB(CURDATE(), INTERVAL {$days} DAY)
        ";

        $result = $pdo->query($sql)->fetch(PDO::FETCH_ASSOC);

        $eligible = (int) $result['eligible'];
        $returned = (int) $result['returned'];

        $retention["day_{$days}"] = [
            'eligible' => $eligible,
            'returned' => $returned,
            'percentage' => $eligible > 0
                ? round($returned / $eligible * 100, 1)
                : null
        ];
    }

    // Nouveaux joueurs sur les 30 derniers jours.
    $newPlayersByDay = $pdo->query("
        SELECT
            DATE(first_join) AS day,
            COUNT(*) AS total
        FROM (
            SELECT uuid, MIN(joined_at) AS first_join
            FROM player_sessions
            GROUP BY uuid
        ) AS first_sessions
        WHERE first_join >= DATE_SUB(CURDATE(), INTERVAL 29 DAY)
          AND first_join < DATE_ADD(CURDATE(), INTERVAL 1 DAY)
        GROUP BY DATE(first_join)
        ORDER BY day ASC
    ")->fetchAll(PDO::FETCH_ASSOC);

    // Remplit également les journées sans nouvelle connexion.
    $dailyCounts = [];

    foreach ($newPlayersByDay as $row) {
        $dailyCounts[$row['day']] = (int) $row['total'];
    }

    $chart = [];
    $today = new DateTimeImmutable('today');

    for ($i = 29; $i >= 0; $i--) {
        $day = $today->modify("-{$i} days")->format('Y-m-d');

        $chart[] = [
            'date' => $day,
            'count' => $dailyCounts[$day] ?? 0
        ];
    }

    
    // Temps de jeu par journées calendaires : de 00 h 00 à 00 h 00.
    // Exclut les joueurs ayant plus de 30 jours de jeu cumulé sur le serveur.
    $playtime = [];

    foreach ([7, 30] as $days) {
        $sql = "
            SELECT COALESCE(SUM(ps.duration_seconds), 0)
            FROM player_sessions AS ps
            WHERE ps.joined_at >= DATE_SUB(CURDATE(), INTERVAL {$days} DAY)
              AND ps.joined_at < CURDATE()
              AND ps.uuid IN (
                  SELECT eligible.uuid
                  FROM player_sessions AS eligible
                  GROUP BY eligible.uuid
                  HAVING SUM(eligible.duration_seconds) <= 2592000
              )
        ";

        $totalSeconds = (int) $pdo->query($sql)->fetchColumn();

        $playtime["days_{$days}"] = [
            'total_seconds' => $totalSeconds,
            'average_daily_seconds' => (int) round(
                $totalSeconds / $days
            )
        ];
    }


    echo json_encode([
        'new_players' => $chart,
        'retention' => $retention,
        'global_return' => [
            'total_players' => $totalPlayers,
            'returned_players' => $returnedPlayers,
            'percentage' => $globalReturnRate
        ],
        'playtime' => $playtime
    ], JSON_THROW_ON_ERROR);

} catch (Throwable $e) {
    error_log('Dashboard stats: ' . $e->getMessage());

    http_response_code(500);

    echo json_encode([
        'error' => 'Impossible de charger les statistiques.'
    ]);
}