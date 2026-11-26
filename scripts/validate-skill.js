#!/usr/bin/env node

/**
 * Validate SKILL.md structure and frontmatter.
 *
 * The root SKILL.md is the canonical entrypoint and docs/SKILL.md is its
 * retained documentation copy. Both are validated, and the copy must not drift
 * from the root once copy-relative links are resolved. Neither file is ever
 * rewritten.
 */

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.join(__dirname, '..');
const SKILL_FILES = ['SKILL.md', 'docs/SKILL.md'];

/**
 * Parses and checks frontmatter under the decided grammar: LF line endings
 * only, frontmatter starting on physical line 1, a `name` of at least 3
 * characters and a double-quoted `description` of at least 50 characters.
 * CRLF files and unquoted or block-scalar descriptions are not accepted.
 */
class FrontmatterValidator {
  /** @returns {{name: string, description: string}} */
  validate(content) {
    // Frontmatter must start on physical line 1.
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!frontmatterMatch) {
      throw new Error('Missing YAML frontmatter in SKILL.md');
    }

    const frontmatter = frontmatterMatch[1];

    const nameMatch = frontmatter.match(/name:\s*(\S+)/);
    if (!nameMatch) {
      throw new Error('Missing "name" field in frontmatter');
    }

    const descriptionMatch = frontmatter.match(/description:\s*"(.+)"/s);
    if (!descriptionMatch) {
      throw new Error('Missing "description" field in frontmatter');
    }

    const name = nameMatch[1];
    const description = descriptionMatch[1];

    if (name.length < 3) {
      throw new Error('Skill name too short');
    }

    if (description.length < 50) {
      throw new Error('Skill description too short (should be at least 50 characters)');
    }

    return { name, description };
  }
}

/**
 * Compares two copies of the skill document. Relative paths that resolve to an
 * existing file are rewritten to repo-root-relative form first, so a link that
 * is correct from each copy's own folder does not count as drift. Everything
 * else must match exactly (line endings are not significant).
 */
class DriftComparator {
  constructor(exists = p => fs.existsSync(p), repoRoot = REPO_ROOT) {
    this.exists = exists;
    this.repoRoot = repoRoot;
  }

  normalize(content, relativeFile) {
    const dir = path.dirname(path.join(this.repoRoot, relativeFile));
    const resolve = target => {
      if (/^([a-z][a-z0-9+.-]*:|#|\/)/i.test(target)) return target;
      const [file, ...rest] = target.split('#');
      const absolute = path.resolve(dir, file);
      if (!file || !this.exists(absolute)) return target;
      return `<repo>/${path.relative(this.repoRoot, absolute).split(path.sep).join('/')}${rest.length ? '#' + rest.join('#') : ''}`;
    };

    return content
      .replace(/\r\n/g, '\n')
      .replace(/\]\(([^)\s]+)\)/g, (_, target) => `](${resolve(target)})`)
      .replace(/`([^`\s]+\.[A-Za-z0-9]+)`/g, (_, target) => `\`${resolve(target)}\``);
  }

  /**
   * A line is drift only when it differs both as written and after resolving
   * copy-relative paths, so identical text is never reported.
   * @returns {string[]} one message per differing line (empty when no drift)
   */
  compare(rootContent, docsContent) {
    const rawA = rootContent.replace(/\r\n/g, '\n').split('\n');
    const rawB = docsContent.replace(/\r\n/g, '\n').split('\n');
    const a = this.normalize(rootContent, 'SKILL.md').split('\n');
    const b = this.normalize(docsContent, 'docs/SKILL.md').split('\n');
    const diffs = [];
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
      if (rawA[i] !== rawB[i] && a[i] !== b[i]) {
        diffs.push(`Line ${i + 1}: SKILL.md has ${JSON.stringify(rawA[i])} but docs/SKILL.md has ${JSON.stringify(rawB[i])}`);
      }
    }
    return diffs;
  }
}

/** Validates both representations and returns the process exit code. */
function run({
  repoRoot = REPO_ROOT,
  readFile = p => fs.readFileSync(p, 'utf8'),
  validator = new FrontmatterValidator(),
  comparator = new DriftComparator(),
  log = console.log,
  error = console.error,
} = {}) {
  const contents = {};
  const failures = [];

  SKILL_FILES.forEach(file => {
    try {
      contents[file] = readFile(path.join(repoRoot, file));
      const { name, description } = validator.validate(contents[file]);
      log(`✅ ${file} validation passed`);
      log(`   Name: ${name}`);
      log(`   Description length: ${description.length} characters`);
    } catch (e) {
      failures.push(`${file}: ${e.message}`);
    }
  });

  if (contents[SKILL_FILES[0]] !== undefined && contents[SKILL_FILES[1]] !== undefined) {
    comparator.compare(contents[SKILL_FILES[0]], contents[SKILL_FILES[1]]).forEach(diff => {
      failures.push(`drift between SKILL.md and docs/SKILL.md: ${diff}`);
    });
  }

  if (failures.length > 0) {
    failures.forEach(message => error('❌ SKILL.md validation failed:', message));
    return 1;
  }
  return 0;
}

module.exports = { SKILL_FILES, FrontmatterValidator, DriftComparator, run };

if (require.main === module) {
  process.exitCode = run();
}
