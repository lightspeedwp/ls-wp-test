#!/usr/bin/env node

/**
 * Analyze coverage output and report gaps. Advisory only: it exits 0 when gaps
 * exist and 1 only when the report cannot be read or holds no file entries.
 * Enforcement belongs to the runner's coverage thresholds.
 *
 * Accepts either the Istanbul summary (coverage-summary.json, per-file metrics
 * plus a "total" entry) or the raw Istanbul map (coverage-final.json).
 *
 * Usage: node scripts/coverage-analyzer.js --coverage-report=.coverage/coverage-summary.json
 */

const fs = require('fs');

const DEFAULT_REPORT = './.coverage/coverage-summary.json';
const METRICS = ['lines', 'statements', 'functions', 'branches'];

/** Reads --coverage-report=, keeping everything after the first "=" intact. */
function parseReportPath(argv) {
  const arg = argv.find(a => a.startsWith('--coverage-report='));
  if (arg === undefined) return DEFAULT_REPORT;
  return arg.slice(arg.indexOf('=') + 1) || DEFAULT_REPORT;
}

const pct = (covered, total) => (total === 0 ? 100 : Math.round((covered / total) * 10000) / 100);

/** Converts raw Istanbul per-file data into summary-shaped metrics. */
function summarizeRaw(data) {
  const statements = Object.values(data.s);
  const functions = Object.values(data.f);
  const branches = Object.values(data.b).flat();
  const lineHits = new Map();
  Object.entries(data.statementMap).forEach(([id, loc]) => {
    const line = loc.start.line;
    lineHits.set(line, (lineHits.get(line) || 0) + (data.s[id] > 0 ? 1 : 0));
  });
  const metric = hits => ({ pct: pct(hits.filter(h => h > 0).length, hits.length) });
  return {
    lines: { pct: pct([...lineHits.values()].filter(h => h > 0).length, lineHits.size) },
    statements: metric(statements),
    functions: metric(functions),
    branches: metric(branches),
  };
}

const isRaw = data => data && typeof data.statementMap === 'object' && typeof data.s === 'object';

/** Normalizes a parsed report into [{file, metrics}], excluding the "total" entry. */
function normalize(coverage) {
  if (coverage === null || typeof coverage !== 'object' || Array.isArray(coverage)) {
    throw new Error('Coverage report must be a JSON object');
  }
  const files = Object.entries(coverage)
    .filter(([file]) => file !== 'total')
    .map(([file, data]) => {
      if (isRaw(data)) return { file, metrics: summarizeRaw(data) };
      if (data && typeof data === 'object' && METRICS.some(m => data[m] && typeof data[m].pct === 'number')) {
        return { file, metrics: data };
      }
      throw new Error(`Unrecognized coverage entry for ${file}`);
    });
  if (files.length === 0) {
    throw new Error('Coverage report contains no file entries');
  }
  return { files, total: coverage.total };
}

/** Prints the gap report and returns the process exit code. */
function run(argv, { readFile = p => fs.readFileSync(p, 'utf8'), log = console.log, error = console.error } = {}) {
  try {
    const { files, total } = normalize(JSON.parse(readFile(parseReportPath(argv))));

    log('\n Coverage Analysis\n');
    log('Files below 100%:\n');

    let allFiles100 = true;
    files.forEach(({ file, metrics }) => {
      const gaps = METRICS.filter(m => metrics[m] && metrics[m].pct < 100);
      if (gaps.length === 0) return;
      allFiles100 = false;
      log(`  ${file}`);
      METRICS.filter(m => metrics[m]).forEach(m => {
        const value = metrics[m].pct;
        log(`    ${m[0].toUpperCase()}${m.slice(1)}: ${value}%${value < 100 ? ` (gap: ${Math.round((100 - value) * 100) / 100}%)` : ''}`);
      });
      log('');
    });

    if (allFiles100) {
      log('✓ All files at 100% coverage\n');
    }
    if (total) {
      const summary = METRICS.filter(m => total[m] && typeof total[m].pct === 'number')
        .map(m => `${m} ${total[m].pct}%`)
        .join(', ');
      if (summary) log(`Total: ${summary}\n`);
    }
    return 0;
  } catch (e) {
    error('Error reading coverage report:', e.message);
    return 1;
  }
}

module.exports = { DEFAULT_REPORT, METRICS, parseReportPath, summarizeRaw, normalize, run };

if (require.main === module) {
  process.exitCode = run(process.argv);
}
