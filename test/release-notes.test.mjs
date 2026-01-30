import { readFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { describe, test, expect, beforeAll } from 'vitest';
import path from 'path';

const DOCS_DIR = path.join(import.meta.dirname, '../docs');
const BUILD_DIR = path.join(DOCS_DIR, '_build/site/content');
const TEST_FILE = path.join(BUILD_DIR, 'releases.json');

// Helper to extract all text from an AST node recursively
function getAllText(node) {
  if (!node) return '';
  if (typeof node === 'string') return node;
  if (node.value) return node.value;
  if (node.children) return node.children.map(getAllText).join('');
  return '';
}

// Helper to find all nodes of a given type
function findAll(node, type, results = []) {
  if (!node) return results;
  if (node.type === type) results.push(node);
  if (node.children) {
    for (const child of node.children) {
      findAll(child, type, results);
    }
  }
  return results;
}

describe('release-notes plugin', () => {
  beforeAll(() => {
    // Build docs if not already built
    if (!existsSync(TEST_FILE)) {
      execSync('cd docs && myst build --html', {
        cwd: path.join(DOCS_DIR, '..'),
        stdio: 'inherit'
      });
    }
  });

  test('releases.json builds successfully', () => {
    expect(existsSync(TEST_FILE)).toBe(true);
    const content = JSON.parse(readFileSync(TEST_FILE, 'utf8'));
    expect(content.mdast).toBeDefined();
  });

  test('has release content', () => {
    const content = JSON.parse(readFileSync(TEST_FILE, 'utf8'));
    const fullText = getAllText(content.mdast);

    // Has expected release note sections (demoted to bold)
    expect(fullText).toMatch(/Enhancements/i);
    expect(fullText).toMatch(/Bug/i);
  });

  test('skip-sections filters out contributors', () => {
    const content = JSON.parse(readFileSync(TEST_FILE, 'utf8'));
    const fullText = getAllText(content.mdast);

    // Count occurrences - should only appear in the directive example, not in rendered content
    const matches = fullText.match(/Contributors to this release/g) || [];
    // At most 1 occurrence (from the skip-sections option shown in directive)
    expect(matches.length).toBeLessThanOrEqual(1);
  });

  test('no deep headings in body content', () => {
    const content = JSON.parse(readFileSync(TEST_FILE, 'utf8'));

    // No headings beyond H2 (release titles) - body headings should be demoted to bold
    const headings = findAll(content.mdast, 'heading');
    const deepHeadings = headings.filter(h => h.depth > 2);
    expect(deepHeadings).toHaveLength(0);
  });

  test('skip-lines filters out release PRs', () => {
    const content = JSON.parse(readFileSync(TEST_FILE, 'utf8'));
    const fullText = getAllText(content.mdast);

    // Should not contain "🚀 Release" lines
    expect(fullText).not.toMatch(/🚀 Release/);
  });

  test('remove-empty-sections removes Other merged PRs', () => {
    const content = JSON.parse(readFileSync(TEST_FILE, 'utf8'));
    const fullText = getAllText(content.mdast);

    // "Other merged PRs" section should be removed because it only contains release PRs
    // which are filtered out by skip-lines
    expect(fullText).not.toMatch(/Other merged PRs/i);
  });
});
