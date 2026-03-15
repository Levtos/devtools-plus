// DevTools Plus Panel
// Sidebar panel for Home Assistant – template editor + saved templates list

const DOMAIN = "devtools_plus";

class DevToolsPlusPanel extends HTMLElement {
  constructor() {
    super();
    this._hass = null;
    this._unsubRender = null;
    this._debounceTimer = null;
    this._registryEntities = null; // cached entity registry result
  }

  connectedCallback() {
    if (!this.shadowRoot) {
      this.attachShadow({ mode: "open" });
    }
  }

  set hass(hass) {
    const isFirst = !this._hass;
    this._hass = hass;
    if (isFirst) {
      this._buildUI();
      this._loadEntityRegistry().then(() => this._updateTemplateList());
    } else {
      this._updateTemplateList();
    }
  }

  get hass() {
    return this._hass;
  }

  // ── Entity registry ──────────────────────────────────────────────────────────

  async _loadEntityRegistry() {
    try {
      const entries = await this._hass.connection.sendMessagePromise({
        type: "config/entity_registry/list",
      });
      // Keep only entries that belong to devtools_plus
      this._registryEntities = new Set(
        entries
          .filter((e) => e.platform === DOMAIN)
          .map((e) => e.entity_id)
      );
    } catch (_) {
      this._registryEntities = null; // fall back to attribute-based detection
    }
  }

  _getDevtoolsEntities() {
    const states = this._hass.states;
    return Object.values(states)
      .filter((s) => {
        if (this._registryEntities) {
          return this._registryEntities.has(s.entity_id);
        }
        // Fallback: both "template" and "category" attributes are set by this integration
        return (
          s.attributes.template !== undefined &&
          s.attributes.category !== undefined
        );
      })
      .sort((a, b) =>
        (a.attributes.friendly_name || a.entity_id).localeCompare(
          b.attributes.friendly_name || b.entity_id
        )
      );
  }

  // ── UI build ─────────────────────────────────────────────────────────────────

