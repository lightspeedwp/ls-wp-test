#!/usr/bin/env node

/**
 * Run WordPress theme validation checks
 * Usage: node scripts/wp-cli-checks.js --theme=path/to/theme
 *
 * Exits 1 when any check fails; exits 0 only when every check passed.
 */

const fs = require('fs');
const path = require('path');

const REQUIRED_FILES = ['theme.json', 'style.css', 'functions.php', 'index.php'];

/** Reads the --theme= argument, defaulting to the current directory. */
function parseThemePath(argv) {
  return argv.find(arg => arg.startsWith('--theme='))?.split('=')[1] || './';
}

/** Runs the filesystem and theme.json checks and returns the failures found. */
class ThemeChecker {
  constructor(fileSystem = fs) {
    this.fs = fileSystem;
  }

  /** @returns {{missingFiles: string[], themeJsonError: string|null}} */
  check(themePath) {
    const missingFiles = REQUIRED_FILES.filter(
      file => !this.fs.existsSync(path.join(themePath, file))
    );

    let themeJsonError = null;
    try {
      JSON.parse(this.fs.readFileSync(path.join(themePath, 'theme.json'), 'utf8'));
    } catch (e) {
      themeJsonError = e.message;
    }

    return { missingFiles, themeJsonError };
  }
}

/** Prints the results and returns the process exit code. */
function run(argv, { checker = new ThemeChecker(), log = console.log } = {}) {
  const { missingFiles, themeJsonError } = checker.check(parseThemePath(argv));
  const totalChecks = 2;
  let failed = 0;

  log('Validating WordPress theme...\n');

  if (missingFiles.length > 0) {
    failed++;
    log('✗ Missing required files:', missingFiles.join(', '));
  } else {
    log('✓ All required files present');
  }

  if (themeJsonError !== null) {
    failed++;
    log('✗ theme.json invalid:', themeJsonError);
  } else {
    log('✓ theme.json valid');
  }

  log(`\nTheme checks completed: ${totalChecks - failed} passed, ${failed} failed`);
  if (failed > 0) {
    log('✗ Theme validation failed');
    return 1;
  }
  log('✓ Theme validation passed');
  return 0;
}

module.exports = { REQUIRED_FILES, parseThemePath, ThemeChecker, run };

if (require.main === module) {
  process.exitCode = run(process.argv);
}
