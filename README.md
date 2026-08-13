# MyST Release Notes Plugin

A MyST plugin that collects the release notes from a GitHub repository onto one page of your site.

**Warning**: this plugin is experimental and may change quickly.
We are trying it out for release notes on jupyterbook.org.
Feedback is welcome.

## Usage

See the [documentation](https://contrib.mystmd.org/myst-release-notes/) for setup, all directive options, and live examples.

Once set up, the directive looks like this:

````markdown
```{release-notes} org/repo
:after: -6m
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
