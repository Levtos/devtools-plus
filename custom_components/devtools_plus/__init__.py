"""DevTools Plus integration."""
from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

import voluptuous as vol
from homeassistant.components import panel_custom
from homeassistant.components.http import StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import Platform
from homeassistant.core import HomeAssistant, ServiceCall
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers.storage import Store
from homeassistant.helpers.typing import ConfigType

from .const import (
    DOMAIN,
    PANEL_ICON,
    PANEL_MODULE_URL,
    PANEL_TITLE,
    PANEL_URL_PATH,
    PANEL_WEBCOMPONENT_NAME,
    SERVICE_RUN_ALL,
    SERVICE_RUN_TEMPLATE,
    STATIC_URL_PATH,
    STORAGE_KEY,
    STORAGE_VERSION,
)

_LOGGER = logging.getLogger(__name__)

PLATFORMS: list[Platform] = [Platform.SENSOR]


async def _async_register_sidebar_panel(hass: HomeAssistant) -> None:
    """Register a sidebar panel for DevTools+ UI."""
    if hass.data[DOMAIN].get("panel_registered"):
        return

    try:
        static_dir = Path(__file__).parent / "frontend"
        await hass.http.async_register_static_paths(
            [
                StaticPathConfig(
                    url_path=STATIC_URL_PATH,
                    path=str(static_dir),
                    cache_headers=False,
                )
            ]
        )

        panel_custom.async_register_panel(
            hass,
            webcomponent_name=PANEL_WEBCOMPONENT_NAME,
            frontend_url_path=PANEL_URL_PATH,
            sidebar_title=PANEL_TITLE,
            sidebar_icon=PANEL_ICON,
            module_url=PANEL_MODULE_URL,
            require_admin=True,
        )
        hass.data[DOMAIN]["panel_registered"] = True
    except Exception as err:  # pragma: no cover - best effort for UI convenience
        _LOGGER.warning("Failed to register sidebar panel: %s", err)


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Set up DevTools Plus component."""
    hass.data.setdefault(DOMAIN, {})
    await _async_register_sidebar_panel(hass)
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
            hass.bus.async_fire(f"{DOMAIN}_run_template", {"entity_id": entity_id})

    async def handle_run_all(call: ServiceCall) -> None:
        """Handle run_all service call."""
        category = call.data.get("category")

        # Get all devtools_plus sensors
        entity_registry = hass.helpers.entity_registry.async_get(hass)
        entities = [
            registry_entry.entity_id
            for registry_entry in entity_registry.entities.values()
            if registry_entry.platform == DOMAIN
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
            hass.bus.async_fire(f"{DOMAIN}_run_template", {"entity_id": entity_id})

    hass.services.async_register(
        DOMAIN,
        SERVICE_RUN_TEMPLATE,
        handle_run_template,
        schema=cv.make_entity_service_schema({}),
    )

    hass.services.async_register(
        DOMAIN,
        SERVICE_RUN_ALL,
        handle_run_all,
        schema=cv.make_entity_service_schema({vol.Optional("category"): cv.string}),
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
    templates = hass.data[DOMAIN].get("templates", {})
    templates.pop(entry.entry_id, None)

    store = hass.data[DOMAIN].get("store")
    if store:
        await store.async_save({"templates": templates})
