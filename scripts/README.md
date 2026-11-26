# Testing Utility Scripts

Production-ready JavaScript scripts for testing validation and analysis. Each script is designed to run in CI/CD pipelines, pre-commit hooks, or locally during development.

## Scripts

### theme-utils-validator.js
**Validate theme.json and design tokens against LightSpeedWP standards**
```bash
node scripts/theme-utils-validator.js --theme-json=path/to/theme.json --strict
```

**Validates:**
- Theme structure (schema compliance)
- Design token consistency (colors, spacing, typography)
- Color palette validation (7:1 contrast ratios for WCAG 2.2 AAA)
- Typography scale (font size ratios, line heights)
- Spacing consistency (scale ratios)
- Breakpoint definitions (responsive design)

**Output:** JSON report with validation results, violations, and recommendations

**When to use:**
- Design token validation in PR workflows
- Theme.json compliance checks
- Design system enforcement
- CI/CD quality gates

---

### wp-cli-checks.js
**Run WordPress theme validation and compliance checks**
```bash
node scripts/wp-cli-checks.js --theme=path/to/theme --wp-version=6.5
```

**Validates:**
- Theme compliance (WordPress.org standards)
- Block registration (discoverable, attributes correct)
- Plugin standards (activation, dependencies)
- LightSpeedWP custom checks (brand guidelines, performance)
- Security best practices (input validation, escaping)

**Output:** Report with pass/fail status, violations, remediation steps

**When to use:**
- Pre-release theme validation
- Block theme compliance checking
- Security audits
- CI/CD release gates

---

### validate-skill.js
**Validate the root `SKILL.md` and its documentation copy `docs/SKILL.md`**
```bash
node scripts/validate-skill.js
```

**Checks both files** for frontmatter on physical line 1, a `name` (3+ characters) and a double-quoted `description` (50+ characters). The accepted grammar is deliberately narrow: LF line endings and a double-quoted description only. Then it reports drift between the two files after resolving copy-relative links to repo-relative paths. It never rewrites either file. Exit code `1` on any failure.

---

### coverage-analyzer.js
**Report coverage gaps from a coverage report (advisory)**
```bash
node scripts/coverage-analyzer.js --coverage-report=.coverage/coverage-summary.json
```

**Accepts:**
- Istanbul summary (`coverage-summary.json`, written to `.coverage/` by `npm test`), including its `total` entry
- Raw Istanbul map (`coverage-final.json`)
- The report path may contain spaces and `=`; default `./.coverage/coverage-summary.json`

**Reports:** every file with a lines, statements, functions or branches metric below 100%, plus the total.

**Exit codes:** `0` when the report was read (gaps are advisory and do not fail the run);
`1` when the file is unreadable, is not JSON, is not an object, has no file entries or has an unrecognised entry.
Enforcement is the runner's job: `npm test` fails below 80% for this repository's scripts.

---

## Usage

Each script includes:
- Required arguments
- Output format
- Exit codes
- Example output

Run with `--help` for detailed usage:
```bash
node scripts/theme-utils-validator.js --help
```

## Integration

Use in package.json scripts:
```json
{
  "scripts": {
    "validate:theme-json": "node scripts/theme-utils-validator.js",
    "wp-cli:checks": "node scripts/wp-cli-checks.js",
    "coverage:analyze": "node scripts/coverage-analyzer.js"
  }
}
```

---

See individual script files for detailed documentation.
