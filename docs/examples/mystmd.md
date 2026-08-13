# Example: mystmd

Release notes from the `jupyter-book/mystmd` repository over the last 6 months, with contributor lists and release PRs filtered out.

## One entry per release

:::{dropdown} Directive source
````markdown
```{release-notes} jupyter-book/mystmd
:after: -6m
:skip-sections: Contributors to this release|Full Changelog
:skip-lines: 🚀 Release|full changelog
:remove-empty-sections:
```
````
:::

```{release-notes} jupyter-book/mystmd
:after: -6m
:skip-sections: Contributors to this release|Full Changelog
:skip-lines: 🚀 Release|full changelog
:remove-empty-sections:
```

## Grouped by minor version

The same releases with [`group-by`](../index.md#group-by), which merges each minor version's patch releases into one entry.

:::{dropdown} Directive source
````markdown
```{release-notes} jupyter-book/mystmd
:after: -6m
:skip-sections: Contributors to this release|Full Changelog
:skip-lines: 🚀 Release|full changelog
:remove-empty-sections:
:group-by: minor
```
````
:::

```{release-notes} jupyter-book/mystmd
:after: -6m
:skip-sections: Contributors to this release|Full Changelog
:skip-lines: 🚀 Release|full changelog
:remove-empty-sections:
:group-by: minor
```
