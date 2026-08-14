import { execSync } from 'child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import path from 'path';

/**
 * A myst-listing collector for GitHub releases.
 * The {release-notes} directive emits a myst-listing placeholder with
 * `source: github-releases`; the collector transform below fetches the
 * releases and fills `node.items`, and myst-listing renders the display
 * (sections by default). Load this plugin before myst-listing in myst.yml.
 */
const PLACEHOLDER = 'listingPlaceholder';
const SOURCE = 'github-releases';

// parseMyst is only handed to directives, not transforms; the directive
// stashes it here for the collector (see myst-listing's shared.ts and
// https://github.com/jupyter-book/mystmd/issues/2626).
const ctxRef = {};

/**
 * Parse the :since: option into a Date object.
 * Supports: YYYY-MM-DD or relative -Nd/-Nw/-Nm/-Ny.
 * Throws on an unparseable value so the user gets an error admonition
 * instead of a silently unfiltered listing.
 */
function parseSinceDate(afterStr) {
  if (!afterStr) return null;

  // Relative format: -3m, -2w, etc.
  const relativeMatch = afterStr.match(/^-(\d+)([dwmy])$/);
  if (relativeMatch) {
    const amount = parseInt(relativeMatch[1], 10);
    const unit = relativeMatch[2];
    const date = new Date();
    if (unit === 'd') {
      date.setDate(date.getDate() - amount);
    } else if (unit === 'w') {
      date.setDate(date.getDate() - amount * 7);
    } else if (unit === 'm') {
      date.setMonth(date.getMonth() - amount);
    } else {
      date.setFullYear(date.getFullYear() - amount);
    }
    return date;
  }

  // Absolute format: YYYY-MM-DD
  const parsed = new Date(afterStr);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }

  throw new Error(
    `could not parse :since: value '${afterStr}' (use YYYY-MM-DD or -Nd/-Nw/-Nm/-Ny)`
  );
}

/**
 * Fetch releases from GitHub using the gh CLI, caching per repo.
 * Throws on fetch failure so the listing renders an error admonition.
 */
function fetchReleases(repo, cacheDir) {
  const cacheFile = path.join(cacheDir, 'cache.json');
  let cache = {};
  try {
    cache = JSON.parse(readFileSync(cacheFile, 'utf8'));
  } catch {
    // No cache yet
  }
  if (cache[repo]) return cache[repo];

  let result;
  try {
    result = execSync(
      `gh api repos/${repo}/releases --paginate`,
      { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 }
    );
  } catch (err) {
    const stderr = String(err.stderr ?? '').trim().split('\n')[0];
    throw new Error(
      `fetching releases for '${repo}' with the GitHub CLI failed` +
        ` (is 'gh' installed and authenticated?)${stderr ? `: ${stderr}` : ''}`
    );
  }

  cache[repo] = JSON.parse(result);
  mkdirSync(cacheDir, { recursive: true });
  writeFileSync(cacheFile, JSON.stringify(cache, null, 2));
  return cache[repo];
}

/**
 * Filter out sections whose heading matches the :skip: regex.
 * Removes matched header and all content until next sibling (same level) header.
 */
function filterSections(children, skipRegex) {
  if (!skipRegex || !children) return children;

  const regex = new RegExp(skipRegex, 'i');
  const result = [];
  let skipUntilDepth = null;

  for (const node of children) {
    // Check if this is a heading
    if (node.type === 'heading') {
      const headingText = getTextContent(node);
      const depth = node.depth || 1;

      // If we're skipping and hit a sibling or higher-level heading, stop skipping
      if (skipUntilDepth !== null && depth <= skipUntilDepth) {
        skipUntilDepth = null;
      }

      // Check if this heading matches the skip pattern
      if (skipUntilDepth === null && regex.test(headingText)) {
        skipUntilDepth = depth;
        continue; // Skip this heading
      }
    }

    // Skip content if we're in skip mode
    if (skipUntilDepth !== null) {
      continue;
    }

    result.push(node);
  }

  return result;
}

/**
 * Extract text content from an AST node recursively.
 */
function getTextContent(node) {
  if (!node) return '';
  if (node.type === 'text') return node.value || '';
  if (node.children) {
    return node.children.map(getTextContent).join('');
  }
  return '';
}

/**
 * Filter out list items and paragraphs whose text matches the :skip: regex.
 * Paragraph matching lets users drop un-headinged lines like GitHub's
 * automatic "Full Changelog" footer, which heading matching cannot reach.
 */
