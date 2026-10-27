
const $ = (id) => document.getElementById(id);

function headUrl(player, size = 64) {
    const id = player.uuid || player.name;
    return "https://mc-heads.net/avatar/" + encodeURIComponent(id) + "/" + size;
}
async function getJSON(url) {
    const res = await fetch(url);
    const data = await res.json();

    if (!res.ok) {
        throw new Error(data.error || "Erreur");
    }

    return data;
}

function formatDate(value) {
    if (value === null || value === undefined) return "—";

    const d = /^\d+$/.test(String(value))
        ? new Date(Number(value))
        : new Date(String(value).replace(" ", "T"));

    return isNaN(d) ? "—" : d.toLocaleString("fr-FR");
}

function sanctionState(s) {
    if (!Number(s.active)) return "Levée";

    if (s.expires_at !== null && Number(s.expires_at) <= Date.now()) {
        return "Expirée";
    }

    return "Active";
}


/* ---------- Page d'accueil ---------- */

async function initHome() {
    const searchInput = $("search-input");
    const searchForm = $("search-form");
    const suggestions = $("search-suggestions");

    if (!searchInput || !searchForm || !suggestions) return;

    let searchTimeout;

    function openPlayer(name) {
        location.href = "player.html?name=" + encodeURIComponent(name);
    }

    function hideSuggestions() {
        suggestions.hidden = true;
        searchInput.setAttribute("aria-expanded", "false");
    }

    async function renderSuggestions() {
        const query = searchInput.value.trim();

        clearTimeout(searchTimeout);
        suggestions.replaceChildren();

        if (query.length < 2) {
            hideSuggestions();
            return;
        }

        searchTimeout = setTimeout(async () => {
            try {
                const players = await getJSON(
                    "api/search-players.php?q=" + encodeURIComponent(query)
                );

                // Ignore les résultats si la recherche a changé.
                if (searchInput.value.trim() !== query) return;

                if (players.length === 0) {
                    const li = document.createElement("li");
                    li.className = "search-suggestion-empty";
                    li.textContent = "Aucun joueur trouvé.";
                    suggestions.appendChild(li);
                } else {
                    for (const player of players) {
                        const li = document.createElement("li");

                        const button = document.createElement("button");
                        button.type = "button";
                        button.className = "search-suggestion";

                        // Tête Minecraft du joueur.
                        const head = document.createElement("img");
                        head.className = "player-head";
                        head.alt = "";
                        head.width = 36;
                        head.height = 36;
                        head.loading = "lazy";
                        head.src = headUrl(player, 36)

                        // Pseudo et statut.
                        const info = document.createElement("span");
                        info.className = "search-suggestion-info";

                        const name = document.createElement("strong");
                        name.textContent = player.name;

                        const status = document.createElement("span");
                        status.className = "search-suggestion-status";
                        status.textContent = Number(player.online)
                            ? "En ligne"
                            : "Hors ligne";

                        info.append(name, status);
                        button.append(head, info);

                        button.addEventListener("click", () => {
                            openPlayer(player.name);
                        });

                        li.appendChild(button);
                        suggestions.appendChild(li);
                    }
                }

                suggestions.hidden = false;
                searchInput.setAttribute("aria-expanded", "true");
            } catch (error) {
                hideSuggestions();

                console.error(
                    "Erreur de recherche des joueurs :",
                    error
                );
            }
        }, 200);
    }

    // Recherche à chaque modification du champ.
    searchInput.addEventListener("input", renderSuggestions);

    // Navigation au clavier depuis le champ de recherche.
    searchInput.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            hideSuggestions();
            return;
        }

        if (event.key === "ArrowDown" && !suggestions.hidden) {
            event.preventDefault();
            suggestions.querySelector("button")?.focus();
        }

        if (event.key === "Enter" && !suggestions.hidden) {
            const focused = document.activeElement;

            if (suggestions.contains(focused)) {
                event.preventDefault();
                focused.click();
            }
        }
    });

    // Navigation au clavier dans les suggestions.
    suggestions.addEventListener("keydown", event => {
        const buttons = [...suggestions.querySelectorAll("button")];
        const index = buttons.indexOf(document.activeElement);

        if (event.key === "ArrowDown") {
            event.preventDefault();
            buttons[Math.min(index + 1, buttons.length - 1)]?.focus();
        }

        if (event.key === "ArrowUp") {
            event.preventDefault();

            if (index <= 0) {
                searchInput.focus();
            } else {
                buttons[index - 1]?.focus();
            }
        }

        if (event.key === "Escape") {
            hideSuggestions();
            searchInput.focus();
        }
    });

    // Recherche directe avec le formulaire.
    searchForm.addEventListener("submit", event => {
        event.preventDefault();

        const name = searchInput.value.trim();

        if (name) {
            openPlayer(name);
        }
    });

    // Ferme les suggestions en cliquant ailleurs.
    document.addEventListener("click", event => {
        if (!searchForm.contains(event.target)) {
            hideSuggestions();
        }
    });

    // Charge les joueurs actuellement connectés.
    try {
        const players = await getJSON("api/online.php");

        $("online-count").textContent = players.length;
        $("online-empty").hidden = players.length > 0;
        $("online-list").replaceChildren();

        for (const player of players) {
            const li = document.createElement("li");
            const a = document.createElement("a");

            a.textContent = player.name;
            a.href =
                "player.html?name=" +
                encodeURIComponent(player.name);

            li.appendChild(a);
            $("online-list").appendChild(li);
        }
    } catch (error) {
        $("online-empty").textContent =
            "Impossible de charger les joueurs.";
        $("online-empty").hidden = false;

        console.error(
            "Erreur de chargement des joueurs en ligne :",
            error
        );
    }
}


