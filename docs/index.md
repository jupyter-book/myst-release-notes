# MyST Release Notes Plugin

Collect the release notes from a GitHub repository onto one page of your MyST site.

This plugin fetches releases from GitHub and hands them to [myst-listing](https://github.com/myst-contrib/myst-listing), which renders them as a feed by default.

## Get started

Releases are fetched with the [GitHub CLI](https://cli.github.com/), so `gh` must be installed and authenticated wherever you build your site.

Add both plugins to `project.plugins` in `myst.yml`, with this plugin first:

```yaml
project:
  plugins:
    - https://github.com/jupyter-book/myst-release-notes/releases/latest/download/index.mjs
    - https://github.com/myst-contrib/myst-listing/releases/latest/download/plugin.mjs
```

These URLs always point at each plugin's latest release.
To pin versions, pick them from the release pages ([myst-release-notes](https://github.com/jupyter-book/myst-release-notes/releases), [myst-listing](https://github.com/myst-contrib/myst-listing/releases)) and use their download URLs instead.

Then use the `release-notes` directive with a repository in `org/repo` format:

````markdown
```{release-notes} jupyter-book/mystmd
:after: -6m
```
````

Fetched releases are cached in `_build/myst-releases/`.
Delete that folder to fetch fresh data, for example after publishing a new release.

If the directive renders nothing at all, check that myst-listing is also listed in `plugins`.

## Options

### `after`

Only include releases published after this date.
Accepts `YYYY-MM-DD`, or a relative offset in days, weeks, months, or years: `-10d`, `-2w`, `-6m`, `-1y`.
For repositories with many releases, use this or `limit` to keep the page a reasonable size.

### `skip-sections`

Remove sections whose heading matches this regex (case-insensitive).
The heading and everything up to the next heading of the same or higher level is removed.

### `skip-lines`

Remove bullet list items whose text matches this regex (case-insensitive).
Useful for dropping automated entries like "Release" PRs.
If every item in a list matches, the whole list is removed.

### `remove-empty-sections`

Remove sections that have no content under their heading.
This runs after `skip-lines`, so a section whose items were all filtered out is also removed.

### `display`

Which myst-listing display to use: `feed` (default), `summary`, `table`, or `gallery`.

### `limit`

Maximum number of releases to show.
By default all releases are shown.

### Combined example

````markdown
```{release-notes} jupyter-book/mystmd
:after: -6m
:skip-sections: Contributors|Full Changelog
:limit: 5
```
````

## Use with the `{listing}` directive

Because this plugin is a myst-listing collector, `:source: github-releases` also works in a plain `{listing}` directive, with the repository as `:path:`:

````markdown
```{listing}
:source: github-releases
:path: jupyter-book/mystmd
:display: table
```
````

However, note that the filtering options (`after`, `skip-sections`, `skip-lines`, `remove-empty-sections`) only work in `{release-notes}`.

## Examples

See [](./examples/mystmd.md) and [](./examples/myst-listing.md) for live examples.
