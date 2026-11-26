#!/usr/bin/env node

/**
 * Validate YAML files in the repository
 */

const fs = require('fs');
const path = require('path');
const { findFiles } = require('./validate-json');

const findYamlFiles = (dir, exclude, fileSystem) =>
  findFiles(dir, name => name.endsWith('.yml') || name.endsWith('.yaml'), exclude, fileSystem);

function validateYaml(content) {
  // Simple YAML validation - check for common issues
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check for valid indentation
    if (line.match(/^\t/)) {
      throw new Error(`Line ${i + 1}: Tabs not allowed in YAML (use spaces)`);
    }

    // Check for invalid characters
    if (line.match(/[^\x20-\x7E\n\r\t]/)) {
      // Allow some special characters but flag suspicious ones
      if (line.match(/[^\x20-\x7E\n\r\tÀ-ſ]/)) {
        throw new Error(`Line ${i + 1}: Invalid character detected`);
      }
    }
  }
}

/** Screens every YAML file under repoRoot and returns the process exit code. */
function run({ repoRoot = path.join(__dirname, '..'), fileSystem = fs, log = console.log, error = console.error } = {}) {
  try {
    const yamlFiles = findYamlFiles(repoRoot, ['node_modules', '.git'], fileSystem);
    let allValid = true;

    yamlFiles.forEach(file => {
      try {
        validateYaml(fileSystem.readFileSync(file, 'utf8'));
        log(`✅ ${path.relative(repoRoot, file)}`);
      } catch (e) {
        error(`❌ ${path.relative(repoRoot, file)}: ${e.message}`);
        allValid = false;
      }
    });

    if (!allValid) {
      return 1;
    }

    log(`\n✅ YAML validation passed (${yamlFiles.length} files)`);
    return 0;
  } catch (e) {
    error('❌ YAML validation error:', e.message);
    return 1;
  }
}

module.exports = { findYamlFiles, validateYaml, run };

if (require.main === module) {
  process.exitCode = run();
}