/* ---------- Page profil ---------- */

async function initPlayer() {
    const name = new URLSearchParams(location.search).get("name");

    if (!name) {
        showError("Aucun joueur indiqué.");
        return;
    }

    try {
        const p = await getJSON(
            "api/player.php?name=" + encodeURIComponent(name)
        );

        renderSanctionsChart(p.sanctions);

        document.title = p.name + " - Elestya";
        $("player-name").textContent = p.name;
        $("player-head").src = headUrl(p, 128);
        $("player-status").textContent =
            Number(p.online) ? "En ligne" : "Hors ligne";
        $("first-login").textContent = formatDate(p.first_login);
        $("last-login").textContent = formatDate(p.last_login);
        $("profile").hidden = false;

        $("sanctions-section").hidden = false;
        $("player-economy").textContent = p.player_economy;

        if (p.sanctions.length === 0) {
            $("no-sanctions").hidden = false;
            return;
        }

        $("sanctions-table").hidden = false;

        for (const s of p.sanctions) {
            const tr = document.createElement("tr");

            const cells = [
                s.type,
                s.reason,
                formatDate(s.created_at),
                s.expires_at === null
                    ? "Permanente"
                    : formatDate(s.expires_at),
                sanctionState(s)
            ];

            for (const text of cells) {
                const td = document.createElement("td");
                td.textContent = text;
                tr.appendChild(td);
            }

            $("sanctions-body").appendChild(tr);
        }
    } catch (e) {
        showError(e.message);
    }
}


/* ---------- Gestion des erreurs ---------- */

function showError(message) {
    const error = $("error");

    if (!error) {
        console.error(message);
        return;
    }

    error.textContent = message;
    error.hidden = false;
}


/* ---------- Initialisation des pages ---------- */

if ($("online-list")) {
    void initHome();
}

if ($("player-name")) {
    void initPlayer();
}


/* ---------- Graphique des sanctions ---------- */

