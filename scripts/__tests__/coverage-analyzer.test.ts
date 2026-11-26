import { describe, expect, it } from 'vitest';
import { DEFAULT_REPORT, normalize, parseReportPath, run, summarizeRaw } from '../coverage-analyzer.js';
import { Output } from './helpers';

const metric = (pct: number) => ({ pct });
const summaryEntry = (l: number, s = l, f = l, b = l) => ({
  lines: metric(l), statements: metric(s), functions: metric(f), branches: metric(b),
});
const rawEntry = (over: Record<string, unknown> = {}) => ({
  statementMap: { 0: { start: { line: 1 } }, 1: { start: { line: 2 } } },
  s: { 0: 1, 1: 0 },
  f: { 0: 1 },
  b: { 0: [1, 0] },
  ...over,
});
const analyse = (report: unknown, arg = '--coverage-report=r.json') => {
  const out = new Output();
  const reads: string[] = [];
  const code = run(['node', 's', arg], {
    readFile: p => (reads.push(p), typeof report === 'string' ? report : JSON.stringify(report)),
    ...out,
  });
  return { code, out, reads };
};

describe('coverage-analyzer', () => {
  it('defaults to the .coverage summary', () => {
    expect(parseReportPath(['node', 's'])).toBe('./.coverage/coverage-summary.json');
    expect(DEFAULT_REPORT).toContain('.coverage/');
  });

  it('preserves spaces and "=" in the report path', () => {
    expect(parseReportPath(['--coverage-report=my dir/a=b.json'])).toBe('my dir/a=b.json');
    expect(analyse({ f: summaryEntry(100) }, '--coverage-report=my dir/a=b.json').reads).toEqual(['my dir/a=b.json']);
  });

  it('falls back to the default for an empty value', () => {
    expect(parseReportPath(['--coverage-report='])).toBe(DEFAULT_REPORT);
  });

  it('reports all files at 100% and the total', () => {
    const { code, out } = analyse({ total: summaryEntry(100), 'a.js': summaryEntry(100) });
    expect(code).toBe(0);
    expect(out.stdout).toContain('✓ All files at 100% coverage');
    expect(out.stdout).toContain('Total: lines 100%');
  });

  it('never lists the "total" entry as a file', () => {
    const { out } = analyse({ total: summaryEntry(10), 'a.js': summaryEntry(100) });
    expect(out.stdout).not.toContain('  total');
    expect(out.stdout).toContain('All files at 100%');
  });

  it.each(['lines', 'statements', 'functions', 'branches'] as const)('reports a %s gap', gapMetric => {
    const entry = summaryEntry(100) as Record<string, { pct: number }>;
    entry[gapMetric] = metric(50);
    const { code, out } = analyse({ 'a.js': entry });
    expect(code).toBe(0);
    expect(out.stdout).toContain('  a.js');
    expect(out.stdout).toContain('(gap: 50%)');
    expect(out.stdout).not.toContain('All files at 100%');
  });

  it('handles summary entries that omit some metrics and totals without pct', () => {
    const { code, out } = analyse({ total: { lines: {} }, 'a.js': { lines: metric(90) } });
    expect(code).toBe(0);
    expect(out.stdout).toContain('Lines: 90%');
    expect(out.stdout).not.toContain('Total:');
  });

  it('analyses raw Istanbul data', () => {
    const { code, out } = analyse({ 'a.js': rawEntry() });
    expect(code).toBe(0);
    expect(out.stdout).toContain('Lines: 50% (gap: 50%)');
    expect(out.stdout).toContain('Statements: 50%');
    expect(out.stdout).toContain('Functions: 100%');
    expect(out.stdout).toContain('Branches: 50%');
  });

  it('computes 100% for raw entries with nothing to cover', () => {
    const m = summarizeRaw(rawEntry({ statementMap: {}, s: {}, f: {}, b: {} }));
    expect(m.lines.pct).toBe(100);
    expect(m.branches.pct).toBe(100);
  });

  it('counts a line as covered when any statement on it ran', () => {
    const m = summarizeRaw(rawEntry({ statementMap: { 0: { start: { line: 1 } }, 1: { start: { line: 1 } } }, s: { 0: 0, 1: 2 } }));
    expect(m.lines.pct).toBe(100);
  });

  it.each([
    ['malformed JSON', '{oops', /JSON|Expected|Unexpected/],
    ['an empty object', {}, /no file entries/],
    ['only a total entry', { total: summaryEntry(100) }, /no file entries/],
    ['a null payload', 'null', /must be a JSON object/],
    ['an array payload', [], /must be a JSON object/],
    ['an unrecognised entry', { 'a.js': { nope: true } }, /Unrecognized coverage entry for a\.js/],
    ['a null entry', { 'a.js': null }, /Unrecognized coverage entry/],
  ])('fails for %s', (_label, report, message) => {
    const { code, out } = analyse(report);
    expect(code).toBe(1);
    expect(out.stderr).toMatch(message);
    expect(out.stdout).not.toContain('All files at 100%');
  });

  it('fails when the report cannot be read', () => {
    const out = new Output();
    const code = run(['--coverage-report=missing.json'], {
      readFile: () => { throw new Error('ENOENT'); },
      ...out,
    });
    expect(code).toBe(1);
    expect(out.stderr).toContain('Error reading coverage report: ENOENT');
  });

  it('normalize returns the total alongside files', () => {
    expect(normalize({ total: summaryEntry(1), 'a.js': summaryEntry(1) }).files).toHaveLength(1);
  });
});
