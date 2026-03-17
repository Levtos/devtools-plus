"""Constants for DevTools Plus integration."""
from typing import Final

DOMAIN: Final = "devtools_plus"
CONF_TEMPLATE: Final = "template"
CONF_CATEGORY: Final = "category"
CONF_DESCRIPTION: Final = "description"

# Services
SERVICE_RUN_TEMPLATE: Final = "run_template"
SERVICE_RUN_ALL: Final = "run_all"

# Attributes
ATTR_TEMPLATE: Final = "template"
ATTR_LAST_RUN: Final = "last_run"
ATTR_EXECUTION_TIME: Final = "execution_time"
ATTR_ERROR: Final = "error"
ATTR_CATEGORY: Final = "category"
ATTR_LINE_COUNT: Final = "line_count"

# Storage
STORAGE_VERSION: Final = 1
STORAGE_KEY: Final = f"{DOMAIN}.storage"

# Defaults
DEFAULT_ICON: Final = "mdi:code-braces"
DEFAULT_CATEGORY: Final = "Debugging"
EXECUTION_TIMEOUT: Final = 10  # seconds

# Predefined templates
PREDEFINED_TEMPLATES: Final = [
    {
        "name": "Low Batteries",
        "icon": "mdi:battery-alert",
        "category": "Batteries",
        "description": "Shows all battery sensors below 20%",
        "template": """{% set ns = namespace(batteries=[]) %}
{% for state in states.sensor %}
  {% if 'battery' in state.entity_id.lower() and state.state not in ['unknown', 'unavailable'] %}
    {% set battery_level = state.state | int(101) %}
    {% if battery_level <= 20 %}
      {% set ns.batteries = ns.batteries + [(state.name, battery_level)] %}
    {% endif %}
  {% endif %}
{% endfor %}
{% if ns.batteries | length > 0 %}
{% for name, level in ns.batteries | sort(attribute='1') %}
{{ name }}: {{ level }}%
{% endfor %}
{% else %}
All batteries OK (>20%)
{% endif %}""",
    },
    {
        "name": "Unavailable Entities",
        "icon": "mdi:alert-circle",
        "category": "Debugging",
        "description": "Lists all unavailable or unknown entities",
        "template": """{% set ns = namespace(unavailable=[]) %}
{% for state in states %}
  {% if state.state in ['unavailable', 'unknown'] %}
    {% set ns.unavailable = ns.unavailable + [state.entity_id] %}
  {% endif %}
{% endfor %}
{% if ns.unavailable | length > 0 %}
Found {{ ns.unavailable | length }} unavailable entities:
{% for entity in ns.unavailable | sort %}
- {{ entity }}
{% endfor %}
{% else %}
All entities available ✓
{% endif %}""",
    },
    {
        "name": "Lights Currently On",
        "icon": "mdi:lightbulb-on",
        "category": "Lighting",
        "description": "Shows all lights that are currently on",
        "template": """{% set ns = namespace(lights=[]) %}
{% for state in states.light %}
  {% if state.state == 'on' %}
    {% set brightness = state.attributes.brightness | default(0) %}
    {% set ns.lights = ns.lights + [(state.name, brightness)] %}
  {% endif %}
{% endfor %}
{% if ns.lights | length > 0 %}
{{ ns.lights | length }} light(s) on:
{% for name, brightness in ns.lights | sort %}
{{ name }}: {{ ((brightness / 255) * 100) | round(0) }}%
{% endfor %}
{% else %}
No lights on
{% endif %}""",
    },
    {
        "name": "Climate Setpoints",
        "icon": "mdi:thermostat",
        "category": "Climate",
        "description": "Overview of all climate entity target temperatures",
        "template": """{% set ns = namespace(climates=[]) %}
{% for state in states.climate %}
  {% set target = state.attributes.temperature | default('N/A') %}
  {% set current = state.attributes.current_temperature | default('N/A') %}
  {% set ns.climates = ns.climates + [(state.name, current, target, state.state)] %}
{% endfor %}
{% if ns.climates | length > 0 %}
{% for name, current, target, mode in ns.climates | sort %}
{{ name }}:
  Current: {{ current }}°C
  Target: {{ target }}°C
  Mode: {{ mode }}
{% endfor %}
{% else %}
No climate entities found
{% endif %}""",
    },
    {
        "name": "Zigbee Signal Strength",
        "icon": "mdi:zigbee",
        "category": "Network",
        "description": "Shows LQI/RSSI values for Zigbee devices",
        "template": """{% set ns = namespace(devices=[]) %}
{% for state in states.sensor %}
  {% if 'lqi' in state.entity_id.lower() or 'rssi' in state.entity_id.lower() %}
    {% if state.state not in ['unknown', 'unavailable'] %}
      {% set value = state.state | int(0) %}
      {% set device_name = state.name.replace(' LQI', '').replace(' RSSI', '') %}
      {% set metric = 'LQI' if 'lqi' in state.entity_id.lower() else 'RSSI' %}
      {% set ns.devices = ns.devices + [(device_name, metric, value)] %}
    {% endif %}
  {% endif %}
{% endfor %}
{% if ns.devices | length > 0 %}
Zigbee Signal Strength:
{% for name, metric, value in ns.devices | sort %}
{{ name }}: {{ value }} {{ metric }}
{% endfor %}
{% else %}
No Zigbee signal data found
{% endif %}""",
    },
]

# Sidebar / Panel
PANEL_TITLE: Final = "DevTools+"
PANEL_ICON: Final = "mdi:flask-outline"
PANEL_URL_PATH: Final = "devtools-plus"
PANEL_WEBCOMPONENT_NAME: Final = "devtools-plus-panel"
STATIC_URL_PATH: Final = "/devtools_plus_static"
PANEL_MODULE_URL: Final = f"{STATIC_URL_PATH}/devtools-plus-panel.js"
