#!/usr/bin/env node

/**
 * Validate all JSON files in the repository
 */

const fs = require('fs');
const path = require('path');

/** Recursively lists files under a directory whose names match a predicate. */
function findFiles(dir, matches, exclude = [], fileSystem = fs) {
  let files = [];

  fileSystem.readdirSync(dir).forEach(item => {
    const fullPath = path.join(dir, item);

    // Skip excluded directories
    if (exclude.some(ex => fullPath.includes(ex))) {
      return;
    }

    if (fileSystem.statSync(fullPath).isDirectory()) {
      files = files.concat(findFiles(fullPath, matches, exclude, fileSystem));
    } else if (matches(item)) {
      files.push(fullPath);
    }
  });

  return files;
}

const findJsonFiles = (dir, exclude, fileSystem) =>
  findFiles(dir, name => name.endsWith('.json'), exclude, fileSystem);

/** Validates every JSON file under repoRoot and returns the process exit code. */
function run({ repoRoot = path.join(__dirname, '..'), fileSystem = fs, log = console.log, error = console.error } = {}) {
  try {
    const jsonFiles = findJsonFiles(repoRoot, ['node_modules', '.git'], fileSystem);
    let allValid = true;

    jsonFiles.forEach(file => {
      try {
        JSON.parse(fileSystem.readFileSync(file, 'utf8'));
        log(`✅ ${path.relative(repoRoot, file)}`);
      } catch (e) {
        error(`❌ ${path.relative(repoRoot, file)}: ${e.message}`);
        allValid = false;
      }
    });

    if (!allValid) {
      return 1;
    }

    log(`\n✅ JSON validation passed (${jsonFiles.length} files)`);
    return 0;
  } catch (e) {
    error('❌ JSON validation error:', e.message);
    return 1;
  }
}

module.exports = { findFiles, findJsonFiles, run };

if (require.main === module) {
  process.exitCode = run();
}
