# 🚀 DevTools Plus - Nächste Schritte

Das Projekt ist fertig gebaut! Hier sind deine nächsten Schritte:

## ✅ Was bereits erledigt ist:

- ✅ Komplette HACS Integration erstellt
- ✅ 5 vordefinierte Templates eingebaut
- ✅ Config Flow + Options Flow implementiert
- ✅ Services (run_template, run_all) 
- ✅ README, CHANGELOG, CONTRIBUTING geschrieben
- ✅ Git Repository initialisiert
- ✅ Erster Commit erstellt

---

## 📦 Schritt 1: Zu GitHub pushen

Das Git Repo liegt in `/home/claude/devtools-plus/`. Du musst es jetzt zu GitHub pushen:

```bash
# Im Windows Terminal oder deinem bevorzugten Tool:
cd /pfad/zu/devtools-plus

# Remote hinzufügen (wenn noch nicht geschehen)
git remote add origin https://github.com/Levtos/devtools-plus.git

# Pushen
git push -u origin main

# Bei Auth-Problemen:
git push -u origin main --force
```

**Alternative:** Lade den `/mnt/user-data/outputs/devtools-plus/` Ordner herunter und pushe von deinem lokalen Rechner.

---

## 🏠 Schritt 2: In Home Assistant testen

### Installation

1. **Kopiere den Ordner zu HAOS:**
   ```bash
   # Von deinem lokalen Rechner aus:
   scp -r custom_components/devtools_plus root@haos_ip:/config/custom_components/
   ```

   **Oder** via SSH auf HAOS:
   ```bash
   cd /config/custom_components
   git clone https://github.com/Levtos/devtools-plus.git temp
   mv temp/custom_components/devtools_plus ./
   rm -rf temp
   ```

2. **Home Assistant neu starten**

3. **Integration hinzufügen:**
   - Einstellungen → Geräte & Dienste
   - "+ Integration hinzufügen"
   - Suche nach "DevTools Plus"

### Erstes Template testen

**Test 1: Predefined Template**
1. Wähle "Vordefiniertes Template verwenden"
2. Wähle "Low Batteries"
3. Template wird erstellt → `sensor.devtools_plus_low_batteries`

**Test 2: Template ausführen**
1. Gehe zu Entwicklerwerkzeuge → Dienste
2. Wähle `devtools_plus.run_template`
3. Entity: `sensor.devtools_plus_low_batteries`
4. Klicke "Dienst aufrufen"
5. Prüfe Sensor-State und Attribute

**Test 3: Custom Template für dein Climate Modul**
1. Füge neue Integration hinzu (DevTools Plus)
2. Wähle "Eigenes Template erstellen"
3. Name: `Climate Debug - 10_climate`
4. Icon: `mdi:air-conditioner`
5. Kategorie: `Climate`
6. Template:
   ```jinja
   {% set ns = namespace(climates=[]) %}
   {% for state in states.climate %}
     {% if state.entity_id.startswith('climate.') %}
       {% set ns.climates = ns.climates + [{
         'name': state.name,
         'current': state.attributes.current_temperature,
         'target': state.attributes.temperature,
         'mode': state.state
       }] %}
     {% endif %}
   {% endfor %}
   Climate Status ({{ ns.climates | length }} devices):
   {% for c in ns.climates %}
   {{ c.name }}: {{ c.current }}°C → {{ c.target }}°C ({{ c.mode }})
   {% endfor %}
   ```

---

## 🎨 Schritt 3: Dashboard Integration

**Entity Card Beispiel:**
```yaml
type: entity
entity: sensor.devtools_plus_low_batteries
name: Battery Check
icon: mdi:battery-alert
tap_action:
  action: call-service
  service: devtools_plus.run_template
  service_data:
    entity_id: sensor.devtools_plus_low_batteries
```

**Mushroom Chip Beispiel:**
```yaml
type: custom:mushroom-chips-card
chips:
  - type: template
    entity: sensor.devtools_plus_low_batteries
    icon: mdi:battery-alert
    icon_color: red
    tap_action:
      action: call-service
      service: devtools_plus.run_template
      service_data:
        entity_id: sensor.devtools_plus_low_batteries
    content: Battery Check
```

---

## 🐛 Schritt 4: Testen & Debuggen

**Wichtige Tests:**
- [ ] Config Flow funktioniert (predefined + custom)
- [ ] Options Flow funktioniert (Template editieren)
- [ ] Service `run_template` funktioniert
- [ ] Service `run_all` funktioniert
- [ ] Attributes werden korrekt gesetzt (last_run, execution_time, etc.)
- [ ] Error Handling bei ungültigem Template
- [ ] Deutsche + Englische UI
- [ ] Device wird in Geräte-Registry angezeigt
- [ ] Label & Area können zugewiesen werden

**Logs prüfen:**
```bash
# Auf HAOS via SSH:
tail -f /config/home-assistant.log | grep devtools_plus
```

**Bei Problemen:**
- Prüfe HA Version (mind. 2024.1.0)
- Prüfe Python Syntax Errors in den .py Files
- Prüfe ob alle Files vorhanden sind
- Prüfe manifest.json (valid JSON?)

---

## 🏷️ Schritt 5: GitHub Release erstellen

Wenn alles funktioniert:

1. **Tag erstellen:**
   ```bash
   git tag v0.1.0
   git push origin v0.1.0
   ```

2. **Release auf GitHub:**
   - https://github.com/Levtos/devtools-plus/releases
   - "Create a new release"
   - Tag: `v0.1.0`
   - Title: `DevTools Plus v0.1.0 - Initial Release`
   - Description: Kopiere aus CHANGELOG.md
   - Attach binaries: (optional) ZIP des `custom_components` Ordners

---

## 🎯 Schritt 6: HACS Submission (später)

**Erst nach ausgiebigem Testen!**

1. Stelle sicher:
   - [ ] Mindestens v0.1.0 Release existiert
   - [ ] README ist vollständig
   - [ ] hacs.json ist korrekt
   - [ ] manifest.json ist valid
   - [ ] Keine offenen kritischen Bugs

2. HACS PR öffnen:
   - https://github.com/hacs/default
   - Fork → Branch → Add zu `custom_components.json`
   - PR öffnen mit Beschreibung

3. Review abwarten (kann 1-2 Wochen dauern)

---

## 📝 Bonus: Atomic Sensors entfernen

Sobald DevTools Plus läuft, kannst du deine alten Atomic Sensors ersetzen:

**Vorher (93_atomics.yaml):**
```yaml
sensor:
  - platform: template
    sensors:
      battery_check:
        value_template: >
          {% for state in states.sensor %}
            ...läuft ständig...
```

**Nachher:**
DevTools Plus Template erstellen mit gleichem Code, nur on-demand ausführen via Automation:

```yaml
automation:
  - alias: "Daily Battery Check"
    trigger:
      - platform: time
        at: "08:00:00"
    action:
      - service: devtools_plus.run_template
        target:
          entity_id: sensor.devtools_plus_battery_check
```

**Overhead-Reduktion:** Von "ständig" auf "1x täglich" = 99.9% weniger Evaluierungen! 🚀

---

## ❓ Fragen / Probleme?

- Check HA Logs: `tail -f /config/home-assistant.log`
- Prüfe GitHub Issues: https://github.com/Levtos/devtools-plus/issues
- Code Review: Alle Files nochmal durchgehen
- HA Neustart nach Änderungen

---

**Viel Erfolg! 🎉**

Bei Fragen einfach melden. Nach erfolgreichem Test können wir noch Features wie Template History, Scheduled Runs oder Custom Cards hinzufügen!
