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
# Install bun (runtime and package manager)
# macOS
brew install oven-sh/bun/bun
# or see https://bun.sh/docs/installation

# Install gh (GitHub CLI, for fetching releases)
# macOS
brew install gh
# or see https://cli.github.com/
```

### Build and test

```bash
# Install dependencies (including MyST)
bun install

# Build and serve docs locally
bun run docs:live

# Build docs (static)
bun run docs

# Run tests
bun run test
```
