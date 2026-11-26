# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Comprehensive test execution skill supporting Jest, Playwright, and PHPUnit
- Test agent for automated testing, debugging, and coverage validation
- Skill prompts for common testing scenarios
- AGENTS.md documentation for agent usage
- CLAUDE.md with project-specific instructions
- docs/ folder with testing guides

### Changed
- Adopted Vitest 5.1.0 with V8 coverage (`.coverage/`, 80% thresholds) for the maintenance scripts; scripts now export their logic for testing and remain CommonJS
- `coverage-analyzer.js` accepts Istanbul summary and raw reports, checks all four metrics and fails on empty or malformed reports
- `wp-cli-checks.js` exits non-zero when a required file is missing or theme.json is invalid
- `validate-skill.js` validates both `SKILL.md` and `docs/SKILL.md` and reports drift
- Moved the consumer Lefthook template to `references/lefthook-consumer-template.yml`; root `lefthook.yml` now holds this repository's own pre-push hooks
- Reorganized repository to follow org-wide standards
- Updated README with skill overview and quick start

### Fixed
- Initial repository setup

---

## [0.1.0] - 2026-10-30

### Added
- Initial repository structure
- Test skill foundation
- Organization standards inheritance
- Branching strategy documentation
- Contributing guidelines

---

## Versioning

This project uses [Semantic Versioning](https://semver.org/):
- **MAJOR**: Breaking changes to skill API or functionality
- **MINOR**: New features, new testing frameworks, new sub-skills
- **PATCH**: Bug fixes, documentation updates, minor improvements

## Release Process

1. Update version in relevant files
2. Add release notes to CHANGELOG.md
3. Create git tag: `git tag v<version>`
4. Push tag: `git push origin v<version>`
5. Create GitHub Release from tag

---

*Changelog maintained per [Keep a Changelog](https://keepachangelog.com/)*