  _buildUI() {
    const root = this.shadowRoot;
    root.innerHTML = `
      <style>
        *, *::before, *::after { box-sizing: border-box; }
        :host {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: var(--primary-background-color);
          color: var(--primary-text-color);
          font-family: var(--paper-font-body1_-_font-family, Roboto, sans-serif);
        }

        /* ── Toolbar ── */
        .toolbar {
          background: var(--app-header-background-color, var(--primary-color));
          color: var(--app-header-text-color, #fff);
          padding: 0 16px;
          height: 56px;
          display: flex;
          align-items: center;
          gap: 12px;
          flex-shrink: 0;
          box-shadow: 0 2px 4px rgba(0,0,0,.24);
          z-index: 10;
        }
        .toolbar ha-icon { --mdc-icon-size: 22px; }
        .toolbar-title { font-size: 20px; font-weight: 400; }

        /* ── Layout ── */
        .layout {
          display: flex;
          flex: 1;
          overflow: hidden;
        }

        /* ── Sidebar ── */
        .sidebar {
          width: 260px;
          min-width: 260px;
          display: flex;
          flex-direction: column;
          border-right: 1px solid var(--divider-color, rgba(0,0,0,.12));
          background: var(--card-background-color, var(--primary-background-color));
          overflow: hidden;
        }
        .sidebar-header {
          padding: 12px 16px 10px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: .08em;
          color: var(--secondary-text-color);
          border-bottom: 1px solid var(--divider-color, rgba(0,0,0,.12));
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-shrink: 0;
        }
        .template-list { overflow-y: auto; flex: 1; padding: 4px 0; }
        .template-item {
          padding: 9px 12px 9px 14px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 10px;
          border-left: 3px solid transparent;
          transition: background .12s;
          position: relative;
        }
        .template-item:hover { background: var(--secondary-background-color, rgba(0,0,0,.04)); }
        .template-item.active {
          background: var(--secondary-background-color, rgba(0,0,0,.06));
          border-left-color: var(--primary-color);
        }
        .item-icon {
          color: var(--secondary-text-color);
          --mdc-icon-size: 20px;
          flex-shrink: 0;
        }
        .item-info { flex: 1; min-width: 0; }
        .item-name {
          font-size: 14px;
          font-weight: 500;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .item-meta {
          font-size: 11px;
          color: var(--secondary-text-color);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-top: 1px;
        }
        .item-run {
          background: none;
          border: none;
          cursor: pointer;
          color: var(--primary-color);
          padding: 4px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          opacity: 0;
          transition: opacity .15s;
          --mdc-icon-size: 18px;
          flex-shrink: 0;
        }
        .template-item:hover .item-run { opacity: 1; }
        .item-run:hover { background: rgba(var(--rgb-primary-color, 3,169,244),.12); }

        .sidebar-footer {
          border-top: 1px solid var(--divider-color, rgba(0,0,0,.12));
          padding: 10px 12px;
          flex-shrink: 0;
        }
        .run-all-btn {
          width: 100%;
          background: var(--primary-color);
          color: #fff;
          border: none;
          border-radius: 4px;
          padding: 8px 14px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          transition: filter .15s;
        }
        .run-all-btn:hover { filter: brightness(1.12); }
        .run-all-btn ha-icon { --mdc-icon-size: 18px; }

        /* ── Editor area ── */
        .editor-area { flex: 1; display: flex; flex-direction: column; overflow: hidden; }

        .editor-split {
          flex: 1;
          display: flex;
          overflow: hidden;
        }
        /* Stack vertically on narrow viewports */
        @media (max-width: 860px) {
          .editor-split { flex-direction: column; }
          .editor-pane { border-right: none; border-bottom: 1px solid var(--divider-color, rgba(0,0,0,.12)); }
        }

        .editor-pane, .result-pane {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-width: 0;
          min-height: 0;
          overflow: hidden;
        }
        .editor-pane { border-right: 1px solid var(--divider-color, rgba(0,0,0,.12)); }

        .pane-header {
          padding: 10px 14px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: .08em;
          color: var(--secondary-text-color);
          border-bottom: 1px solid var(--divider-color, rgba(0,0,0,.12));
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          background: var(--card-background-color, var(--primary-background-color));
          flex-shrink: 0;
        }
        .pane-actions { display: flex; gap: 6px; align-items: center; }

        .btn {
          border: none;
          border-radius: 4px;
          padding: 5px 12px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 5px;
          transition: filter .15s;
        }
        .btn-primary { background: var(--primary-color); color: #fff; }
        .btn-primary:hover { filter: brightness(1.1); }
        .btn-secondary {
          background: none;
          color: var(--secondary-text-color);
          border: 1px solid var(--divider-color, rgba(0,0,0,.2));
        }
        .btn-secondary:hover { background: var(--secondary-background-color, rgba(0,0,0,.04)); }
        .btn ha-icon { --mdc-icon-size: 15px; }

        .live-label {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 11px;
          color: var(--secondary-text-color);
          cursor: pointer;
          user-select: none;
          text-transform: none;
          letter-spacing: normal;
          font-weight: 400;
        }
        .live-label input[type=checkbox] {
          accent-color: var(--primary-color);
          cursor: pointer;
          width: 13px; height: 13px;
        }

        /* ── Code textarea ── */
        .code-wrap { flex: 1; overflow: hidden; position: relative; }
        textarea#tpl-editor {
          width: 100%; height: 100%;
          padding: 14px 16px;
          font-family: "Roboto Mono", "Courier New", monospace;
          font-size: 13px;
          line-height: 1.65;
          background: var(--code-editor-background-color, #1e1e2e);
          color: var(--primary-text-color);
          border: none;
          resize: none;
          outline: none;
          tab-size: 2;
        }

        /* ── Result pane ── */
        .status-dot {
          width: 8px; height: 8px;
          border-radius: 50%;
          background: var(--disabled-text-color, #bdbdbd);
          display: inline-block;
          transition: background .2s;
          flex-shrink: 0;
        }
        .status-dot.ok  { background: var(--success-color, #4caf50); }
        .status-dot.err { background: var(--error-color, #f44336); }
        .status-dot.spin {
          background: var(--warning-color, #ff9800);
          animation: blink 1s ease-in-out infinite;
        }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:.25} }

        #result-output {
          flex: 1;
          overflow-y: auto;
          padding: 14px 16px;
          font-family: "Roboto Mono", "Courier New", monospace;
          font-size: 13px;
          line-height: 1.65;
          white-space: pre-wrap;
          word-break: break-word;
        }
        #result-output.empty {
          color: var(--secondary-text-color);
          font-style: italic;
          font-family: var(--paper-font-body1_-_font-family, Roboto, sans-serif);
          font-size: 14px;
        }
        #result-output.error { color: var(--error-color, #f44336); }

        /* ── Empty state ── */
        .empty-state {
          padding: 24px 16px;
          text-align: center;
          color: var(--secondary-text-color);
          font-size: 13px;
          line-height: 1.6;
        }
        .empty-state ha-icon {
          --mdc-icon-size: 40px;
          display: block;
          margin: 0 auto 8px;
          opacity: .35;
        }

        /* ── Toast ── */
        .toast {
          position: fixed;
          bottom: 20px; right: 20px;
          padding: 10px 18px;
          border-radius: 4px;
          font-size: 13px;
          font-weight: 500;
          color: #fff;
          box-shadow: 0 4px 12px rgba(0,0,0,.3);
          z-index: 9999;
          opacity: 0;
          transform: translateY(8px);
          transition: opacity .25s, transform .25s;
          pointer-events: none;
        }
        .toast.show { opacity: 1; transform: translateY(0); }
      </style>

      <div class="toolbar">
        <ha-icon icon="mdi:tools"></ha-icon>
        <span class="toolbar-title">DevTools Plus</span>
      </div>

      <div class="layout">
        <!-- Saved templates sidebar -->
        <div class="sidebar">
          <div class="sidebar-header">
            <span>Templates</span>
            <span id="tpl-count" style="font-weight:400;font-size:10px;"></span>
          </div>
          <div class="template-list" id="tpl-list">
            <div class="empty-state">
              <ha-icon icon="mdi:text-box-outline"></ha-icon>
              Loading…
            </div>
          </div>
          <div class="sidebar-footer">
            <button class="run-all-btn" id="run-all-btn">
              <ha-icon icon="mdi:play-circle-outline"></ha-icon>
              Run All
            </button>
          </div>
        </div>

        <!-- Editor + result split -->
        <div class="editor-area">
          <div class="editor-split">
            <!-- Template editor -->
            <div class="editor-pane">
              <div class="pane-header">
                <span>Template</span>
                <div class="pane-actions">
                  <label class="live-label">
                    <input type="checkbox" id="live-cb" checked>
                    Live
                  </label>
                  <button class="btn btn-secondary" id="clear-btn">Clear</button>
                  <button class="btn btn-primary" id="render-btn">
                    <ha-icon icon="mdi:play"></ha-icon>Render
                  </button>
                </div>
              </div>
              <div class="code-wrap">
                <textarea
                  id="tpl-editor"
                  spellcheck="false"
                  autocorrect="off"
                  autocapitalize="off"
                  placeholder="Enter a Jinja2 template, e.g.:

{{ states('sensor.temperature') | float | round(1) }} °C

{% set lights = states.light
   | selectattr('state','eq','on') | list %}
{{ lights | count }} light(s) on"
                ></textarea>
              </div>
            </div>

            <!-- Result -->
            <div class="result-pane">
              <div class="pane-header">
                <span>Result</span>
                <div class="pane-actions">
                  <span class="status-dot" id="status-dot"></span>
                  <span id="status-txt" style="font-size:10px;letter-spacing:normal;text-transform:none;font-weight:400;"></span>
                </div>
              </div>
              <div id="result-output" class="empty">
                Enter a template on the left to see the rendered result here.
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="toast" id="toast"></div>
    `;

    this._bindEvents();
  }

