# Lefthook Pre-Commit Hook Setup

Configure automated testing before commits.

## Installation

See references/lefthook-setup.md for platform-specific installation.

## Configuration

Copy `references/lefthook-consumer-template.yml` from this skill to your project root as `lefthook.yml`. The `lefthook.yml` in the skill root is this repository's own pre-push configuration (typecheck, `npm test`, `npm run test:validators`), not the template.

The template's commands are examples: only `npm test` is standard; define any other script it calls (such as `validate:theme-json`) in your project first.

## Running Hooks

```bash
# Run all pre-commit hooks
lefthook run pre-commit

# Run specific hook
lefthook run pre-commit tests

# Bypass hooks
git commit --no-verify
```

## Configuration Options

- **glob:** Files to match
- **exclude:** Files to exclude  
- **run:** Command to execute
- **fail_text:** Message if hook fails

---

See `references/lefthook-consumer-template.yml` for the configuration example.
