"""Config flow for DevTools Plus integration."""
from __future__ import annotations

import logging
from typing import Any

import voluptuous as vol

from homeassistant import config_entries
from homeassistant.const import CONF_ICON, CONF_NAME
from homeassistant.core import callback
from homeassistant.helpers import selector
import homeassistant.helpers.config_validation as cv

from .const import (
    CONF_CATEGORY,
    CONF_DESCRIPTION,
    CONF_TEMPLATE,
    DEFAULT_CATEGORY,
    DEFAULT_ICON,
    DOMAIN,
    PREDEFINED_TEMPLATES,
)

_LOGGER = logging.getLogger(__name__)


class DevToolsPlusConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Handle a config flow for DevTools Plus."""

    VERSION = 1

    def __init__(self) -> None:
        """Initialize the config flow."""
        self._use_predefined = False
        self._predefined_selection = None

    async def async_step_user(
        self, user_input: dict[str, Any] | None = None
    ) -> config_entries.FlowResult:
        """Handle the initial step - ask if user wants predefined or custom."""
        if user_input is not None:
            if user_input.get("use_predefined"):
                return await self.async_step_predefined()
            return await self.async_step_custom()

        return self.async_show_form(
            step_id="user",
            data_schema=vol.Schema(
                {
                    vol.Required("use_predefined", default=False): selector.BooleanSelector(),
                }
            ),
            description_placeholders={
                "info": "Choose whether to use a predefined template or create a custom one."
            }
        )

    async def async_step_predefined(
        self, user_input: dict[str, Any] | None = None
    ) -> config_entries.FlowResult:
        """Handle predefined template selection."""
        if user_input is not None:
            # Get selected template
            selected_name = user_input["template_selection"]
            template_data = next(
                (t for t in PREDEFINED_TEMPLATES if t["name"] == selected_name),
                None
            )
            
            if template_data:
                return self.async_create_entry(
                    title=template_data["name"],
                    data={
                        CONF_NAME: template_data["name"],
                        CONF_ICON: template_data["icon"],
                        CONF_CATEGORY: template_data["category"],
                        CONF_DESCRIPTION: template_data["description"],
                        CONF_TEMPLATE: template_data["template"],
                    },
                )

        # Show predefined template options
        template_names = [t["name"] for t in PREDEFINED_TEMPLATES]
        
        return self.async_show_form(
            step_id="predefined",
            data_schema=vol.Schema(
                {
                    vol.Required("template_selection"): selector.SelectSelector(
                        selector.SelectSelectorConfig(
                            options=template_names,
                            mode=selector.SelectSelectorMode.DROPDOWN,
                        )
                    ),
                }
            ),
            description_placeholders={
                "info": "Select a predefined template from the list."
            }
        )

    async def async_step_custom(
        self, user_input: dict[str, Any] | None = None
    ) -> config_entries.FlowResult:
        """Handle custom template creation."""
        errors: dict[str, str] = {}

        if user_input is not None:
            # Validate template syntax by trying to render it
            try:
                from homeassistant.helpers.template import Template
                template = Template(user_input[CONF_TEMPLATE], self.hass)
                # Try to render to check for syntax errors
                template.async_render()
            except Exception as err:
                _LOGGER.error("Template validation error: %s", err)
                errors["template"] = "invalid_template"
            
            if not errors:
                return self.async_create_entry(
                    title=user_input[CONF_NAME],
                    data=user_input,
                )

        return self.async_show_form(
            step_id="custom",
            data_schema=vol.Schema(
                {
                    vol.Required(CONF_NAME): selector.TextSelector(),
                    vol.Required(
                        CONF_ICON, default=DEFAULT_ICON
                    ): selector.IconSelector(),
                    vol.Required(
                        CONF_CATEGORY, default=DEFAULT_CATEGORY
                    ): selector.TextSelector(),
                    vol.Optional(CONF_DESCRIPTION): selector.TextSelector(
                        selector.TextSelectorConfig(multiline=False)
                    ),
                    vol.Required(CONF_TEMPLATE): selector.TextSelector(
                        selector.TextSelectorConfig(
                            multiline=True,
                            type=selector.TextSelectorType.TEXT,
                        )
                    ),
                }
            ),
            errors=errors,
            description_placeholders={
                "info": "Create a custom template with Jinja2 syntax."
            }
        )

    @staticmethod
    @callback
    def async_get_options_flow(
        config_entry: config_entries.ConfigEntry,
    ) -> DevToolsPlusOptionsFlow:
        """Get the options flow for this handler."""
        return DevToolsPlusOptionsFlow(config_entry)


class DevToolsPlusOptionsFlow(config_entries.OptionsFlow):
    """Handle options flow for DevTools Plus."""

    def __init__(self, config_entry: config_entries.ConfigEntry) -> None:
        """Initialize options flow."""
        self.config_entry = config_entry

    async def async_step_init(
        self, user_input: dict[str, Any] | None = None
    ) -> config_entries.FlowResult:
        """Manage the options."""
        errors: dict[str, str] = {}

        if user_input is not None:
            # Validate template syntax
            try:
                from homeassistant.helpers.template import Template
                template = Template(user_input[CONF_TEMPLATE], self.hass)
                template.async_render()
            except Exception as err:
                _LOGGER.error("Template validation error: %s", err)
                errors["template"] = "invalid_template"
            
            if not errors:
                # Update config entry
                self.hass.config_entries.async_update_entry(
                    self.config_entry,
                    data=user_input,
                )
                return self.async_create_entry(title="", data={})

        return self.async_show_form(
            step_id="init",
            data_schema=vol.Schema(
                {
                    vol.Required(
                        CONF_NAME,
                        default=self.config_entry.data.get(CONF_NAME)
                    ): selector.TextSelector(),
                    vol.Required(
                        CONF_ICON,
                        default=self.config_entry.data.get(CONF_ICON, DEFAULT_ICON)
                    ): selector.IconSelector(),
                    vol.Required(
                        CONF_CATEGORY,
                        default=self.config_entry.data.get(CONF_CATEGORY, DEFAULT_CATEGORY)
                    ): selector.TextSelector(),
                    vol.Optional(
                        CONF_DESCRIPTION,
                        default=self.config_entry.data.get(CONF_DESCRIPTION, "")
                    ): selector.TextSelector(
                        selector.TextSelectorConfig(multiline=False)
                    ),
                    vol.Required(
                        CONF_TEMPLATE,
                        default=self.config_entry.data.get(CONF_TEMPLATE)
                    ): selector.TextSelector(
                        selector.TextSelectorConfig(
                            multiline=True,
                            type=selector.TextSelectorType.TEXT,
                        )
                    ),
                }
            ),
            errors=errors,
        )
