import { execSync } from 'child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import path from 'path';

/**
 * Parse the :after: option into a Date object.
 * Supports: YYYY-MM-DD or -Nw (weeks) or -Nm (months)
 */
function parseAfterDate(afterStr) {
  if (!afterStr) return null;

  // Relative format: -3m, -2w, etc.
  const relativeMatch = afterStr.match(/^-(\d+)([wm])$/);
  if (relativeMatch) {
    const amount = parseInt(relativeMatch[1], 10);
    const unit = relativeMatch[2];
    const date = new Date();
    if (unit === 'w') {
      date.setDate(date.getDate() - amount * 7);
    } else if (unit === 'm') {
      date.setMonth(date.getMonth() - amount);
    }
    return date;
  }

  // Absolute format: YYYY-MM-DD
  const parsed = new Date(afterStr);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }

  return null;
}

/**
 * Fetch releases from GitHub API using gh CLI.
 * Returns cached data if available.
 */
function fetchReleases(repo, cacheDir) {
  const cacheFile = path.join(cacheDir, 'cache.json');

  // Check cache
  if (existsSync(cacheFile)) {
    try {
      const cached = JSON.parse(readFileSync(cacheFile, 'utf8'));
      if (cached[repo]) {
        return cached[repo];
      }
    } catch {
      // Cache read failed, fetch fresh
    }
  }

  // Fetch from GitHub
  try {
    const result = execSync(
      `gh api repos/${repo}/releases --paginate`,
      { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 }
    );
    const releases = JSON.parse(result);

    // Save to cache
    mkdirSync(cacheDir, { recursive: true });
    let cacheData = {};
    if (existsSync(cacheFile)) {
      try {
        cacheData = JSON.parse(readFileSync(cacheFile, 'utf8'));
      } catch {
        // Start fresh
      }
    }
    cacheData[repo] = releases;
    writeFileSync(cacheFile, JSON.stringify(cacheData, null, 2));

    return releases;
  } catch (err) {
    console.error(`myst-release-notes: Failed to fetch releases for ${repo}:`, err.message);
    return [];
  }
}

/**
 * Filter out sections matching the skip-sections regex.
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
 * Filter out list items whose text matches the skip-lines regex.
 */
function filterLines(children, skipRegex) {
  if (!skipRegex || !children) return children;
  const regex = new RegExp(skipRegex, 'i');

  return children.map(node => {
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

      // Check if section has meaningful content
      const hasContent = sectionContent.some(n => {
        if (n.type === 'list' && n.children && n.children.length > 0) return true;
        if (n.type === 'paragraph') return true;
        if (n.type === 'code') return true;
        return false;
      });

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
 * Demote all headings to bold paragraphs within parsed content.
 */
function demoteHeadings(children) {
  if (!children) return children;

  return children.map(node => {
    if (node.type === 'heading') {
      // Convert heading to a bold paragraph
      return {
        type: 'paragraph',
        children: [
          {
            type: 'strong',
            children: node.children || [{ type: 'text', value: '' }],
          },
        ],
      };
    }
    // Recurse into children
    if (node.children) {
      return { ...node, children: demoteHeadings(node.children) };
    }
    return node;
  });
}

/**
 * Format a date as YYYY-MM-DD
 */
function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toISOString().split('T')[0];
}

const releaseNotesDirective = {
  name: 'release-notes',
  doc: 'Display consolidated release notes from a GitHub repository.',
  arg: {
    type: String,
    doc: 'GitHub repository in org/repo format',
  },
  options: {
    after: {
      type: String,
      doc: 'Only show releases after this date (YYYY-MM-DD or -Nw/-Nm for relative)',
    },
    'skip-sections': {
      type: String,
      doc: 'Regex pattern to filter out sections from release notes',
    },
    'skip-lines': {
      type: String,
      doc: 'Regex pattern to filter out lines from release notes',
    },
    'remove-empty-sections': {
      type: Boolean,
      doc: 'Remove sections that are empty after filtering',
    },
  },
  run(data, vfile, ctx) {
    const repo = data.arg;
    if (!repo || !repo.includes('/')) {
      return [{
        type: 'paragraph',
        children: [{ type: 'text', value: 'Error: Please provide a repository in org/repo format.' }],
      }];
    }

    // Determine cache directory
    const rootDir = vfile?.cwd || process.cwd();
    const cacheDir = path.join(rootDir, '_build', 'myst-releases');

    // Fetch releases
    const releases = fetchReleases(repo, cacheDir);
    if (!releases || releases.length === 0) {
      return [{
        type: 'paragraph',
        children: [{ type: 'text', value: `No releases found for ${repo}.` }],
      }];
    }

    // Filter by date
    const afterDate = parseAfterDate(data.options?.after);
    const filteredReleases = afterDate
      ? releases.filter(r => new Date(r.published_at) >= afterDate)
      : releases;

    // Sort by date descending (newest first)
    filteredReleases.sort((a, b) => new Date(b.published_at) - new Date(a.published_at));

    const skipSections = data.options?.['skip-sections'];
    const skipLines = data.options?.['skip-lines'];
    const removeEmpty = data.options?.['remove-empty-sections'];
    const nodes = [];

    for (const release of filteredReleases) {
      const tagName = release.tag_name || '';
      const releaseName = release.name || tagName;
      const releaseDate = formatDate(release.published_at);
      const releaseUrl = release.html_url;
      const body = release.body || '';

      // Create title node as H2
      nodes.push({
        type: 'heading',
        depth: 2,
        children: [{ type: 'text', value: releaseName }],
      });

      // Add date and link line
      nodes.push({
        type: 'paragraph',
        children: [
          { type: 'text', value: `${releaseDate} | ` },
          {
            type: 'link',
            url: releaseUrl,
            children: [{ type: 'text', value: 'View release' }],
          },
        ],
      });

      // Parse and process the release body
      if (body.trim()) {
        const parsed = ctx.parseMyst(body);
        let bodyChildren = parsed?.children || [];

        // Filter out skipped sections
        bodyChildren = filterSections(bodyChildren, skipSections);

        // Filter out skipped lines
        bodyChildren = filterLines(bodyChildren, skipLines);

        // Remove empty sections if requested
        if (removeEmpty) {
          bodyChildren = removeEmptySections(bodyChildren);
        }

        // Demote all headings to bold
        bodyChildren = demoteHeadings(bodyChildren);

        nodes.push(...bodyChildren);
      }

      // Add a separator between releases
      nodes.push({
        type: 'thematicBreak',
      });
    }

    // Remove trailing thematic break
    if (nodes.length > 0 && nodes[nodes.length - 1].type === 'thematicBreak') {
      nodes.pop();
    }

    return nodes;
  },
};

const plugin = {
  name: 'MyST Release Notes',
  directives: [releaseNotesDirective],
};

export default plugin;
