"""DevTools Plus integration."""
from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

import voluptuous as vol
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import Platform
from homeassistant.core import HomeAssistant, ServiceCall
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers.storage import Store
from homeassistant.helpers.typing import ConfigType

from .const import (
    DOMAIN,
    SERVICE_RUN_ALL,
    SERVICE_RUN_TEMPLATE,
    STORAGE_KEY,
    STORAGE_VERSION,
)

_LOGGER = logging.getLogger(__name__)

PLATFORMS: list[Platform] = [Platform.SENSOR]
FRONTEND_DIR = Path(__file__).parent / "frontend"
STATIC_URL = "/devtools_plus_static"
PANEL_URL = "devtools-plus"


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Set up DevTools Plus component."""
    hass.data.setdefault(DOMAIN, {})

    # Register static files for the frontend panel
    try:
        from homeassistant.components.http import StaticPathConfig  # HA 2024.3+
        await hass.http.async_register_static_paths(
            [StaticPathConfig(STATIC_URL, str(FRONTEND_DIR), cache_headers=True)]
        )
    except (ImportError, AttributeError):
        hass.http.register_static_path(STATIC_URL, str(FRONTEND_DIR), cache_headers=True)

    # Register the sidebar panel
    try:
        from homeassistant.components.panel_custom import async_register_panel
        await async_register_panel(
            hass,
            component_name="devtools-plus-panel",
            sidebar_title="DevTools Plus",
            sidebar_icon="mdi:tools",
            frontend_url_path=PANEL_URL,
            config={},
            require_admin=False,
            module_url=f"{STATIC_URL}/devtools-plus-panel.js",
        )
    except Exception as err:  # noqa: BLE001
        _LOGGER.warning("Could not register DevTools Plus panel: %s", err)

    return True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up DevTools Plus from a config entry."""
    hass.data.setdefault(DOMAIN, {})
    
    # Initialize storage
    store = Store(hass, STORAGE_VERSION, STORAGE_KEY)
    hass.data[DOMAIN]["store"] = store
    
    # Load stored templates
    data = await store.async_load()
    if data is None:
        data = {"templates": {}}
    hass.data[DOMAIN]["templates"] = data.get("templates", {})
    
    # Store the entry
    hass.data[DOMAIN][entry.entry_id] = entry
    
    # Forward setup to sensor platform
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    
    # Register services
    async def handle_run_template(call: ServiceCall) -> None:
        """Handle run_template service call."""
        entity_id = call.data.get("entity_id")
        
        if not entity_id:
            _LOGGER.error("No entity_id provided for run_template service")
            return
        
        # Find the sensor entity and trigger update
        entity_registry = hass.helpers.entity_registry.async_get(hass)
        entity_entry = entity_registry.async_get(entity_id)
        
        if not entity_entry:
            _LOGGER.error("Entity %s not found", entity_id)
            return
        
        # Trigger state update
        state = hass.states.get(entity_id)
        if state:
            # Force update by firing an event
            hass.bus.async_fire(
                f"{DOMAIN}_run_template",
                {"entity_id": entity_id}
            )
    
    async def handle_run_all(call: ServiceCall) -> None:
        """Handle run_all service call."""
        category = call.data.get("category")
        
        # Get all devtools_plus sensors
        entity_registry = hass.helpers.entity_registry.async_get(hass)
        entities = [
            entry.entity_id
            for entry in entity_registry.entities.values()
            if entry.platform == DOMAIN
        ]
        
        # Filter by category if specified
        if category:
            filtered_entities = []
            for entity_id in entities:
                state = hass.states.get(entity_id)
                if state and state.attributes.get("category") == category:
                    filtered_entities.append(entity_id)
            entities = filtered_entities
        
        # Trigger all
        for entity_id in entities:
            hass.bus.async_fire(
                f"{DOMAIN}_run_template",
                {"entity_id": entity_id}
            )
    
    hass.services.async_register(
        DOMAIN,
        SERVICE_RUN_TEMPLATE,
        handle_run_template,
        schema=cv.make_entity_service_schema({})
    )
    
    hass.services.async_register(
        DOMAIN,
        SERVICE_RUN_ALL,
        handle_run_all,
        schema=cv.make_entity_service_schema(
            {vol.Optional("category"): cv.string}
        )
    )
    
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload a config entry."""
    unload_ok = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
    
    if unload_ok:
        hass.data[DOMAIN].pop(entry.entry_id, None)
    
    return unload_ok


async def async_remove_entry(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Remove a config entry."""
    # Remove from storage
    templates = hass.data[DOMAIN].get("templates", {})
    templates.pop(entry.entry_id, None)
    
    store = hass.data[DOMAIN].get("store")
    if store:
        await store.async_save({"templates": templates})
