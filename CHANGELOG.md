# Changelog

All notable changes to DevTools Plus will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-03-15

### Added
- Initial release of DevTools Plus
- Config Flow for creating template sensors via GUI
- On-demand template execution (no automatic polling)
- 5 predefined templates:
  - Low Batteries (<20%)
  - Unavailable Entities
  - Lights Currently On
  - Climate Setpoints
  - Zigbee Signal Strength
- Service `devtools_plus.run_template` to execute specific template
- Service `devtools_plus.run_all` to execute all templates (with optional category filter)
- Template sensor with attributes:
  - `template`: The Jinja2 code
  - `last_run`: ISO timestamp
  - `execution_time`: Duration in milliseconds
  - `error`: Error message (if failed)
  - `category`: Template category
  - `line_count`: Number of output lines
- Full Jinja2 support with HA template functions
- Device and Entity integration with HA registry
- Support for Labels, Areas, and Entity customization
- German and English translations
- HACS compatibility

### Features
- Zero overhead between executions (templates run only when triggered)
- Edit templates via Options Flow (no YAML required)
- Dashboard integration examples (Entity Card, Mushroom Card)
- Execution timeout protection (10 seconds)
- Clear error messages for invalid templates

[Unreleased]: https://github.com/Levtos/devtools-plus/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/Levtos/devtools-plus/releases/tag/v0.1.0
