# Example: myst-listing

Release notes from the `myst-contrib/myst-listing` repository, unfiltered.
Some of these release bodies embed images, which render inline in the feed.

## One entry per release

:::{dropdown} Directive source
````markdown
```{release-notes} myst-contrib/myst-listing
```
````
:::

```{release-notes} myst-contrib/myst-listing
```

## Grouped by minor version

The same releases with [`group-by`](../index.md#group-by).
These release bodies have no shared section headings, so each group concatenates its patch notes newest first.
`skip-lines` drops each release's automatic "Full Changelog" footer, which would otherwise repeat inside the group.

:::{dropdown} Directive source
````markdown
```{release-notes} myst-contrib/myst-listing
:group-by: minor
:skip-lines: Full Changelog
```
````
:::

```{release-notes} myst-contrib/myst-listing
:group-by: minor
:skip-lines: Full Changelog
```
