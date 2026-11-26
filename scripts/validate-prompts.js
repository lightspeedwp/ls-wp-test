#!/usr/bin/env node

/**
 * Validate prompts/ folder structure and files
 */

const fs = require('fs');
const path = require('path');

/** Checks that the prompts folder holds markdown files and returns the process exit code. */
function run({
  promptsDir = path.join(__dirname, '../prompts'),
  fileSystem = fs,
  log = console.log,
  error = console.error,
} = {}) {
  try {
    const markdownFiles = fileSystem.readdirSync(promptsDir).filter(f => f.endsWith('.md'));

    if (markdownFiles.length === 0) {
      throw new Error('No markdown files found in prompts/');
    }

    // Check each prompt file
    let totalLines = 0;
    markdownFiles.forEach(file => {
      totalLines += fileSystem.readFileSync(path.join(promptsDir, file), 'utf8').split('\n').length;
    });

    log('✅ Prompts validation passed');
    log(`   Files: ${markdownFiles.length}`);
    log(`   Total lines: ${totalLines}`);
    return 0;
  } catch (e) {
    error('❌ Prompts validation failed:', e.message);
    return 1;
  }
}

module.exports = { run };

if (require.main === module) {
  process.exitCode = run();
}
