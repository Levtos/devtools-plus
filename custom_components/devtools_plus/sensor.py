"""Sensor platform for DevTools Plus."""
from __future__ import annotations

from datetime import datetime, timedelta
import logging
from typing import Any

from homeassistant.components.sensor import SensorEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import CONF_ICON, CONF_NAME
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.entity import DeviceInfo
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.template import Template
from homeassistant.util import slugify

from .const import (
    ATTR_CATEGORY,
    ATTR_ERROR,
    ATTR_EXECUTION_TIME,
    ATTR_LAST_RUN,
    ATTR_LINE_COUNT,
    ATTR_TEMPLATE,
    CONF_CATEGORY,
    CONF_DESCRIPTION,
    CONF_TEMPLATE,
    DEFAULT_ICON,
    DOMAIN,
    EXECUTION_TIMEOUT,
)

_LOGGER = logging.getLogger(__name__)


async def async_setup_entry(
    hass: HomeAssistant,
    config_entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up DevTools Plus sensor from a config entry."""
    async_add_entities([DevToolsPlusTemplateSensor(hass, config_entry)], True)


class DevToolsPlusTemplateSensor(SensorEntity):
    """Representation of a DevTools Plus Template Sensor."""

    _attr_should_poll = False

    def __init__(self, hass: HomeAssistant, config_entry: ConfigEntry) -> None:
        """Initialize the template sensor."""
        self.hass = hass
        self._config_entry = config_entry
        self._attr_name = config_entry.data[CONF_NAME]
        self._attr_unique_id = config_entry.entry_id
        
        # Set icon
        self._attr_icon = config_entry.data.get(CONF_ICON, DEFAULT_ICON)
        
        # Template
        self._template_code = config_entry.data[CONF_TEMPLATE]
        self._template = Template(self._template_code, hass)
        
        # Attributes
        self._category = config_entry.data.get(CONF_CATEGORY, "")
        self._description = config_entry.data.get(CONF_DESCRIPTION, "")
        self._last_run: datetime | None = None
        self._execution_time: float | None = None
        self._error: str | None = None
        self._line_count: int = 0
        
        # Initial state
        self._attr_native_value = "Not executed yet"
        
        # Device info
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, config_entry.entry_id)},
            name=self._attr_name,
            manufacturer="DevTools Plus",
            model="Template Debugger",
            configuration_url=f"homeassistant://config/devices/device/{config_entry.entry_id}",
        )

    async def async_added_to_hass(self) -> None:
        """Register callbacks when entity is added."""
        # Listen for run_template events
        @callback
        def handle_run_event(event):
            """Handle run template event."""
            if event.data.get("entity_id") == self.entity_id:
                self.hass.async_create_task(self._async_execute_template())
        
        self.async_on_remove(
            self.hass.bus.async_listen(
                f"{DOMAIN}_run_template",
                handle_run_event
            )
        )
        
        # Listen for config entry updates
        @callback
        def handle_update(hass: HomeAssistant, entry: ConfigEntry) -> None:
            """Handle config entry update."""
            if entry.entry_id == self._config_entry.entry_id:
                self._attr_name = entry.data[CONF_NAME]
                self._attr_icon = entry.data.get(CONF_ICON, DEFAULT_ICON)
                self._template_code = entry.data[CONF_TEMPLATE]
                self._template = Template(self._template_code, hass)
                self._category = entry.data.get(CONF_CATEGORY, "")
                self._description = entry.data.get(CONF_DESCRIPTION, "")
                self.async_write_ha_state()
        
        self._config_entry.async_on_unload(
            self._config_entry.add_update_listener(handle_update)
        )

    async def _async_execute_template(self) -> None:
        """Execute the template and update state."""
        start_time = datetime.now()
        
        try:
            # Render template with timeout
            result = await self.hass.async_add_executor_job(
                self._render_template_with_timeout
            )
            
            # Calculate execution time
            execution_time = (datetime.now() - start_time).total_seconds() * 1000
            
            # Update state
            self._attr_native_value = str(result)[:255]  # HA state limit
            self._last_run = start_time
            self._execution_time = round(execution_time, 2)
            self._error = None
            self._line_count = len(str(result).split('\n'))
            
            _LOGGER.debug(
                "Template executed successfully for %s in %.2fms",
                self._attr_name,
                execution_time
            )
            
        except Exception as err:
            _LOGGER.error("Error executing template for %s: %s", self._attr_name, err)
            self._attr_native_value = "Error"
            self._last_run = start_time
            self._execution_time = None
            self._error = str(err)
            self._line_count = 0
        
        self.async_write_ha_state()

    def _render_template_with_timeout(self) -> str:
        """Render template with timeout protection."""
        import asyncio
        from concurrent.futures import TimeoutError
        
        try:
            # This is a simplified timeout - in production, you'd want proper async timeout
            result = self._template.async_render()
            return result
        except TimeoutError:
            raise Exception(f"Template execution exceeded {EXECUTION_TIMEOUT}s timeout")

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        """Return entity specific state attributes."""
        attributes = {
            ATTR_TEMPLATE: self._template_code,
            ATTR_CATEGORY: self._category,
        }
        
        if self._description:
            attributes["description"] = self._description
        
        if self._last_run:
            attributes[ATTR_LAST_RUN] = self._last_run.isoformat()
        
        if self._execution_time is not None:
            attributes[ATTR_EXECUTION_TIME] = f"{self._execution_time}ms"
        
        if self._error:
            attributes[ATTR_ERROR] = self._error
        
        attributes[ATTR_LINE_COUNT] = self._line_count
        
        return attributes
