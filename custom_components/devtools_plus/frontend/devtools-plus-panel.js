class DevToolsPlusPanel extends HTMLElement {
  connectedCallback() {
    this.render();
  }

  render() {
    this.innerHTML = `
      <style>
        .wrap { padding: 24px; font-family: var(--primary-font-family); }
        .card { background: var(--card-background-color); border-radius: 12px; padding: 20px; box-shadow: var(--ha-card-box-shadow, none); }
        h1 { margin-top: 0; }
        p { line-height: 1.5; }
        .row { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 16px; }
        button {
          border: none; border-radius: 10px; padding: 10px 14px; cursor: pointer;
          background: var(--primary-color); color: var(--text-primary-color, #fff);
          font-weight: 600;
        }
        button.secondary { background: var(--divider-color); color: var(--primary-text-color); }
      </style>
      <div class="wrap">
        <div class="card">
          <h1>DevTools+</h1>
          <p>Erweiterte Startseite für Template-Debugging. Von hier aus kannst du direkt in den nativen Template-Editor springen oder alle DevTools+ Templates ausführen.</p>
          <div class="row">
            <button id="open-template">Template Devtool öffnen</button>
            <button id="open-services" class="secondary">Aktionen öffnen</button>
            <button id="run-all" class="secondary">Alle DevTools+ Templates ausführen</button>
          </div>
        </div>
      </div>
    `;

    this.querySelector('#open-template')?.addEventListener('click', () => {
      window.history.pushState(null, '', '/developer-tools/template');
      window.dispatchEvent(new Event('location-changed'));
    });

    this.querySelector('#open-services')?.addEventListener('click', () => {
      window.history.pushState(null, '', '/developer-tools/action');
      window.dispatchEvent(new Event('location-changed'));
    });

    this.querySelector('#run-all')?.addEventListener('click', async () => {
      const root = document.querySelector('home-assistant');
      const hass = root && root.hass;
      if (!hass) return;
      await hass.callService('devtools_plus', 'run_all', {});
    });
  }
}

customElements.define('devtools-plus-panel', DevToolsPlusPanel);