function renderSanctionsChart(sanctions) {
    const chart = $("sanctions-chart");
    const totalElement = $("sanctions-total");
    const legend = $("sanctions-legend");
    const content = $("sanctions-chart-content");
    const empty = $("sanctions-chart-empty");

    if (!chart || !totalElement || !legend || !content || !empty) {
        return;
    }

    const colors = [
        "#f87171",
        "#fb923c",
        "#facc15",
        "#4ade80",
        "#38bdf8",
        "#818cf8",
        "#c084fc",
        "#f472b6"
    ];

    const labels = {
        BAN: "Bannissements",
        TEMPBAN: "Bannissements temporaires",
        MUTE: "Silences",
        TEMPMUTE: "Silences temporaires",
        WARN: "Avertissements",
        KICK: "Expulsions"
    };

    const counts = new Map();

    for (const sanction of sanctions ?? []) {
        const type = String(sanction.type ?? "OTHER").toUpperCase();

        counts.set(type, (counts.get(type) ?? 0) + 1);
    }

    const entries = [...counts.entries()]
        .sort((a, b) => b[1] - a[1]);

    const total = entries.reduce((sum, entry) => sum + entry[1], 0);

    totalElement.textContent = total;
    legend.replaceChildren();

    if (total === 0) {
        content.hidden = true;
        empty.hidden = false;
        return;
    }

    content.hidden = false;
    empty.hidden = true;

    let currentAngle = 0;
    const segments = [];

    entries.forEach(([type, count], index) => {
        const angle = (count / total) * 360;
        const color = colors[index % colors.length];

        segments.push(
            `${color} ${currentAngle}deg ${currentAngle + angle}deg`
        );

        currentAngle += angle;

        const item = document.createElement("li");

        const colorBox = document.createElement("span");
        colorBox.className = "sanctions-legend-color";
        colorBox.style.backgroundColor = color;
        colorBox.setAttribute("aria-hidden", "true");

        const label = document.createElement("span");
        label.textContent = labels[type] ?? type;

        const countElement = document.createElement("span");
        countElement.className = "sanctions-legend-count";
        countElement.textContent =
            `${count} · ${Math.round((count / total) * 100)} %`;

        item.append(colorBox, label, countElement);
        legend.appendChild(item);
    });

    chart.style.background =
        `conic-gradient(${segments.join(", ")})`;

    chart.setAttribute(
        "aria-label",
        `Répartition de ${total} sanctions par type`
    );
}


/* ---------- Statistiques du dashboard ---------- */

function formatDuration(seconds) {
    seconds = Math.max(0, Math.floor(Number(seconds) || 0));

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
        return `${hours} h ${minutes} min`;
    }

    return `${minutes} min`;
}

function renderNewPlayersChart(points) {
    const svg = $("analytics-chart");

    if (!svg) return;

    const NS = "http://www.w3.org/2000/svg";

    svg.replaceChildren();

    const width = 800;
    const height = 260;
    const left = 42;
    const right = 14;
    const top = 18;
    const bottom = 42;

    const chartWidth = width - left - right;
    const chartHeight = height - top - bottom;

    const values = points.map(point => Number(point.count) || 0);
    const maxValue = Math.max(1, ...values);
    const maxScale = Math.max(4, Math.ceil(maxValue / 4) * 4);

    const x = index => points.length <= 1
        ? left + chartWidth / 2
        : left + index * chartWidth / (points.length - 1);

    const y = value =>
        top + chartHeight - (value / maxScale) * chartHeight;

    function element(tag, attributes = {}) {
        const node = document.createElementNS(NS, tag);

        for (const [key, value] of Object.entries(attributes)) {
            node.setAttribute(key, String(value));
        }

        return node;
    }

    // Grille horizontale et valeurs de l'axe vertical.
    for (let i = 0; i <= 4; i++) {
        const value = maxScale - i * maxScale / 4;
        const py = y(value);

        svg.appendChild(element("line", {
            x1: left,
            y1: py,
            x2: width - right,
            y2: py,
            class: "analytics-grid-line"
        }));

        const label = element("text", {
            x: left - 10,
            y: py + 4,
            "text-anchor": "end",
            class: "analytics-axis-label"
        });

        label.textContent = String(value);
        svg.appendChild(label);
    }

    const coordinates = points.map((point, index) =>
        `${x(index)},${y(Number(point.count) || 0)}`
    );

    if (points.length > 0) {
        svg.appendChild(element("polygon", {
            points: [
                `${x(0)},${y(0)}`,
                ...coordinates,
                `${x(points.length - 1)},${y(0)}`
            ].join(" "),
            class: "analytics-chart-area"
        }));

        svg.appendChild(element("polyline", {
            points: coordinates.join(" "),
            class: "analytics-chart-line"
        }));

        points.forEach((point, index) => {
            const circle = element("circle", {
                cx: x(index),
                cy: y(Number(point.count) || 0),
                r: 3,
                class: "analytics-chart-point"
            });

            const title = element("title");

            title.textContent =
                `${point.date} : ${point.count} nouveau(x) joueur(s)`;

            circle.appendChild(title);
            svg.appendChild(circle);
        });

        // Six repères de date sur l'axe horizontal.
        const labelIndexes = [...new Set([
            0,
            Math.floor((points.length - 1) / 5),
            Math.floor(2 * (points.length - 1) / 5),
            Math.floor(3 * (points.length - 1) / 5),
            Math.floor(4 * (points.length - 1) / 5),
            points.length - 1
        ])];

        labelIndexes.forEach(index => {
            const label = element("text", {
                x: x(index),
                y: height - 12,
                "text-anchor": "middle",
                class: "analytics-axis-label"
            });

            const date = new Date(`${points[index].date}T12:00:00`);

            label.textContent = date.toLocaleDateString("fr-FR", {
                day: "2-digit",
                month: "2-digit"
            });

            svg.appendChild(label);
        });
    }
}

