import { afterEach, describe, expect, it } from 'vitest';
import { findFiles, run as runJson } from '../validate-json.js';
import { findYamlFiles, run as runYaml, validateYaml } from '../validate-yaml.js';
import { run as runPrompts } from '../validate-prompts.js';
import { run as runReferences } from '../validate-references.js';
import { parseThemeJsonPath, run as runTheme } from '../theme-utils-validator.js';
import { Output, TempDir } from './helpers';

const dirs: TempDir[] = [];
const temp = (files: Record<string, string>) => {
  const dir = new TempDir();
  dirs.push(dir);
  Object.entries(files).forEach(([name, content]) => dir.write(name, content));
  return dir.root;
};
afterEach(() => dirs.splice(0).forEach(d => d.remove()));

describe('validate-json', () => {
  it('passes valid JSON and skips excluded folders', () => {
    const out = new Output();
    const repoRoot = temp({ 'a.json': '{}', 'sub/b.json': '[]', 'node_modules/bad.json': '{', 'note.txt': 'x' });
    expect(runJson({ repoRoot, ...out })).toBe(0);
    expect(out.stdout).toContain('JSON validation passed (2 files)');
  });

  it('fails on malformed JSON', () => {
    const out = new Output();
    expect(runJson({ repoRoot: temp({ 'bad.json': '{' }), ...out })).toBe(1);
    expect(out.stderr).toContain('❌ bad.json');
  });

  it('fails when the directory cannot be read', () => {
    const out = new Output();
    expect(runJson({ repoRoot: '/nonexistent/ls-wp-test', ...out })).toBe(1);
    expect(out.stderr).toContain('JSON validation error');
  });

  it('finds files by predicate', () => {
    expect(findFiles(temp({ 'a.md': '', 'b/c.md': '' }), (n: string) => n.endsWith('.md'))).toHaveLength(2);
  });

  it('runs against the real repository by default', () => {
    expect(runJson({ ...new Output() })).toBe(0);
  });
});

describe('validate-yaml', () => {
  it('flags tabs and unusual characters but allows accented text', () => {
    expect(() => validateYaml('a:\n\tb: 1')).toThrow(/Line 2: Tabs/);
    expect(() => validateYaml('a: ✅')).toThrow(/Line 1: Invalid character/);
    expect(() => validateYaml('a: café')).not.toThrow();
    expect(() => validateYaml('a: 1\nb: 2')).not.toThrow();
  });

  it('passes screened files and reports failures', () => {
    const ok = new Output();
    expect(runYaml({ repoRoot: temp({ 'a.yml': 'a: 1', 'b.yaml': 'b: 2' }), ...ok })).toBe(0);
    expect(ok.stdout).toMatch(/passed \(2 files\)/);

    const bad = new Output();
    expect(runYaml({ repoRoot: temp({ 'a.yml': '\ta: 1' }), ...bad })).toBe(1);
    expect(bad.stderr).toContain('❌ a.yml');
  });

  it('fails when the directory cannot be read', () => {
    const out = new Output();
    expect(runYaml({ repoRoot: '/nonexistent/ls-wp-test', ...out })).toBe(1);
    expect(out.stderr).toMatch(/YAML (validation|screening) error/);
  });

  it('finds only YAML files', () => {
    expect(findYamlFiles(temp({ 'a.yml': '', 'b.json': '' }), [])).toHaveLength(1);
  });

  it('runs against the real repository by default', () => {
    expect([0, 1]).toContain(runYaml({ ...new Output() }));
  });
});

describe.each([
  ['prompts', runPrompts, 'promptsDir'],
  ['references', runReferences, 'referencesDir'],
] as const)('validate-%s', (label, run, option) => {
  it('counts markdown files and lines', () => {
    const out = new Output();
    expect(run({ [option]: temp({ 'a.md': '1\n2', 'b.md': '1', 'c.txt': 'x' }), ...out } as never)).toBe(0);
    expect(out.stdout).toContain('Files: 2');
    expect(out.stdout).toContain('Total lines: 3');
  });

  it('fails without markdown files', () => {
    const out = new Output();
    expect(run({ [option]: temp({ 'c.txt': 'x' }), ...out } as never)).toBe(1);
    expect(out.stderr).toContain(`No markdown files found in ${label}/`);
  });

  it('fails when the folder is missing', () => {
    const out = new Output();
    expect(run({ [option]: '/nonexistent/ls-wp-test', ...out } as never)).toBe(1);
  });

  it('runs against the real repository by default', () => {
    expect(run({ ...new Output() } as never)).toBe(0);
  });
});

describe('theme-utils-validator', () => {
  const tokens = {
    version: 3,
    styles: {},
    settings: {
      color: { palette: [{}] },
      typography: { fontSizes: [{}, {}] },
      spacing: { spacingSizes: [{}] },
    },
  };
  const validate = (theme: unknown, argv = ['node', 's', '--theme-json=t.json']) => {
    const out = new Output();
    const code = runTheme(argv, { readFile: () => (typeof theme === 'string' ? theme : JSON.stringify(theme)), ...out });
    return { code, out };
  };

  it('parses --theme-json= with a default', () => {
    expect(parseThemeJsonPath(['node', 's'])).toBe('./theme.json');
    expect(parseThemeJsonPath(['node', 's', '--theme-json=a.json'])).toBe('a.json');
  });

  it('passes a theme with all three token groups', () => {
    const { code, out } = validate(tokens);
    expect(code).toBe(0);
    expect(out.stdout).toContain('Color palette: 1 colors');
    expect(out.stdout).toContain('Typography: 2 sizes');
    expect(out.stdout).toContain('Spacing: 1 scales');
    expect(out.stdout).toContain('✓ Spacing: 1 scales');
    expect(out.stdout).not.toContain('⚠');
  });

  it('warns about missing structure and fails without tokens', () => {
    const { code, out } = validate({});
    expect(code).toBe(1);
    expect(out.stdout).toContain('⚠ Missing version field');
    expect(out.stdout).toContain('⚠ Missing settings');
    expect(out.stdout).toContain('⚠ Missing styles');
    expect(out.stdout).not.toContain('✓ Color palette');
  });

  it('fails on malformed JSON and unreadable files', () => {
    expect(validate('{nope').code).toBe(1);
    const out = new Output();
    expect(runTheme(['node', 's'], { readFile: () => { throw new Error('ENOENT'); }, ...out })).toBe(1);
    expect(out.stderr).toContain('✗ Error: ENOENT');
  });
});
