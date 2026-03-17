const STORAGE_KEY = 'devtools_plus.template_library.v1';

class DevToolsPlusPanel extends HTMLElement {
  constructor() {
    super();
    this._hass = null;
    this._selectedId = null;
    this._sortBy = 'name';
    this._localTemplates = [];
    this._filterCategory = 'all';
    this._status = '';
    this._previewResult = '';
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._initialized) {
      this._initialized = true;
      this._loadLocalTemplates();
      this.render();
      this._attachEvents();
    }
    this._refreshTemplateList();
  }

  connectedCallback() {
    if (!this._initialized) {
      this._initialized = true;
      this._loadLocalTemplates();
      this.render();
      this._attachEvents();
    }
  }

  _loadLocalTemplates() {
    try {
      this._localTemplates = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch (_err) {
      this._localTemplates = [];
    }
  }

  _saveLocalTemplates() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this._localTemplates));
  }

  _integrationTemplates() {
    if (!this._hass?.states) return [];

    return Object.entries(this._hass.states)
      .filter(([entityId]) => entityId.startsWith('sensor.devtools_plus_'))
      .map(([entityId, stateObj]) => ({
        id: `entity:${entityId}`,
        source: 'integration',
        name: stateObj.attributes.friendly_name || entityId,
        entity_id: entityId,
        category: stateObj.attributes.category || 'Uncategorized',
        template: stateObj.attributes.template || '',
        last_run: stateObj.attributes.last_run || '',
        state: stateObj.state,
      }));
  }

  _allTemplates() {
    const local = this._localTemplates.map((item) => ({
      ...item,
      id: `local:${item.id}`,
      source: 'local',
      entity_id: null,
      state: null,
      last_run: item.last_run || '',
    }));
    return [...this._integrationTemplates(), ...local];
  }

  _categories(items) {
    const set = new Set(items.map((item) => item.category || 'Uncategorized'));
    return ['all', ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }

  _refreshTemplateList() {
    const list = this.querySelector('#template-list');
    const categorySelect = this.querySelector('#category-filter');
    if (!list) return;

    let items = this._allTemplates();
    if (this._filterCategory !== 'all') {
      items = items.filter((item) => (item.category || 'Uncategorized') === this._filterCategory);
    }

    items.sort((a, b) => {
      if (this._sortBy === 'last_run') return (b.last_run || '').localeCompare(a.last_run || '');
      return (a.name || '').localeCompare(b.name || '');
    });

    if (categorySelect) {
      const categories = this._categories(this._allTemplates());
      categorySelect.innerHTML = categories
        .map((c) => `<option value="${c}" ${c === this._filterCategory ? 'selected' : ''}>${c === 'all' ? 'Alle Kategorien' : c}</option>`)
        .join('');
    }

    list.innerHTML = items.length
      ? items
          .map(
            (item) => `
              <button class="item ${this._selectedId === item.id ? 'selected' : ''}" data-id="${item.id}">
                <span class="title">${item.name}</span>
                <span class="meta">${item.category || 'Uncategorized'} • ${item.source}</span>
              </button>
            `,
          )
          .join('')
      : '<div class="empty">Keine Templates gefunden.</div>';

    list.querySelectorAll('.item').forEach((el) => {
      el.addEventListener('click', () => this._selectTemplate(el.dataset.id));
    });

    this._renderStatus();
  }

  _selectTemplate(id) {
    this._selectedId = id;
    const item = this._allTemplates().find((i) => i.id === id);
    if (!item) return;

    this.querySelector('#tpl-name').value = item.name || '';
    this.querySelector('#tpl-category').value = item.category || '';
    this.querySelector('#tpl-code').value = item.template || '';
    this.querySelector('#tpl-source').textContent = item.source === 'integration'
      ? `Quelle: Integration (${item.entity_id})`
      : 'Quelle: Lokale Bibliothek';

    this._refreshTemplateList();
  }

  _newTemplate() {
    this._selectedId = null;
    this.querySelector('#tpl-name').value = '';
    this.querySelector('#tpl-category').value = 'Custom';
    this.querySelector('#tpl-code').value = '';
    this.querySelector('#tpl-source').textContent = 'Quelle: Neu (lokal)';
    this._previewResult = '';
    this._status = 'Neues Template gestartet.';
    this._refreshTemplateList();
  }

  _selectedItem() {
    return this._allTemplates().find((i) => i.id === this._selectedId);
  }

  async _runSelected() {
    const item = this._selectedItem();
    if (!item) {
      this._status = 'Bitte zuerst ein Template aus der Liste auswählen.';
      this._refreshTemplateList();
      return;
    }

    if (item.source === 'integration' && item.entity_id) {
      await this._hass.callService('devtools_plus', 'run_template', { entity_id: item.entity_id });
      this._status = `Ausgeführt: ${item.name}`;
      this._refreshTemplateList();
      return;
    }

    await this._renderPreview();
  }

  async _renderPreview() {
    const code = this.querySelector('#tpl-code').value || '';
    if (!code.trim()) {
      this._status = 'Template-Code ist leer.';
      this._refreshTemplateList();
      return;
    }

    try {
      const result = await this._hass.callWS({
        type: 'render_template',
        template: code,
      });
      this._previewResult = String(result || '');
      this._status = 'Template lokal gerendert (Preview).';
    } catch (err) {
      this._previewResult = '';
      this._status = `Render-Fehler: ${err?.message || err}`;
    }

    this._renderStatus();
  }

  _saveLocal() {
    const name = this.querySelector('#tpl-name').value.trim();
    const category = this.querySelector('#tpl-category').value.trim() || 'Custom';
    const template = this.querySelector('#tpl-code').value;

    if (!name || !template.trim()) {
      this._status = 'Name und Template-Code sind Pflicht.';
      this._refreshTemplateList();
      return;
    }

    const selected = this._selectedItem();
    const now = new Date().toISOString();

    if (selected?.source === 'local') {
      const localId = selected.id.replace('local:', '');
      const idx = this._localTemplates.findIndex((t) => t.id === localId);
      if (idx >= 0) {
        this._localTemplates[idx] = {
          ...this._localTemplates[idx],
          name,
          category,
          template,
          updated_at: now,
        };
      }
      this._status = `Lokales Template aktualisiert: ${name}`;
    } else {
      const id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`;
      this._localTemplates.push({ id, name, category, template, created_at: now, updated_at: now });
      this._selectedId = `local:${id}`;
      this._status = `Lokales Template gespeichert: ${name}`;
    }

    this._saveLocalTemplates();
    this._refreshTemplateList();
  }

  _deleteLocal() {
    const selected = this._selectedItem();
    if (!selected || selected.source !== 'local') {
      this._status = 'Nur lokale Templates können hier gelöscht werden.';
      this._refreshTemplateList();
      return;
    }

    const localId = selected.id.replace('local:', '');
    this._localTemplates = this._localTemplates.filter((t) => t.id !== localId);
    this._saveLocalTemplates();
    this._newTemplate();
    this._status = 'Lokales Template gelöscht.';
    this._refreshTemplateList();
  }

  _renderStatus() {
    const statusEl = this.querySelector('#status');
    const resultEl = this.querySelector('#preview-result');
    if (statusEl) statusEl.textContent = this._status;
    if (resultEl) resultEl.textContent = this._previewResult;
  }

  _attachEvents() {
    this.querySelector('#btn-new')?.addEventListener('click', () => this._newTemplate());
    this.querySelector('#btn-save-local')?.addEventListener('click', () => this._saveLocal());
    this.querySelector('#btn-delete-local')?.addEventListener('click', () => this._deleteLocal());
    this.querySelector('#btn-run')?.addEventListener('click', async () => this._runSelected());
    this.querySelector('#btn-preview')?.addEventListener('click', async () => this._renderPreview());
    this.querySelector('#btn-open-template')?.addEventListener('click', () => {
      window.history.pushState(null, '', '/developer-tools/template');
      window.dispatchEvent(new Event('location-changed'));
    });

    this.querySelector('#sort-by')?.addEventListener('change', (ev) => {
      this._sortBy = ev.target.value;
      this._refreshTemplateList();
    });

    this.querySelector('#category-filter')?.addEventListener('change', (ev) => {
      this._filterCategory = ev.target.value;
      this._refreshTemplateList();
    });

    this._newTemplate();
    this._refreshTemplateList();
  }

  render() {
    this.innerHTML = `
      <style>
        .wrap { padding: 16px; font-family: var(--primary-font-family); }
        .layout { display: grid; grid-template-columns: 340px 1fr; gap: 16px; }
        .card { background: var(--card-background-color); border-radius: 12px; padding: 14px; box-shadow: var(--ha-card-box-shadow, none); }
        .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
        h2 { margin: 0; font-size: 1.2rem; }
        .filters { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 10px; }
        select, input, textarea {
          width: 100%; box-sizing: border-box; border-radius: 8px; padding: 8px;
          border: 1px solid var(--divider-color); background: var(--secondary-background-color); color: var(--primary-text-color);
        }
        textarea { min-height: 260px; font-family: monospace; }
        .list { display: flex; flex-direction: column; gap: 6px; max-height: 60vh; overflow: auto; }
        .item { border: 1px solid var(--divider-color); border-radius: 8px; padding: 10px; text-align: left; background: transparent; color: var(--primary-text-color); cursor: pointer; }
        .item.selected { border-color: var(--primary-color); background: color-mix(in srgb, var(--primary-color) 16%, transparent); }
        .title { display: block; font-weight: 600; }
        .meta { display: block; font-size: 0.8rem; opacity: 0.8; margin-top: 4px; }
        .actions { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 10px; }
        button { border: none; border-radius: 8px; padding: 9px 12px; cursor: pointer; font-weight: 600; }
        .primary { background: var(--primary-color); color: var(--text-primary-color, #fff); }
        .secondary { background: var(--divider-color); color: var(--primary-text-color); }
        .danger { background: #aa3a3a; color: #fff; }
        .status { margin-top: 10px; font-size: 0.9rem; opacity: 0.9; }
        .preview { margin-top: 10px; background: var(--secondary-background-color); border: 1px solid var(--divider-color); border-radius: 8px; padding: 10px; white-space: pre-wrap; min-height: 80px; }
        .empty { opacity: 0.75; padding: 10px; }
        @media (max-width: 1100px) { .layout { grid-template-columns: 1fr; } }
      </style>
      <div class="wrap">
        <div class="layout">
          <section class="card">
            <div class="header">
              <h2>Template-Bibliothek</h2>
              <button id="btn-new" class="secondary">Neu</button>
            </div>
            <div class="filters">
              <select id="category-filter"></select>
              <select id="sort-by">
                <option value="name">Sortierung: Name</option>
                <option value="last_run">Sortierung: Letzter Run</option>
              </select>
            </div>
            <div id="template-list" class="list"></div>
          </section>

          <section class="card">
            <div class="header">
              <h2>Editor & Ausführung</h2>
              <button id="btn-open-template" class="secondary">HA Template Devtool</button>
            </div>
            <div id="tpl-source" class="status">Quelle: Neu (lokal)</div>
            <div class="filters" style="grid-template-columns: 1fr 1fr; margin-top: 8px;">
              <input id="tpl-name" placeholder="Template Name" />
              <input id="tpl-category" placeholder="Kategorie (z. B. Monitoring)" />
            </div>
            <textarea id="tpl-code" placeholder="Jinja2 Template Code"></textarea>

            <div class="actions">
              <button id="btn-run" class="primary">Ausführen (ausgewählt)</button>
              <button id="btn-preview" class="secondary">Preview rendern</button>
              <button id="btn-save-local" class="secondary">Lokal speichern</button>
              <button id="btn-delete-local" class="danger">Lokal löschen</button>
            </div>

            <div id="status" class="status"></div>
            <div id="preview-result" class="preview"></div>
          </section>
        </div>
      </div>
    `;
  }
}

customElements.define('devtools-plus-panel', DevToolsPlusPanel);