async function loadDashboardStats() {
    const loading = $("analytics-loading");
    const content = $("analytics-content");
    const error = $("analytics-error");
    const button = $("analytics-refresh");

    if (!loading || !content || !error || !button) {
        console.error(
            "Éléments HTML manquants pour les statistiques du dashboard."
        );
        return;
    }

    loading.hidden = false;
    error.hidden = true;
    loading.textContent = "Chargement des statistiques…";
    button.disabled = true;

    try {
        const data = await getJSON("api/dashboard-stats.php");

        const newPlayers = data.new_players ?? [];

        const newPlayersElement = $("analytics-new-players");

        if (newPlayersElement) {
            newPlayersElement.textContent = newPlayers.reduce(
                (sum, point) => sum + Number(point.count || 0),
                0
            );
        }

        const globalReturn = data.global_return ?? {};

        const returnRate = $("analytics-return-rate");

        if (returnRate) {
            returnRate.textContent =
                `${Number(globalReturn.percentage || 0).toLocaleString("fr-FR")} %`;
        }

        const returnDetail = $("analytics-return-detail");

        if (returnDetail) {
            returnDetail.textContent =
                `${globalReturn.returned_players ?? 0} joueurs revenus sur ` +
                `${globalReturn.total_players ?? 0}`;
        }

        const time7 = $("analytics-time-7");

        if (time7) {
            time7.textContent =
                formatDuration(data.playtime?.days_7?.average_daily_seconds);
        }

        const time30 = $("analytics-time-30");

        if (time30) {
            time30.textContent =
                formatDuration(data.playtime?.days_30?.average_daily_seconds);
        }

        for (const days of [1, 7, 30]) {
            const metric = data.retention?.[`day_${days}`];
            const percentage = metric?.percentage;

            const dayElement = $(`retention-day-${days}`);
            const detailElement = $(`retention-detail-${days}`);

            if (dayElement) {
                dayElement.textContent =
                    percentage === null || percentage === undefined
                        ? "—"
                        : `${Number(percentage).toLocaleString("fr-FR")} %`;
            }

            if (detailElement) {
                detailElement.textContent = metric
                    ? `${metric.returned} revenus sur ${metric.eligible} éligibles`
                    : "Données indisponibles";
            }
        }

        renderNewPlayersChart(newPlayers);

        content.hidden = false;
        loading.hidden = true;
    } catch (e) {
        content.hidden = true;
        loading.hidden = true;

        error.textContent = e instanceof Error
            ? e.message
            : "Impossible de charger les statistiques.";

        error.hidden = false;

        console.error(
            "Erreur des statistiques du dashboard :",
            e
        );
    } finally {
        button.disabled = false;
    }
}


/* ---------- Initialisation des statistiques ---------- */

if ($("analytics-content")) {
    $("analytics-refresh")?.addEventListener(
        "click",
        loadDashboardStats
    );

    void loadDashboardStats();
}


/* ---------- Gestion du thème ---------- */

function initTheme() {
    const button = $("theme-toggle");
    const body = document.body;

    function applyTheme(theme) {
        const isLight = theme === "light";

        body.classList.toggle("light-mode", isLight);

        if (button) {
            button.textContent = isLight
                ? "🌙 Mode sombre"
                : "☀️ Mode clair";

            button.setAttribute(
                "aria-label",
                isLight
                    ? "Activer le mode sombre"
                    : "Activer le mode clair"
            );
        }
    }

    let savedTheme;

    try {
        savedTheme = localStorage.getItem("elestya-theme");
    } catch (error) {
        console.warn("Impossible de lire le thème enregistré.", error);
    }

    applyTheme(savedTheme === "light" ? "light" : "dark");

    button?.addEventListener("click", () => {
        const nextTheme = body.classList.contains("light-mode")
            ? "dark"
            : "light";

        applyTheme(nextTheme);

        try {
            localStorage.setItem("elestya-theme", nextTheme);
        } catch (error) {
            console.warn("Impossible d'enregistrer le thème.", error);
        }
    });
}

initTheme();
