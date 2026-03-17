# DevTools Plus

[![hacs_badge](https://img.shields.io/badge/HACS-Custom-orange.svg)](https://github.com/custom-components/hacs)
[![GitHub release](https://img.shields.io/github/release/Levtos/devtools-plus.svg)](https://github.com/Levtos/devtools-plus/releases)
[![License](https://img.shields.io/github/license/Levtos/devtools-plus.svg)](LICENSE)

**On-Demand Template Debugging for Home Assistant**

DevTools Plus is a HACS integration that lets you create reusable template sensors which execute **only when you trigger them** - eliminating the overhead of constantly-polling atomic sensor groups while providing a powerful debugging tool for complex Home Assistant setups.

## 🎯 Problem & Solution

### The Problem
- Atomic sensor groups (`93_atomics`, `94_combined`) cause heavy overhead during HAOS startup
- HA logs fill with "too many template evaluations" warnings
- Debugging templates requires temporary helper entities or constant YAML reloads
- Template snippets scattered across Notepad files with no organization

### The Solution
DevTools Plus creates **virtual template devices** that:
- ✅ Run **only on-demand** (via service call or dashboard button)
- ✅ Store reusable debug templates in a central location
- ✅ Track execution time and errors
- ✅ Support full Jinja2 syntax with HA template functions
- ✅ Organize templates by categories/labels
- ✅ Work with Areas, Labels, and standard HA device features

## 🚀 Features

### Core Features
- **On-Demand Execution** - Zero overhead until you trigger a template
- **Predefined Templates** - 5 ready-to-use debugging templates included
- **Custom Templates** - Create unlimited Jinja2 templates via GUI
- **Performance Tracking** - Execution time displayed in milliseconds
- **Error Handling** - Clear error messages in sensor attributes
- **Categories & Tags** - Organize templates by purpose (Batteries, Climate, Network, etc.)
- **Dashboard Integration** - Trigger templates from Lovelace cards
- **Edit Anytime** - Modify templates via HA Options Flow (no YAML editing)
- **Template Bookmark UI** - Sidebar panel for speichern/kategorisieren und 1-Klick Übergabe an Devtools

### What You Get
Each template becomes:
- A **Device** in your device registry
- A **Sensor Entity** showing the last execution result
- **Attributes** with execution time, error status, template code
- **Service Calls** to trigger execution
- Full support for **Labels**, **Areas**, and **Entity Customization**

## 📦 Installation

### HACS (Recommended)

1. Open HACS in Home Assistant
2. Click "Integrations"
3. Click the three dots in the top right → "Custom repositories"
4. Add this repository: `https://github.com/Levtos/devtools-plus`
5. Category: "Integration"
6. Click "Add"
7. Search for "DevTools Plus" and install
8. Restart Home Assistant

### Manual Installation

1. Download the latest release
2. Copy `custom_components/devtools_plus` to your `config/custom_components/` directory
3. Restart Home Assistant

## ⚙️ Configuration

### Adding Your First Template

1. Go to **Settings → Devices & Services**
2. Click **"+ Add Integration"**
3. Search for **"DevTools Plus"**
4. Choose:
   - **Use predefined template**: Select from 5 ready-made templates
   - **Create custom template**: Build your own Jinja2 template

### Predefined Templates

#### 1. Low Batteries
Shows all battery sensors below 20%
```jinja
Icon: mdi:battery-alert
Category: Batteries
```

#### 2. Unavailable Entities
Lists all entities in `unavailable` or `unknown` state
```jinja
Icon: mdi:alert-circle
Category: Debugging
```

#### 3. Lights Currently On
Overview of all active lights with brightness
```jinja
Icon: mdi:lightbulb-on
Category: Lighting
```

#### 4. Climate Setpoints
Current vs. target temperatures for all thermostats
```jinja
Icon: mdi:thermostat
Category: Climate
```

#### 5. Zigbee Signal Strength
LQI and RSSI values for all Zigbee devices
```jinja
Icon: mdi:zigbee
Category: Network
```

### Creating Custom Templates

**Example: Debug Climate Module**
```yaml
Name: Climate Debug - 10_climate
Icon: mdi:air-conditioner
Category: Climate
Description: Debug logic for climate module
Template: |
  {% set ns = namespace(climates=[]) %}
  {% for state in states.climate %}
    {% if 'wohnzimmer' in state.entity_id or 'schlafzimmer' in state.entity_id %}
      {% set ns.climates = ns.climates + [{
        'name': state.name,
        'current': state.attributes.current_temperature,
        'target': state.attributes.temperature,
        'mode': state.state,
        'preset': state.attributes.preset_mode
      }] %}
    {% endif %}
  {% endfor %}
  
  Climate Module Status ({{ ns.climates | length }} devices):
  {% for c in ns.climates %}
  {{ c.name }}:
    Current: {{ c.current }}°C
    Target: {{ c.target }}°C
    Mode: {{ c.mode }}
    Preset: {{ c.preset }}
  {% endfor %}
```

### Editing Templates

1. Go to **Settings → Devices & Services → DevTools Plus**
2. Click on your template device
3. Click the **⚙️ (gear icon)** → **Configure**
4. Edit any field (name, icon, category, template code)
5. Click **Submit**


### Sidebar Access (DevTools+ Panel)

After installing the integration, DevTools Plus registers a **DevTools+** item in the Home Assistant sidebar.

- It shows a dedicated **DevTools+ library UI** (kein iframe recursion / keine nested sidebars).
- Du kannst Templates in einer Bibliothek **speichern, kategorisieren, sortieren und auswählen**.
- Optionaler **Debug-Modus** im Panel protokolliert alle Aktionen (Preview/Run/Filter/Save) und erlaubt Copy/Paste des Logs für Support.
- Integration-Templates (`sensor.devtools_plus_*`) und lokale Bibliothekseinträge werden gemeinsam angezeigt.
- Fokus-Flow: Auswahl aus Sammlung → **In Devtools öffnen** (Template wird per URL + Clipboard-Fallback übergeben).
- Direkte Injection in Home Assistant's Core-Devtools-Tabs ist ohne Frontend-Patch nicht stabil unterstützt.


### Planned: Status-Entity Mode (Design Note)

Als nächster Ausbauschritt kann jedes Bookmark-Template optional eine Status-Entity erhalten, z. B.:
- Gesamtstatus (`valid`, `unknown`, `unavailable`, `missing`)
- Zählwerte pro Statusklasse
- Letzter Prüfzeitpunkt und Vollausgabe in Attributen

Hinweis: Für dieses Feature braucht es ein Trigger-Konzept (on-demand, Intervall oder eventbasiert), um unnötigen Runtime-Overhead zu vermeiden.

## 🎮 Usage

### Triggering Templates

#### Option 1: Service Call
```yaml
service: devtools_plus.run_template
target:
  entity_id: sensor.devtools_plus_battery_status
```

#### Option 2: Run All Templates
```yaml
service: devtools_plus.run_all
data:
  category: "Batteries"  # Optional filter
```

#### Option 3: Dashboard Button (Entity Card)
```yaml
type: entity
entity: sensor.devtools_plus_battery_status
name: Battery Debug
icon: mdi:battery-alert
tap_action:
  action: call-service
  service: devtools_plus.run_template
  service_data:
    entity_id: sensor.devtools_plus_battery_status
```

#### Option 4: Mushroom Template Card
```yaml
type: custom:mushroom-template-card
primary: Battery Status
secondary: "Last run: {{ relative_time(states.sensor.devtools_plus_battery_status.last_changed) }}"
icon: mdi:battery-alert
badge_icon: mdi:play-circle
badge_color: green
tap_action:
  action: call-service
  service: devtools_plus.run_template
  service_data:
    entity_id: sensor.devtools_plus_battery_status
```

#### Option 5: Automation
```yaml
automation:
  - alias: "Run Battery Check Daily"
    trigger:
      - platform: time
        at: "08:00:00"
    action:
      - service: devtools_plus.run_template
        target:
          entity_id: sensor.devtools_plus_battery_status
      - service: notify.mobile_app
        data:
          message: "Battery Status: {{ states('sensor.devtools_plus_battery_status') }}"
```

### Reading Results

**Sensor State:**
```yaml
{{ states('sensor.devtools_plus_battery_status') }}
# Output: Multi-line template result (truncated to 255 chars)
```

**Attributes:**
```yaml
{{ state_attr('sensor.devtools_plus_battery_status', 'template') }}
# The actual template code

{{ state_attr('sensor.devtools_plus_battery_status', 'last_run') }}
# ISO timestamp of last execution

{{ state_attr('sensor.devtools_plus_battery_status', 'execution_time') }}
# e.g., "42.5ms"

{{ state_attr('sensor.devtools_plus_battery_status', 'error') }}
# Error message if template failed, otherwise null

{{ state_attr('sensor.devtools_plus_battery_status', 'category') }}
# e.g., "Batteries"

{{ state_attr('sensor.devtools_plus_battery_status', 'line_count') }}
# Number of lines in output
```

## 🏗️ Use Cases

### 1. Replace Atomic Sensor Groups
**Before:**
```yaml
# 93_atomics.yaml - runs constantly, heavy overhead
sensor:
  - platform: template
    sensors:
      all_batteries_low:
        value_template: >
          {% set ns = namespace(low=[]) %}
          ...this runs every state change...
```

**After:**
Create a DevTools Plus template, run it once a day via automation. **Zero overhead** between runs!

### 2. Debug Complex Package Logic
Store debug templates for each of your `/packages/` modules:
- `10_climate` debug
- `20_lighting` debug
- `30_security` debug

Trigger them when you need to inspect state, no permanent entities required.

### 3. Uptime Kuma / External Monitoring
Export sensor states to Uptime Kuma, Grafana, or other monitoring tools:
```yaml
# They see sensor state + execution_time attribute
# Track template performance over time
```

### 4. Quick Jinja2 Testing
Test complex Jinja2 logic without:
- Creating temporary template sensors
- Reloading YAML
- Cluttering your configuration

Just edit the template via GUI and re-run!

## 🔧 Advanced

### Template Tips

**1. Use Namespaces for Complex Logic**
```jinja
{% set ns = namespace(items=[]) %}
{% for state in states.sensor %}
  {% set ns.items = ns.items + [state.entity_id] %}
{% endfor %}
```

**2. Output Formatting**
Use newlines for readability:
```jinja
Summary:
- Item 1: {{ value1 }}
- Item 2: {{ value2 }}
```

**3. Error Handling in Templates**
```jinja
{% set value = states('sensor.might_not_exist') | default('N/A') %}
```

**4. Performance Optimization**
Limit loops for faster execution:
```jinja
{% for state in states.sensor[:100] %}
  {# Process first 100 only #}
{% endfor %}
```

### Limits

- **State Length**: 255 characters (HA limitation)
- **Full Output**: Available in attributes (up to ~16KB)
- **Execution Timeout**: 10 seconds (configurable in future)
- **Template Code**: ~5-10K characters recommended

## 🐛 Troubleshooting

### Template Won't Execute
- Check HA logs for syntax errors
- Verify template syntax in Developer Tools → Template
- Ensure entity exists before running

### "Invalid Template" Error
- Missing closing tags (`{% endfor %}`, `{% endif %}`)
- Undefined variables or filters
- Trying to access non-existent attributes

### State Shows "Not executed yet"
- Template hasn't been triggered yet
- Call `devtools_plus.run_template` service
- Or restart HA (won't auto-run)

### Performance Issues
- Reduce loop iterations
- Avoid expensive operations (external API calls won't work anyway)
- Check `execution_time` attribute to identify slow templates

## 🗺️ Roadmap

### v0.2.0 (Planned)
- [ ] Template history (last 10 runs with diff view)
- [ ] Scheduled execution (cron-like)
- [ ] Notification on specific outputs
- [ ] Export/Import templates as YAML

### v0.3.0 (Future)
- [ ] Custom Lovelace card with syntax highlighting
- [ ] Template library (share via GitHub Gist)
- [ ] Performance profiling
- [ ] Multi-output templates

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Test your changes
4. Submit a pull request

## 📄 License

MIT License - see [LICENSE](LICENSE) file

## 👏 Credits

Created by [@Levtos](https://github.com/Levtos)

Inspired by the need to reduce overhead from atomic sensor groups while maintaining powerful debugging capabilities.

## 📞 Support

- 🐛 [Report Issues](https://github.com/Levtos/devtools-plus/issues)
- 💬 [Discussions](https://github.com/Levtos/devtools-plus/discussions)
- 📖 [Documentation](https://github.com/Levtos/devtools-plus/wiki) (coming soon)

---

⭐ **If DevTools Plus helps your setup, consider giving it a star!**
