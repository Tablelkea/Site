
(() => {
    const STORAGE_KEY = 'elestya.commands-page.v1';

    const defaultData = {
        plugins: [
            { id: 'essentialsx', name: 'EssentialsX' },
            { id: 'luckperms', name: 'LuckPerms' },
            { id: 'elestya-core', name: 'ElestyaCore' }
        ],
        commands: [
            {
                id: 'demo-spawn',
                name: '/spawn',
                usage: '/spawn [joueur]',
                description: 'Téléporte le joueur au point d’apparition du serveur.',
                pluginId: 'essentialsx'
            },
            {
                id: 'demo-home',
                name: '/home',
                usage: '/home [nom]',
                description: 'Téléporte le joueur vers une maison enregistrée.',
                pluginId: 'essentialsx'
            },
            {
                id: 'demo-sethome',
                name: '/sethome',
                usage: '/sethome [nom]',
                description: 'Enregistre une maison à la position actuelle.',
                pluginId: 'essentialsx'
            },
            {
                id: 'demo-lp',
                name: '/lp user <joueur> info',
                usage: '/lp user <joueur> info',
                description: 'Affiche les informations de permissions et de groupes d’un joueur.',
                pluginId: 'luckperms'
            },
            {
                id: 'demo-report',
                name: '/report',
                usage: '/report <joueur> <raison>',
                description: 'Envoie un signalement à l’équipe de modération.',
                pluginId: 'elestya-core'
            }
        ]
    };

    const $ = (selector) => document.querySelector(selector);

    const pluginList = $('#plugin-list');
    const commandsList = $('#commands-list');
    const searchInput = $('#command-search');
    const commandForm = $('#command-form');
    const pluginForm = $('#plugin-form');

    let selectedPluginId = 'all';
    let data = loadData();


    let pendingDeletion = null;
    let previousFocus = null;

    function openDeleteOverlay(type, id, name, details = '') {
        pendingDeletion = { type, id };
        previousFocus = document.activeElement;

        const overlay = $('#delete-overlay');
        const title = $('#delete-title');
        const description = $('#delete-description');
        const summary = $('#delete-summary');
        const confirmButton = $('#delete-confirm');

        title.textContent = type === 'plugin'
            ? 'Supprimer ce plugin ?'
            : 'Supprimer cette commande ?';

        description.textContent = type === 'plugin'
            ? 'Le plugin et toutes ses commandes associées seront supprimés.'
            : 'Cette commande sera définitivement retirée de la documentation.';

        summary.textContent = details
            ? `${name} — ${details}`
            : name;

        confirmButton.textContent = 'Supprimer';
        overlay.hidden = false;
        document.body.classList.add('modal-open');
        confirmButton.focus();
    }

    function closeDeleteOverlay() {
        $('#delete-overlay').hidden = true;
        pendingDeletion = null;

        if (![...document.querySelectorAll('.modal-backdrop')]
            .some((modal) => !modal.hidden)) {
            document.body.classList.remove('modal-open');
        }

        previousFocus?.focus();
    }

    function executeDeletion() {
        if (!pendingDeletion) return;

        const { type, id } = pendingDeletion;

        if (type === 'command') {
            data.commands = data.commands.filter(
                (command) => command.id !== id
            );
        } else if (type === 'plugin') {
            data.plugins = data.plugins.filter(
                (plugin) => plugin.id !== id
            );

            data.commands = data.commands.filter(
                (command) => command.pluginId !== id
            );

            if (selectedPluginId === id) {
                selectedPluginId = 'all';
            }
        }

        saveData();
        closeDeleteOverlay();
        render();
    }

    $('#delete-cancel').addEventListener('click', closeDeleteOverlay);
    $('#delete-confirm').addEventListener('click', executeDeletion);

    $('#delete-overlay').addEventListener('click', (event) => {
        if (event.target.id === 'delete-overlay') {
            closeDeleteOverlay();
        }
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && !$('#delete-overlay').hidden) {
            closeDeleteOverlay();
        }
    });


    function loadData() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);

            if (stored) {
                const parsed = JSON.parse(stored);

                if (
                    Array.isArray(parsed.plugins) &&
                    Array.isArray(parsed.commands)
                ) {
                    return parsed;
                }
            }
        } catch (error) {
            console.warn(
                'Impossible de lire les données locales.',
                error
            );
        }

        return JSON.parse(JSON.stringify(defaultData));
    }

    function saveData() {
        try {
            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(data)
            );
        } catch (error) {
            console.error(error);
            alert('Impossible de sauvegarder les données dans ce navigateur.');
        }
    }

    function escapeHTML(value) {
        return String(value).replace(/[&<>"']/g, (char) => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        })[char]);
    }

    function getPlugin(pluginId) {
        return data.plugins.find(
            (plugin) => plugin.id === pluginId
        );
    }



    function renderPlugins() {
        const allCount = data.commands.length;

        const allButton = `
    <button class="plugin-filter ${selectedPluginId === 'all' ? 'active' : ''}"
      type="button" data-plugin-id="all"
      aria-pressed="${selectedPluginId === 'all'}">
      <span class="plugin-mark">⌘</span>
      <span class="plugin-name">Tous les plugins</span>
      <span class="plugin-command-count">${allCount}</span>
    </button>`;

        const pluginButtons = data.plugins.map((plugin) => {
            const count = data.commands.filter(
                (command) => command.pluginId === plugin.id
            ).length;

            const active = selectedPluginId === plugin.id;
            const mark = escapeHTML(plugin.name.trim().charAt(0).toUpperCase() || 'P');

            return `
      <div class="plugin-row">
        <button class="plugin-filter ${active ? 'active' : ''}"
          type="button" data-plugin-id="${escapeHTML(plugin.id)}"
          aria-pressed="${active}">
          <span class="plugin-mark">${mark}</span>
          <span class="plugin-name">${escapeHTML(plugin.name)}</span>
          <span class="plugin-command-count">${count}</span>
        </button>

        <button class="plugin-delete" type="button"
          data-delete-plugin="${escapeHTML(plugin.id)}"
          aria-label="Supprimer le plugin ${escapeHTML(plugin.name)}"
          title="Supprimer ce plugin">×</button>
      </div>`;
        }).join('');

        pluginList.innerHTML = allButton + pluginButtons;
        $('#plugin-count').textContent = data.plugins.length;

        const select = $('#command-plugin-select');
        const previous = select.value;

        select.innerHTML = data.plugins.map((plugin) =>
            `<option value="${escapeHTML(plugin.id)}">${escapeHTML(plugin.name)}</option>`
        ).join('');

        if (data.plugins.some((plugin) => plugin.id === previous)) {
            select.value = previous;
        } else if (data.plugins.length) {
            select.value = data.plugins[0].id;
        }

        $('#add-command-open').disabled = data.plugins.length === 0;
        $('#empty-add-command').disabled = data.plugins.length === 0;
    }



    function renderCommands() {
        const query = searchInput.value
            .trim()
            .toLocaleLowerCase('fr');

        const selectedPlugin = selectedPluginId === 'all'
            ? null
            : getPlugin(selectedPluginId);

        const filtered = data.commands.filter((command) => {
            const plugin = getPlugin(command.pluginId);

            const matchesPlugin =
                selectedPluginId === 'all' ||
                command.pluginId === selectedPluginId;

            const haystack = `
        ${command.name}
        ${command.usage}
        ${command.description}
        ${plugin?.name ?? ''}
      `.toLocaleLowerCase('fr');

            return matchesPlugin && haystack.includes(query);
        });

        $('#selected-eyebrow').textContent =
            selectedPlugin ? 'PLUGIN SÉLECTIONNÉ' : 'DOCUMENTATION';

        $('#selected-title').textContent =
            selectedPlugin ? selectedPlugin.name : 'Toutes les commandes';

        $('#command-count').textContent =
            `${filtered.length} commande${filtered.length > 1 ? 's' : ''}`;

        $('#empty-state').hidden = filtered.length !== 0;
        commandsList.hidden = filtered.length === 0;

        commandsList.innerHTML = filtered.map((command) => {
            const plugin = getPlugin(command.pluginId);

            return `
        <article class="command-card">
          <div class="command-card-top">
            <div style="min-width:0;flex:1">
              <div class="command-title">
                <span class="command-symbol">/</span>
                <h3>${escapeHTML(command.name)}</h3>
              </div>

              <span class="plugin-tag">
                ${escapeHTML(plugin?.name ?? 'Plugin inconnu')}
              </span>

              <div>
                <code class="command-usage">
                  ${escapeHTML(command.usage)}
                </code>
              </div>

              <p class="command-description">
                ${escapeHTML(command.description)}
              </p>
            </div>

            <button
              class="command-delete"
              type="button"
              data-delete-command="${escapeHTML(command.id)}"
              aria-label="Supprimer ${escapeHTML(command.name)}"
              title="Supprimer cette commande"
            >×</button>
          </div>
        </article>
      `;
        }).join('');
    }

    function render() {
        if (
            selectedPluginId !== 'all' &&
            !getPlugin(selectedPluginId)
        ) {
            selectedPluginId = 'all';
        }

        renderPlugins();
        renderCommands();
    }

    function openModal(id) {
        const modal = document.getElementById(id);

        if (!modal) return;

        modal.hidden = false;
        document.body.classList.add('modal-open');

        const field = modal.querySelector(
            'input, textarea, select'
        );

        window.setTimeout(() => field?.focus(), 30);
    }

    function closeModal(id) {
        const modal = document.getElementById(id);

        if (modal) {
            modal.hidden = true;
        }

        const hasOpenModal = [
            ...document.querySelectorAll('.modal-backdrop')
        ].some((item) => !item.hidden);

        if (!hasOpenModal) {
            document.body.classList.remove('modal-open');
        }
    }

    function showError(id, message) {
        const element = document.getElementById(id);

        element.textContent = message;
        element.hidden = !message;
    }

    // Ouvrir la fenêtre d'ajout d'une commande.
    $('#add-command-open').addEventListener('click', () => {
        if (!data.plugins.length) {
            alert(
                'Ajoute d’abord un plugin pour pouvoir lui associer une commande.'
            );
            return;
        }

        commandForm.reset();
        renderPlugins();
        showError('command-error', '');
        openModal('command-modal');
    });

    $('#empty-add-command').addEventListener('click', () => {
        $('#add-command-open').click();
    });

    // Ouvrir la fenêtre d'ajout d'un plugin.
    $('#add-plugin-open').addEventListener('click', () => {
        pluginForm.reset();
        showError('plugin-error', '');
        openModal('plugin-modal');
    });

    // Gestion des clics : filtres, suppressions et fermeture des modales.
    document.addEventListener('click', (event) => {
        const target = event.target;

        if (!(target instanceof Element)) return;

        const closeButton = target.closest('[data-close-modal]');

        if (closeButton) {
            closeModal(closeButton.dataset.closeModal);
        }

        const pluginButton = target.closest('[data-plugin-id]');

        if (pluginButton) {
            selectedPluginId = pluginButton.dataset.pluginId;
            render();
        }

        const deleteButton = target.closest('[data-delete-command]');

        if (deleteButton) {
            const command = data.commands.find(
                (item) => item.id === deleteButton.dataset.deleteCommand
            );

            if (!command) return;

            if (!confirm(`Supprimer la commande ${command.name} ?`)) {
                return;
            }

            data.commands = data.commands.filter(
                (item) => item.id !== command.id
            );

            saveData();
            render();
        }

        if (target.classList.contains('modal-backdrop')) {
            closeModal(target.id);
        }

        
const deletePluginButton = event.target.closest('[data-delete-plugin]');

if (deletePluginButton) {
  const pluginId = deletePluginButton.dataset.deletePlugin;
  const plugin = getPlugin(pluginId);

  if (!plugin) return;

  const count = data.commands.filter(
    (command) => command.pluginId === pluginId
  ).length;

  openDeleteOverlay(
    'plugin',
    pluginId,
    plugin.name,
    `${count} commande${count > 1 ? 's' : ''} associée${count > 1 ? 's' : ''}`
  );

  return;
}

    });

    // Fermer les fenêtres avec Échap.
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            document
                .querySelectorAll('.modal-backdrop:not([hidden])')
                .forEach((modal) => closeModal(modal.id));
        }
    });

    // Recherche instantanée.
    searchInput.addEventListener('input', renderCommands);

    // Ajouter une commande.
    commandForm.addEventListener('submit', (event) => {
        event.preventDefault();

        const form = new FormData(commandForm);

        const name = String(form.get('name') || '').trim();
        const usage = String(form.get('usage') || '').trim();
        const description = String(
            form.get('description') || ''
        ).trim();

        const pluginId = String(form.get('pluginId') || '');

        if (
            !name ||
            !usage ||
            !description ||
            !getPlugin(pluginId)
        ) {
            showError(
                'command-error',
                'Complète tous les champs et sélectionne un plugin valide.'
            );
            return;
        }

        const duplicate = data.commands.some((command) =>
            command.name.toLocaleLowerCase('fr') ===
            name.toLocaleLowerCase('fr') &&
            command.pluginId === pluginId
        );

        if (duplicate) {
            showError(
                'command-error',
                'Cette commande existe déjà pour ce plugin.'
            );
            return;
        }

        data.commands.unshift({
            id: `command-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            name,
            usage,
            description,
            pluginId
        });

        selectedPluginId = pluginId;
        saveData();

        closeModal('command-modal');
        searchInput.value = '';

        render();
    });

    // Ajouter un plugin.
    pluginForm.addEventListener('submit', (event) => {
        event.preventDefault();

        const name = String(
            new FormData(pluginForm).get('name') || ''
        ).trim();

        if (!name) {
            showError(
                'plugin-error',
                'Le nom du plugin est obligatoire.'
            );
            return;
        }

        const duplicate = data.plugins.some((plugin) =>
            plugin.name.toLocaleLowerCase('fr') ===
            name.toLocaleLowerCase('fr')
        );

        if (duplicate) {
            showError(
                'plugin-error',
                'Ce plugin existe déjà.'
            );
            return;
        }

        const id = `plugin-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

        data.plugins.push({ id, name });
        selectedPluginId = id;

        saveData();
        closeModal('plugin-modal');


        render();
    });
    // Premier affichage.
    render();


})();
