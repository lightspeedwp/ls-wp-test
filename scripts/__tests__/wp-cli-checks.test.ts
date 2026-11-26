import { afterEach, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { REQUIRED_FILES, ThemeChecker, parseThemePath, run } from '../wp-cli-checks.js';
import { Output, TempDir } from './helpers';

const dirs: TempDir[] = [];
const theme = (files: Record<string, string>) => {
  const dir = new TempDir();
  dirs.push(dir);
  Object.entries(files).forEach(([name, content]) => dir.write(name, content));
  return dir;
};
const complete = { 'theme.json': '{"version":3}', 'style.css': '', 'functions.php': '', 'index.php': '' };
afterEach(() => dirs.splice(0).forEach(d => d.remove()));

describe('wp-cli-checks', () => {
  it('keeps the required-file contract', () => {
    expect(REQUIRED_FILES).toEqual(['theme.json', 'style.css', 'functions.php', 'index.php']);
  });

  it('parses --theme= and defaults to the current directory', () => {
    expect(parseThemePath(['node', 's', '--theme=/a/b'])).toBe('/a/b');
    expect(parseThemePath(['node', 's'])).toBe('./');
  });

  it('succeeds for a complete theme', () => {
    const out = new Output();
    expect(run(['--theme=' + theme(complete).root], out)).toBe(0);
    expect(out.stdout).toContain('✓ All required files present');
    expect(out.stdout).toContain('Theme checks completed: 2 passed, 0 failed');
    expect(out.stdout).toContain('✓ Theme validation passed');
  });

  it.each(Object.keys(complete))('fails when %s is missing', missing => {
    const files = { ...complete } as Record<string, string>;
    delete files[missing];
    const out = new Output();
    expect(run(['--theme=' + theme(files).root], out)).toBe(1);
    expect(out.stdout).toContain(`✗ Missing required files: ${missing}`);
    expect(out.stdout).toContain('✗ Theme validation failed');
    expect(out.stdout).not.toContain('✓ Theme validation passed');
  });

  it('fails for malformed theme.json while other files are present', () => {
    const out = new Output();
    expect(run(['--theme=' + theme({ ...complete, 'theme.json': '{nope' }).root], out)).toBe(1);
    expect(out.stdout).toContain('✗ theme.json invalid:');
    expect(out.stdout).toContain('1 passed, 1 failed');
  });

  it('fails for unreadable theme.json (a directory)', () => {
    const { 'theme.json': _unused, ...rest } = complete;
    const dir = theme({ ...rest, 'theme.json/inner': 'x' });
    const out = new Output();
    expect(run(['--theme=' + dir.root], out)).toBe(1);
    expect(out.stdout).toContain('✗ theme.json invalid:');
  });

  it('fails for a nonexistent directory without an all-pass message', () => {
    const out = new Output();
    expect(run(['--theme=/nonexistent/ls-wp-test-dir'], out)).toBe(1);
    expect(out.stdout).toContain('0 passed, 2 failed');
    expect(out.stdout).not.toMatch(/✓ Theme validation (passed|complete)/);
  });

  it('does not modify the checked theme', () => {
    const dir = theme(complete);
    const before = JSON.stringify(new ThemeChecker().check(dir.root));
    run(['--theme=' + dir.root], new Output());
    expect(JSON.stringify(new ThemeChecker().check(dir.root))).toBe(before);
  });

  it('uses real process status when run as a CLI (isolated env, bounded)', () => {
    const script = join(__dirname, '..', 'wp-cli-checks.js');
    const run1 = (path: string) =>
      spawnSync(process.execPath, [script, `--theme=${path}`], { env: { PATH: '' }, timeout: 20000, encoding: 'utf8' });
    expect(run1(theme(complete).root).status).toBe(0);
    expect(run1('/nonexistent/ls-wp-test-dir').status).toBe(1);
  }, 60000);
});
