import { describe, expect, it } from 'vitest';
import { DriftComparator, FrontmatterValidator, SKILL_FILES, run } from '../validate-skill.js';
import { Output } from './helpers';

const description = 'x'.repeat(60);
const skill = (name = 'test', body = 'Body') => `---\nname: ${name}\ndescription: "${description}"\n---\n${body}\n`;
const validator = new FrontmatterValidator();
const exists = (...paths: string[]) => (p: string) => paths.includes(p);

describe('FrontmatterValidator', () => {
  it('accepts valid frontmatter', () => {
    expect(validator.validate(skill())).toEqual({ name: 'test', description });
  });

  it.each([
    ['no frontmatter', 'Body', /Missing YAML frontmatter/],
    ['frontmatter not on line 1', '\n' + skill(), /Missing YAML frontmatter/],
    ['no name', `---\ndescription: "${description}"\n---\n`, /Missing "name"/],
    ['no description', '---\nname: test\n---\n', /Missing "description"/],
    ['empty description', '---\nname: test\ndescription: ""\n---\n', /Missing "description"/],
    ['CRLF line endings (grammar is LF only)', skill().replace(/\n/g, '\r\n'), /Missing YAML frontmatter/],
    ['an unquoted description (grammar is double-quoted only)', `---\nname: test\ndescription: ${description}\n---\n`, /Missing "description"/],
    ['short name', skill('ab'), /name too short/],
    ['short description', '---\nname: test\ndescription: "short"\n---\n', /description too short/],
  ])('rejects %s', (_label, content, message) => {
    expect(() => validator.validate(content)).toThrow(message);
  });
});

describe('DriftComparator', () => {
  const comparator = new DriftComparator(exists('/r/docs/JEST.md', '/r/references/a.md'), '/r');

  it('reports no drift for identical copies, even with unresolvable links', () => {
    expect(comparator.compare('Read `docs/GONE.md`', 'Read `docs/GONE.md`')).toEqual([]);
  });

  it('accepts copy-relative backtick and markdown links', () => {
    const root = 'Read `docs/JEST.md` and [a](references/a.md#x)';
    const docs = 'Read `JEST.md` and [a](../references/a.md#x)';
    expect(comparator.compare(root, docs)).toEqual([]);
  });

  it('ignores line-ending differences', () => {
    expect(comparator.compare('a\nb', 'a\r\nb')).toEqual([]);
  });

  it('leaves URLs, anchors and absolute paths alone', () => {
    const text = '[u](https://x.y/z) [a](#top) [p](/abs/f.md) [e](#)';
    expect(comparator.compare(text, text.replace('#top', '#other'))).toHaveLength(1);
  });

  it('reports substantive drift with line numbers', () => {
    const diffs = comparator.compare('one\ntwo', 'one\nTWO\nthree');
    expect(diffs).toHaveLength(2);
    expect(diffs[0]).toContain('Line 2');
    expect(diffs[1]).toContain('Line 3');
  });

  it('reports a link whose target differs after resolution', () => {
    expect(comparator.compare('`docs/JEST.md`', '`references/a.md`')).toHaveLength(1);
  });

  it('uses the filesystem by default', () => {
    expect(new DriftComparator().compare('same', 'same')).toEqual([]);
  });
});

const runWith = (files: Record<string, string | Error>, comparator = new DriftComparator(() => false, '/r')) => {
  const out = new Output();
  const reads: string[] = [];
  const code = run({
    repoRoot: '/r',
    readFile: p => {
      reads.push(p);
      const value = files[p.replace('/r/', '')];
      if (value instanceof Error) throw value;
      if (value === undefined) throw new Error('ENOENT');
      return value;
    },
    comparator,
    ...out,
  });
  return { code, out, reads };
};

describe('run', () => {
  it('validates both the root and docs representation', () => {
    const { code, reads } = runWith({ 'SKILL.md': skill(), 'docs/SKILL.md': skill() });
    expect(code).toBe(0);
    expect(reads).toEqual(SKILL_FILES.map(f => '/r/' + f));
  });

  it('detects an invalid root with a valid docs copy', () => {
    const { code, out } = runWith({ 'SKILL.md': 'Body', 'docs/SKILL.md': skill() });
    expect(code).toBe(1);
    expect(out.stderr).toContain('SKILL.md: Missing YAML frontmatter');
  });

  it('detects a valid root with an invalid docs copy', () => {
    const { code, out } = runWith({ 'SKILL.md': skill(), 'docs/SKILL.md': skill('ab') });
    expect(code).toBe(1);
    expect(out.stderr).toContain('docs/SKILL.md: Skill name too short');
  });

  it('reports drift between otherwise valid copies', () => {
    const { code, out } = runWith({ 'SKILL.md': skill(), 'docs/SKILL.md': skill('test', 'Changed') });
    expect(code).toBe(1);
    expect(out.stderr).toContain('drift between SKILL.md and docs/SKILL.md');
  });

  it('fails when a file cannot be read and skips the drift comparison', () => {
    const { code, out } = runWith({ 'SKILL.md': skill(), 'docs/SKILL.md': new Error('boom') });
    expect(code).toBe(1);
    expect(out.stderr).toContain('docs/SKILL.md: boom');
    expect(out.stderr).not.toContain('drift');
  });

  it('runs against the real repository by default', () => {
    expect(run({ ...new Output() })).toBe(0);
  });
});
