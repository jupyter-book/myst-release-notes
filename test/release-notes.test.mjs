import { readFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { describe, test, expect, beforeAll } from 'vitest';
import path from 'path';
import { parseTagVersion, mergeBodies } from '../src/index.mjs';

const DOCS_DIR = path.join(import.meta.dirname, '../docs');
const TEST_FILE = path.join(DOCS_DIR, '_build/site/content/mystmd.json');
const LISTING_FILE = path.join(DOCS_DIR, '_build/site/content/myst-listing.json');

// Helper to extract all text from an AST node recursively
function getAllText(node) {
  if (!node) return '';
  if (typeof node === 'string') return node;
  if (node.value) return node.value;
  if (node.children) return node.children.map(getAllText).join('');
  return '';
}

describe('release-notes plugin', () => {
  let fullText;

  beforeAll(() => {
    // Build docs if not already built
    if (!existsSync(TEST_FILE) || !existsSync(LISTING_FILE)) {
      execSync('myst build --html', { cwd: DOCS_DIR, stdio: 'inherit' });
    }
    fullText = getAllText(JSON.parse(readFileSync(TEST_FILE, 'utf8')).mdast);
  });

  test('has release content', () => {
    expect(fullText).toMatch(/Enhancements/i);
    expect(fullText).toMatch(/Bug/i);
  });

  test('skip filters out contributor sections', () => {
    // At most 2 occurrences (the option shown in the two source dropdowns),
    // none from rendered release bodies
    const matches = fullText.match(/Contributors to this release/g) || [];
    expect(matches.length).toBeLessThanOrEqual(2);
  });

  test('skip filters out release PR lines', () => {
    const matches = fullText.match(/🚀 Release/g) || [];
    expect(matches.length).toBeLessThanOrEqual(2);
  });

  test('empty sections are removed by default', () => {
    // That section only contains release PRs, which skip removed
    expect(fullText).not.toMatch(/Other merged PRs/i);
  });

  test('group-by rolls patch releases up into one entry', () => {
    const listingText = getAllText(JSON.parse(readFileSync(LISTING_FILE, 'utf8')).mdast);
    expect(listingText).toMatch(/v0\.1\.x/);
    expect(listingText).toMatch(/Releases:/);
  });
});

describe('group-by helpers', () => {
  test('parseTagVersion handles plain, prefixed, and non-semver tags', () => {
    expect(parseTagVersion('v0.1.12')).toEqual({ prefix: 'v', major: '0', minor: '1' });
    expect(parseTagVersion('mystmd@1.10.1')).toEqual({ prefix: 'mystmd@', major: '1', minor: '10' });
    expect(parseTagVersion('not-a-version')).toBeNull();
  });

  test('mergeBodies merges same-heading sections and fuses lists', () => {
    const heading = text => ({ type: 'heading', depth: 2, children: [{ type: 'text', value: text }] });
    const list = text => ({
      type: 'list',
      ordered: false,
      children: [{ type: 'listItem', children: [{ type: 'text', value: text }] }],
    });
    const intro = { type: 'paragraph', children: [{ type: 'text', value: 'intro' }] };
    const merged = mergeBodies([
      [heading('Bugs fixed'), list('newer fix')],
      [intro, heading('Bugs fixed'), list('older fix')],
    ]);
    // Preamble paragraph, then one "Bugs fixed" heading with one fused list
    expect(merged.map(n => n.type)).toEqual(['paragraph', 'heading', 'list']);
    expect(merged[2].children).toHaveLength(2);
  });
});
