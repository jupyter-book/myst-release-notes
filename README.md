# MyST Release Notes Plugin

A MyST plugin to generate consolidated release notes from a GitHub repository.

This plugin allows you to consolidate and stack the notes from all releases in a GitHub repository. It allows you to create a scannable and persistent space for all the latest releases in your project.

## Documentation

See the [documentation site](https://jupyter-book.github.io/myst-release-notes) for usage instructions and a live demo.

## Quick start

Add the plugin to your `myst.yml`:

```yaml
project:
  plugins:
    - https://github.com/jupyter-book/myst-release-notes/releases/download/v0.1.0/index.mjs
```

Replace `v0.1.0` with the desired version from the [releases page](https://github.com/jupyter-book/myst-release-notes/releases).

Then use the directive in your documents:

````markdown
```{release-notes} org/repo
:after: -6m
:skip-sections: Contributors|Full Changelog
```
````

## Development

### Install prerequisites

```bash
# Install just (command runner)
# macOS
brew install just
# or see https://github.com/casey/just#installation

# Install uv (Python package manager)
# macOS
brew install uv
# or see https://github.com/astral-sh/uv#installation

# Install gh (GitHub CLI, for fetching releases)
# macOS
brew install gh
# or see https://cli.github.com/

# Node.js 20+ is also required
```

### Build and test

```bash
# Build and serve docs locally (creates .venv automatically)
just docs-live

# Build docs (static)
just docs

# Run tests (installs node dependencies automatically)
just test
```

The first run of `just docs` or `just docs-live` will create a `.venv` folder and install MyST.
