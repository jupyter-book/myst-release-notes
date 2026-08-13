import { readFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { describe, test, expect, beforeAll } from 'vitest';
import path from 'path';

const DOCS_DIR = path.join(import.meta.dirname, '../docs');
const TEST_FILE = path.join(DOCS_DIR, '_build/site/content/mystmd.json');

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
    if (!existsSync(TEST_FILE)) {
      execSync('myst build --html', { cwd: DOCS_DIR, stdio: 'inherit' });
    }
    fullText = getAllText(JSON.parse(readFileSync(TEST_FILE, 'utf8')).mdast);
  });

  test('has release content', () => {
    expect(fullText).toMatch(/Enhancements/i);
    expect(fullText).toMatch(/Bug/i);
  });

  test('skip-sections filters out contributors', () => {
    // At most 1 occurrence (from the option shown in the source dropdown),
    // none from rendered release bodies
    const matches = fullText.match(/Contributors to this release/g) || [];
    expect(matches.length).toBeLessThanOrEqual(1);
  });

  test('skip-lines filters out release PRs', () => {
    const matches = fullText.match(/🚀 Release/g) || [];
    expect(matches.length).toBeLessThanOrEqual(1);
  });

  test('remove-empty-sections removes Other merged PRs', () => {
    // That section only contains release PRs, which skip-lines removed
    expect(fullText).not.toMatch(/Other merged PRs/i);
  });
});
