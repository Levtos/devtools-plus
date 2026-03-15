# Contributing to DevTools Plus

Thank you for your interest in contributing to DevTools Plus! 🎉

## How to Contribute

### Reporting Bugs

1. Check if the bug has already been reported in [Issues](https://github.com/Levtos/devtools-plus/issues)
2. If not, create a new issue with:
   - Clear title and description
   - Steps to reproduce
   - Expected vs. actual behavior
   - Home Assistant version
   - DevTools Plus version
   - Relevant logs from HA

### Suggesting Features

1. Check [Discussions](https://github.com/Levtos/devtools-plus/discussions) for existing ideas
2. Open a new discussion or issue with:
   - Use case description
   - Expected behavior
   - Example configuration (if applicable)

### Pull Requests

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Make your changes
4. Test thoroughly:
   - Install in development HA instance
   - Test config flow
   - Test template execution
   - Test service calls
5. Commit with clear messages
6. Push to your fork
7. Open a Pull Request with:
   - Description of changes
   - Testing performed
   - Screenshots (if UI changes)

## Development Setup

### Prerequisites

- Home Assistant development environment
- Python 3.11+
- Git

### Local Development

1. Clone your fork:
```bash
git clone https://github.com/YOUR_USERNAME/devtools-plus.git
cd devtools-plus
```

2. Link to HA custom_components:
```bash
ln -s $(pwd)/custom_components/devtools_plus ~/.homeassistant/custom_components/devtools_plus
```

3. Restart Home Assistant

4. Make changes and test

### Code Style

- Follow PEP 8
- Use type hints
- Add docstrings to functions
- Keep functions focused and small
- Use meaningful variable names

### Testing Checklist

Before submitting PR:
- [ ] Config flow works (create new template)
- [ ] Options flow works (edit existing template)
- [ ] Predefined templates load correctly
- [ ] Custom templates execute successfully
- [ ] Service calls work (`run_template`, `run_all`)
- [ ] Error handling works (invalid template syntax)
- [ ] Attributes update correctly
- [ ] No errors in HA logs
- [ ] German and English translations present

## Adding Predefined Templates

To add a new predefined template:

1. Edit `custom_components/devtools_plus/const.py`
2. Add to `PREDEFINED_TEMPLATES` list:
```python
{
    "name": "Your Template Name",
    "icon": "mdi:icon-name",
    "category": "Category",
    "description": "What this template does",
    "template": """Your Jinja2 template here""",
}
```

3. Test the template thoroughly
4. Update README.md with template description
5. Submit PR

## Questions?

- Open a [Discussion](https://github.com/Levtos/devtools-plus/discussions)
- Tag @Levtos in your issue/PR

Thank you for contributing! 🚀