  // ── Event binding ─────────────────────────────────────────────────────────────

  _bindEvents() {
    const $ = (id) => this.shadowRoot.getElementById(id);

    const editor   = $("tpl-editor");
    const liveCb   = $("live-cb");
    const renderBtn = $("render-btn");
    const clearBtn  = $("clear-btn");
    const runAllBtn = $("run-all-btn");

    renderBtn.addEventListener("click", () => this._doRender());

    clearBtn.addEventListener("click", () => {
      editor.value = "";
      this._clearResult();
      this._stopSub();
      this.shadowRoot.querySelectorAll(".template-item").forEach((el) =>
        el.classList.remove("active")
      );
    });

    editor.addEventListener("input", () => {
      if (liveCb.checked) {
        clearTimeout(this._debounceTimer);
        this._debounceTimer = setTimeout(() => this._doRender(), 400);
      }
    });

    // Tab key → insert spaces
    editor.addEventListener("keydown", (e) => {
      if (e.key === "Tab") {
        e.preventDefault();
        const s = editor.selectionStart;
        editor.value =
          editor.value.slice(0, s) + "  " + editor.value.slice(editor.selectionEnd);
        editor.selectionStart = editor.selectionEnd = s + 2;
        if (liveCb.checked) {
          clearTimeout(this._debounceTimer);
          this._debounceTimer = setTimeout(() => this._doRender(), 400);
        }
      }
    });

    liveCb.addEventListener("change", (e) => {
      if (e.target.checked && editor.value.trim()) this._doRender();
      else if (!e.target.checked) this._stopSub();
    });

    runAllBtn.addEventListener("click", () => this._runAll());
  }

