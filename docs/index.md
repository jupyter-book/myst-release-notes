# MyST Release Notes Plugin

Collect the release notes from a GitHub repository onto one page of your MyST site.

This plugin fetches releases from GitHub and hands them to [myst-listing](https://github.com/myst-contrib/myst-listing), which renders each release as its own section by default.

## Get started

Releases are fetched with the [GitHub CLI](https://cli.github.com/), so `gh` must be installed and authenticated wherever you build your site.

Add both plugins to `project.plugins` in `myst.yml`, with this plugin first:

```yaml
project:
  plugins:
    - https://github.com/myst-contrib/myst-release-notes/releases/latest/download/index.mjs
    - https://github.com/myst-contrib/myst-listing/releases/latest/download/plugin.mjs
```

These URLs always point at each plugin's latest release.
To pin versions, pick them from the release pages ([myst-release-notes](https://github.com/myst-contrib/myst-release-notes/releases), [myst-listing](https://github.com/myst-contrib/myst-listing/releases)) and use their download URLs instead.

Then use the `release-notes` directive with a repository in `org/repo` format:

````markdown
```{release-notes} jupyter-book/mystmd
:since: -6m
```
````

Draft releases are never shown.
Pre-releases are shown and labeled with a `pre-release` tag.

Fetched releases are cached in `_build/myst-releases/`.
Delete that folder to fetch fresh data, for example after publishing a new release.

If the directive renders nothing at all, check that myst-listing is also listed in `plugins`.

## Options

### `since`

Only include releases published after this date.
Accepts `YYYY-MM-DD`, or a relative offset in days, weeks, months, or years: `-10d`, `-2w`, `-6m`, `-1y`.
For repositories with many releases, use this or `limit` to keep the page a reasonable size.

### `skip`

Remove unwanted content from release bodies: one or more phrases separated by `|`, matched case-insensitively.
A phrase that matches a heading removes that whole section. One that matches a bullet item or paragraph removes just that line.
Useful for dropping contributor lists, automated "Release" PRs, or GitHub's automatic "Full Changelog" footer. For example:

```
:skip: Contributors to this release|Full Changelog|🚀 Release
```

Phrases are regular expressions, so `.`, `?`, and `(` need a backslash to match literally.
Sections left empty by this filtering are removed too; set `:remove-empty-sections: false` to keep them.

### `group-by`

Aggregate releases by `minor` or `major` version, so a run of patch releases becomes one entry like `v0.1.x`.
Sections with the same heading (like "Bugs fixed") are merged across releases, newest first, and each entry starts with a line linking every release it contains.
Releases without a recognizable version in their tag are shown individually.
`since` and `skip` apply to each release before grouping; `limit` counts grouped entries.

````markdown
```{release-notes} jupyter-book/mystmd
:group-by: minor
```
````

See it live in the [mystmd example](./examples/mystmd.md).

### `display`

Which [myst-listing display](https://contrib.mystmd.org/myst-listing/displays) to use.
The default, `sections`, renders each release as its own `##`-level section, so releases show up in the page outline.

### `limit`

Maximum number of releases to show.
By default all releases are shown.

### Combined example

````markdown
```{release-notes} jupyter-book/mystmd
:since: -6m
:skip: Contributors|Full Changelog
:limit: 5
```
````

## How to use with the `{listing}` directive

Because this plugin is a myst-listing collector, `:source: github-releases` also works in a plain `{listing}` directive, with the repository as `:path:`:

````markdown
```{listing}
:source: github-releases
:path: jupyter-book/mystmd
:display: table
```
````

Two caveats: the filtering options (`since`, `skip`) only work in `{release-notes}`, and release bodies are not parsed in this form, so use a display that doesn't need them (like `table`).
`{listing}` also defaults `limit` to 10, unlike `{release-notes}` which shows everything.

## Examples

See [](./examples/mystmd.md) and [](./examples/myst-listing.md) for live examples.