function filterLines(children, skipRegex) {
  if (!skipRegex || !children) return children;
  const regex = new RegExp(skipRegex, 'i');

  return children.map(node => {
    if (node.type === 'paragraph' && regex.test(getTextContent(node))) {
      return null;
    }
    if (node.type === 'list' && node.children) {
      const filteredItems = node.children.filter(item => !regex.test(getTextContent(item)));
      if (filteredItems.length === 0) return null;
      return { ...node, children: filteredItems };
    }
    return node;
  }).filter(Boolean);
}

/**
 * Remove sections (heading + content) that have no content after the heading.
 */
function removeEmptySections(children) {
  if (!children || children.length === 0) return children;

  const result = [];
  let i = 0;

  while (i < children.length) {
    const node = children[i];

    if (node.type === 'heading') {
      const headingDepth = node.depth || 1;
      // Collect content until next sibling or higher-level heading
      const sectionContent = [];
      let j = i + 1;

      while (j < children.length) {
        const next = children[j];
        if (next.type === 'heading' && (next.depth || 1) <= headingDepth) {
          break;
        }
        sectionContent.push(next);
        j++;
      }

      // Anything but a (deeper, also-empty) heading counts as content.
      const hasContent = sectionContent.some(n => n.type !== 'heading');

      if (hasContent) {
        result.push(node);
        result.push(...sectionContent);
      }
      // Skip to next section
      i = j;
    } else {
      result.push(node);
      i++;
    }
  }

  return result;
}

/**
 * Parse a version out of a tag like v0.1.12 or mystmd@1.10.1.
 * Returns { prefix, major, minor } or null for non-semver tags.
 */
function parseTagVersion(tag) {
  const m = (tag || '').match(/(\d+)\.(\d+)\.\d+/);
  if (!m) return null;
  return { prefix: tag.slice(0, m.index), major: m[1], minor: m[2] };
}

/** A "Releases: v0.1.9 · v0.1.8" paragraph linking each release in a group. */
function releasesLine(releases) {
  const links = releases.flatMap((r, i) => [
    ...(i ? [{ type: 'text', value: ' · ' }] : []),
    {
      type: 'link',
      url: r.html_url,
      children: [{ type: 'text', value: r.tag_name || r.name || '' }],
    },
  ]);
  return {
    type: 'paragraph',
    children: [
      { type: 'strong', children: [{ type: 'text', value: 'Releases:' }] },
      { type: 'text', value: ' ' },
      ...links,
    ],
  };
}

/**
 * Merge release bodies (newest first) into one: content before the first
 * heading concatenates at the top, then sections merged by heading text
 * (case-insensitive, first-seen order, ignoring heading depth) with
 * adjacent lists fused into one.
 */
function mergeBodies(bodies) {
  const preamble = [];
  const sections = new Map();
  for (const body of bodies) {
    let current = null;
    for (const node of body) {
      if (node.type === 'heading') {
        const key = getTextContent(node).trim().toLowerCase();
        if (!sections.has(key)) sections.set(key, { heading: node, content: [] });
        current = sections.get(key).content;
      } else {
        (current ?? preamble).push(node);
      }
    }
  }
  const merged = [...preamble];
  for (const { heading, content } of sections.values()) {
    merged.push(heading);
    for (const node of content) {
      const prev = merged[merged.length - 1];
      if (node.type === 'list' && prev?.type === 'list' && prev.ordered === node.ordered) {
        prev.children.push(...node.children);
      } else {
        merged.push(node);
      }
    }
  }
  return merged;
}

/**
 * Group releases by minor or major version, one merged item per group
 * titled e.g. "v0.1.x". Non-semver tags stay as their own items.
 */
