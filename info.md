## DevTools Plus

**On-Demand Template Debugging for Home Assistant**

DevTools Plus allows you to create reusable template sensors that execute only when you need them - no more constant polling and system overhead!

### Features

✅ **On-Demand Execution** - Templates run only when triggered  
✅ **Predefined Templates** - Start with 5 ready-to-use debugging templates  
✅ **Custom Templates** - Create your own Jinja2 templates  
✅ **Performance Tracking** - See execution time for each run  
✅ **Error Handling** - Clear error messages when templates fail  
✅ **Categories & Organization** - Group templates by purpose  
✅ **Dashboard Integration** - Trigger from Lovelace cards  

### Predefined Templates

- **Low Batteries** - All battery sensors below 20%
- **Unavailable Entities** - Find broken entities
- **Lights Currently On** - Overview of active lights
- **Climate Setpoints** - All thermostat temperatures
- **Zigbee Signal Strength** - LQI/RSSI monitoring

### Quick Start

1. Add a new DevTools Plus template via Integrations
2. Choose a predefined template or create custom
3. Use the `devtools_plus.run_template` service to execute
4. View results in the sensor state and attributes

### Services

- `devtools_plus.run_template` - Execute a specific template
- `devtools_plus.run_all` - Run all templates (optional: filter by category)

### Example Dashboard Card

```yaml
type: entity
entity: sensor.devtools_plus_battery_status
name: Battery Debug
tap_action:
  action: call-service
  service: devtools_plus.run_template
  service_data:
    entity_id: sensor.devtools_plus_battery_status
```

---

💡 **Perfect for debugging complex template logic without permanent sensors!**
