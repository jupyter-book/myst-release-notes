# MyST Release Notes Plugin

A MyST plugin to generate consolidated release notes from a GitHub repository.

This plugin allows you to consolidate and stack the notes from all releases in a GitHub repository. It allows you to create a scannable and persistent space for all the latest releases in your project.

**🚫 Warning - this is experimental**: We're experimenting with this plugin to show release notes on jupyterbook.org. It might change rapidly! You're welcome to use it and give feedback. Eventually it will stabilize, but not just yet!

## Get started

Enable the plugin by adding it to your `project.plugins` field in `myst.yml`:

```yaml
project:
  plugins:
    - https://github.com/jupyter-book/myst-release-notes/releases/download/v0.1.0/index.mjs
```

Replace `v0.1.0` with the version you want to use. See the [releases page](https://github.com/jupyter-book/myst-release-notes/releases) for available versions.

## Usage

Use the `release-notes` directive with the GitHub repository in `org/repo` format:

````markdown
```{release-notes} jupyter-book/mystmd
:after: -6m
```
````

### Filter releases by date

The `:after:` flag only pulls releases after this date. Supports `YYYY-MM-DD` format or relative dates like `-6m` (6 months ago) or `-2w` (2 weeks ago).

### Filter sections by name

The `:skip-sections:` argument is a regex pattern to filter out sections from release notes. Matching sections (and their content until the next sibling heading) are removed.

### Example with options

````markdown
```{release-notes} jupyter-book/mystmd
:after: -6m
:skip-sections: Contributors|Full Changelog
```
````

## Demo

See the [](./releases.md) page for a live demonstration of this plugin showing recent releases from the MyST Document Engine.