function groupReleases(releases, node) {
  // Merge newest-first so merged bullets read like the feed does. Items are
  // appended groups-after-singletons; myst-listing re-sorts them by date.
  const sorted = [...releases].sort(
    (a, b) => new Date(b.published_at || 0) - new Date(a.published_at || 0)
  );
  const items = [];
  const groups = new Map();
  for (const release of sorted) {
    const v = parseTagVersion(release.tag_name || release.name);
    if (!v) {
      items.push(releaseToItem(release, node));
      continue;
    }
    const key =
      node.groupBy === 'major' ? `${v.prefix}${v.major}` : `${v.prefix}${v.major}.${v.minor}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(release);
  }
  for (const [key, members] of groups) {
    items.push({
      title: `${key}.x`,
      date: members[0].published_at,
      // No url: there is no GitHub page for "v0.1.x"; the Releases line
      // links each member release instead.
      body: [releasesLine(members), ...mergeBodies(members.map(r => releaseToItem(r, node).body))],
    });
  }
  return items;
}

/** One GitHub release as a myst-listing item (title, date, url, body). */
function releaseToItem(release, node) {
  const body = release.body || '';
  let children = [];
  if (body.trim() && ctxRef.parseMyst) {
    children = ctxRef.parseMyst(body)?.children || [];
    children = filterSections(children, node.skip);
    children = filterLines(children, node.skip);
    if (node.removeEmptySections) {
      children = removeEmptySections(children);
    }
  }
  return {
    title: release.name || release.tag_name || '',
    // myst-listing parses and formats ISO dates itself.
    date: release.published_at,
    url: release.html_url,
    // Displays render tags as chips with no extra config.
    tags: release.prerelease ? ['pre-release'] : undefined,
    body: children,
  };
}

const releaseNotesDirective = {
  name: 'release-notes',
  doc: 'Display release notes from a GitHub repository as a myst-listing.',
  arg: {
    type: String,
    doc: 'GitHub repository in org/repo format',
  },
  options: {
    since: {
      type: String,
      doc: 'Only show releases after this date (YYYY-MM-DD, or relative -Nd/-Nw/-Nm/-Ny)',
    },
    skip: {
      type: String,
      doc: 'Remove matching content: phrases separated by | (case-insensitive; regex works too). A matching heading removes its whole section; a matching list item or paragraph removes itself.',
    },
    'remove-empty-sections': {
      type: Boolean,
      doc: 'Remove sections left empty after :skip: filtering (default: true)',
    },
    'group-by': {
      type: String,
      doc: "Aggregate releases by 'minor' or 'major' version, merging sections with the same heading",
    },
    display: {
      type: String,
      doc: "myst-listing display to use. Default 'sections': each release becomes its own section in the page outline.",
    },
    limit: {
      type: Number,
      doc: 'Maximum number of releases to show. Default: no limit.',
    },
  },
  run(data, _vfile, ctx) {
    if (!ctxRef.parseMyst && ctx?.parseMyst) ctxRef.parseMyst = ctx.parseMyst;
    const o = data.options ?? {};
    return [
      {
        type: PLACEHOLDER,
        children: [],
        source: SOURCE,
        path: data.arg,
        // Options read by the collector below.
        since: o.since,
        skip: o.skip,
        removeEmptySections: o['remove-empty-sections'] ?? true,
        groupBy: o['group-by'],
        // myst-listing defaults the other placeholder fields (sort,
        // columns); an undefined limit means no limit.
        display: o.display ?? 'sections',
        limit: o.limit,
      },
    ];
  },
};

const collectTransform = {
  name: 'release-notes-collect',
  stage: 'document',
  doc: 'Fill myst-listing placeholders whose :source: is github-releases.',
  plugin: (_opts, utils) => (tree, vfile) => {
    for (const node of utils.selectAll(PLACEHOLDER, tree)) {
      if (node.source !== SOURCE) continue;
      try {
        const repo = node.path;
        if (!repo || !repo.includes('/')) {
          throw new Error('provide a GitHub repository in org/repo format');
        }
        const cacheDir = path.join(vfile?.cwd || process.cwd(), '_build', 'myst-releases');
        // gh returns unpublished drafts when the user has push access;
        // they never belong on a public release-notes page.
        let releases = fetchReleases(repo, cacheDir).filter(r => !r.draft);
        const sinceDate = parseSinceDate(node.since);
        if (sinceDate) {
          releases = releases.filter(r => new Date(r.published_at) >= sinceDate);
        }
        if (node.groupBy && node.groupBy !== 'minor' && node.groupBy !== 'major') {
          throw new Error(`:group-by: must be 'minor' or 'major', got '${node.groupBy}'`);
        }
        node.items = node.groupBy
          ? groupReleases(releases, node)
          : releases.map(r => releaseToItem(r, node));
      } catch (err) {
        // myst-listing renders node.error as an error admonition.
        node.error = String(err?.message ?? err);
      }
    }
  },
};

const plugin = {
  name: 'MyST Release Notes',
  directives: [releaseNotesDirective],
  transforms: [collectTransform],
};

export default plugin;
// Pure helpers exported for unit tests only.
export { parseTagVersion, mergeBodies };
