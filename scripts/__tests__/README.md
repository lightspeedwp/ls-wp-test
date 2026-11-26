# Script tests

Vitest tests for the maintenance scripts in `scripts/`. They test this skill
repository's own tooling; they are not consumer-project examples (see
`docs/JEST.md` and `docs/TESTING.md` for guidance aimed at consumer projects).

## Structure

- `<script>.test.ts` — tests for a script in `scripts/` (TypeScript, run by Vitest)
- `helpers.ts` — shared `Output` (captures log/error calls) and `TempDir`
  (throwaway directory outside the repository)

The scripts stay CommonJS. Each one exports its logic and only runs as a CLI
when executed directly, so tests import it and inject the file system, readers
and loggers instead of touching real files.

## Running tests

Requires Node.js `^22.12.0 || ^24.0.0 || >=26.0.0` (the range Vitest 5 supports, matching the sibling skill repositories; `engines` in `package.json`) and `npm install`. Only Node 24.21.0 has been run for this repository; the other majors are declared, not verified.

```bash
npm test                 # vitest run --coverage
npm run test:watch       # vitest in watch mode
npm run typecheck        # tsc --noEmit
npm run test:validators  # the original validate:skill/references/prompts chain
```

Test discovery is limited to `scripts/**/__tests__/**/*.test.ts`. The generated
evaluation projects under `evals/` are never discovered or measured. Vitest
fails when no test files are found; it is not configured to pass an empty suite.

## Coverage

`npm test` measures every `.js`, `.cjs`, `.mjs` and `.ts` file in `scripts/`
with the V8 provider and writes `text`, `json-summary` and `lcov` reports to
`.coverage/` (git-ignored). Statements, branches, functions and lines must each
stay at or above 80%; the run fails below that. The 80% threshold is the approved policy for this repository's own scripts. `scripts/coverage-analyzer.js` is advisory and never enforces a threshold. There are no coverage
exclusions other than the tests themselves.

Limits: the `require.main === module` entrypoint lines of each script run only
in a real child process, which this setup does not instrument, so they show as
uncovered. One CLI test per exit-code contract (`wp-cli-checks.js`) runs the
script as a child process with a minimal environment and a timeout; that
assertion is not counted as coverage.

## Writing tests

- Put the test beside the script in `scripts/__tests__/`.
- Create temporary inputs with `TempDir`; do not commit malformed fixtures.
- Inject `Output` rather than spying on `console`.
