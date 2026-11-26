#!/usr/bin/env node

/**
 * Validate theme.json and design tokens for WordPress themes
 * Usage: node scripts/theme-utils-validator.js --theme-json=path/to/theme.json
 */

const fs = require('fs');

function parseThemeJsonPath(argv) {
  return argv.slice(2).find(arg => arg.startsWith('--theme-json='))?.split('=')[1] || './theme.json';
}

/** Validates a theme.json file and returns the process exit code. */
function run(argv, { readFile = p => fs.readFileSync(p, 'utf8'), log = console.log, error = console.error } = {}) {
  try {
    const theme = JSON.parse(readFile(parseThemeJsonPath(argv)));

    log('✓ theme.json valid JSON');

    // Validate structure
    if (!theme.version) log('⚠ Missing version field');
    if (!theme.settings) log('⚠ Missing settings');
    if (!theme.styles) log('⚠ Missing styles');

    // Validate design tokens
    const hasColorPalette = theme.settings?.color?.palette?.length > 0;
    const hasTypography = theme.settings?.typography?.fontSizes?.length > 0;
    const hasSpacing = theme.settings?.spacing?.spacingSizes?.length > 0;

    if (hasColorPalette) log(`✓ Color palette: ${theme.settings.color.palette.length} colors`);
    if (hasTypography) log(`✓ Typography: ${theme.settings.typography.fontSizes.length} sizes`);
    if (hasSpacing) log(`✓ Spacing: ${theme.settings.spacing.spacingSizes.length} scales`);

    if (!hasColorPalette || !hasTypography || !hasSpacing) {
      return 1;
    }

    log('✓ All validation checks passed');
    return 0;
  } catch (e) {
    error('✗ Error:', e.message);
    return 1;
  }
}

module.exports = { parseThemeJsonPath, run };

if (require.main === module) {
  process.exitCode = run(process.argv);
}