  // ── Template list ─────────────────────────────────────────────────────────────

  _updateTemplateList() {
    const list    = this.shadowRoot.getElementById("tpl-list");
    const countEl = this.shadowRoot.getElementById("tpl-count");
    if (!list) return;

    const entities = this._getDevtoolsEntities();
    countEl.textContent = entities.length ? `(${entities.length})` : "";

    if (entities.length === 0) {
      list.innerHTML = `
        <div class="empty-state">
          <ha-icon icon="mdi:text-box-plus-outline"></ha-icon>
          No templates yet.<br>
          Go to <em>Settings → Integrations → DevTools Plus → Add device</em> to create one.
        </div>`;
      return;
    }

    list.innerHTML = entities
      .map((s) => {
        const eid      = s.entity_id;
        const name     = s.attributes.friendly_name || eid;
        const icon     = s.attributes.icon || "mdi:code-braces";
        const category = s.attributes.category || "";
        const lastRun  = s.attributes.last_run;
        const errored  = !!s.attributes.error;
        const meta     = lastRun
          ? "Last run: " + new Date(lastRun).toLocaleTimeString()
          : category || "Not run yet";
        return `
          <div class="template-item" data-eid="${eid}">
            <ha-icon class="item-icon" icon="${icon}" style="${errored ? "color:var(--error-color,#f44336)" : ""}"></ha-icon>
            <div class="item-info">
              <div class="item-name">${this._esc(name)}</div>
              <div class="item-meta">${this._esc(meta)}</div>
            </div>
            <button class="item-run" data-eid="${eid}" title="Run">
              <ha-icon icon="mdi:play"></ha-icon>
            </button>
          </div>`;
      })
      .join("");

    // Click on item → load template into editor
    list.querySelectorAll(".template-item").forEach((el) => {
      el.addEventListener("click", (e) => {
        if (!e.target.closest(".item-run")) this._loadIntoEditor(el.dataset.eid);
      });
    });

    // Click run button → call service
    list.querySelectorAll(".item-run").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        this._runSingle(btn.dataset.eid);
      });
    });
  }

  _loadIntoEditor(entityId) {
    const state = this._hass.states[entityId];
    if (!state) return;
    const code = state.attributes.template || "";
    const editor = this.shadowRoot.getElementById("tpl-editor");
    editor.value = code;

    // Highlight active item
    this.shadowRoot.querySelectorAll(".template-item").forEach((el) =>
      el.classList.toggle("active", el.dataset.eid === entityId)
    );

    // Render immediately
    this._doRender();
  }

  // ── Template rendering ────────────────────────────────────────────────────────

  async _doRender() {
    const editor    = this.shadowRoot.getElementById("tpl-editor");
    const output    = this.shadowRoot.getElementById("result-output");
    const dot       = this.shadowRoot.getElementById("status-dot");
    const statusTxt = this.shadowRoot.getElementById("status-txt");
    const template  = editor.value.trim();

    if (!template) { this._clearResult(); return; }

    dot.className   = "status-dot spin";
    statusTxt.textContent = "";

    this._stopSub();

    try {
      this._unsubRender = await this._hass.connection.subscribeMessage(
        (msg) => {
          if (msg.result !== undefined) {
            output.textContent  = String(msg.result);
            output.className    = "";
            dot.className       = "status-dot ok";
            statusTxt.textContent = "";
          }
          if (msg.error) {
            output.textContent  = msg.error.message || JSON.stringify(msg.error);
            output.className    = "error";
            dot.className       = "status-dot err";
            statusTxt.textContent = "Error";
          }
        },
        { type: "render_template", template }
      );
    } catch (err) {
      output.textContent  = err.message || String(err);
      output.className    = "error";
      dot.className       = "status-dot err";
      statusTxt.textContent = "Error";
    }
  }

  _stopSub() {
    if (this._unsubRender) {
      try { this._unsubRender(); } catch (_) {}
      this._unsubRender = null;
    }
  }

  _clearResult() {
    const output = this.shadowRoot.getElementById("result-output");
    if (output) {
      output.textContent = "Enter a template on the left to see the rendered result here.";
      output.className   = "empty";
    }
    const dot = this.shadowRoot.getElementById("status-dot");
    const txt = this.shadowRoot.getElementById("status-txt");
    if (dot) dot.className = "status-dot";
    if (txt) txt.textContent = "";
  }

  // ── Service calls ─────────────────────────────────────────────────────────────

  async _runSingle(entityId) {
    try {
      await this._hass.callService(DOMAIN, "run_template", { entity_id: entityId });
      this._toast("Template executed ✓");
      // Refresh list after a short delay so last_run updates
      setTimeout(() => this._updateTemplateList(), 1200);
    } catch (err) {
      this._toast("Error: " + (err.message || err), true);
    }
  }

  async _runAll() {
    try {
      await this._hass.callService(DOMAIN, "run_all", {});
      this._toast("All templates executed ✓");
      setTimeout(() => this._updateTemplateList(), 1200);
    } catch (err) {
      this._toast("Error: " + (err.message || err), true);
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────

  _toast(msg, isError = false) {
    const el = this.shadowRoot.getElementById("toast");
    el.textContent = msg;
    el.style.background = isError
      ? "var(--error-color, #f44336)"
      : "var(--primary-color)";
    el.classList.add("show");
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => el.classList.remove("show"), 3000);
  }

  _esc(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  disconnectedCallback() {
    this._stopSub();
    clearTimeout(this._debounceTimer);
    clearTimeout(this._toastTimer);
  }
}

customElements.define("devtools-plus-panel", DevToolsPlusPanel);
