#!/usr/bin/env node

/**
 * Validate references/ folder structure and files
 */

const fs = require('fs');
const path = require('path');

/** Checks that a folder holds markdown files and returns the process exit code. */
function run({
  referencesDir = path.join(__dirname, '../references'),
  fileSystem = fs,
  log = console.log,
  error = console.error,
} = {}) {
  try {
    const markdownFiles = fileSystem.readdirSync(referencesDir).filter(f => f.endsWith('.md'));

    if (markdownFiles.length === 0) {
      throw new Error('No markdown files found in references/');
    }

    // Check each reference file
    let totalLines = 0;
    markdownFiles.forEach(file => {
      totalLines += fileSystem.readFileSync(path.join(referencesDir, file), 'utf8').split('\n').length;
    });

    log('✅ References validation passed');
    log(`   Files: ${markdownFiles.length}`);
    log(`   Total lines: ${totalLines}`);
    log(`   Files: ${markdownFiles.join(', ')}`);
    return 0;
  } catch (e) {
    error('❌ References validation failed:', e.message);
    return 1;
  }
}

module.exports = { run };

if (require.main === module) {
  process.exitCode = run();
}
