import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

/** Captures what a script logs so tests can assert on it. */
export class Output {
  readonly out: string[] = [];
  readonly err: string[] = [];
  readonly log = (...args: unknown[]) => void this.out.push(args.join(' '));
  readonly error = (...args: unknown[]) => void this.err.push(args.join(' '));
  get stdout() {
    return this.out.join('\n');
  }
  get stderr() {
    return this.err.join('\n');
  }
}

/** A throwaway directory outside the repository, removed after each test. */
export class TempDir {
  readonly root = mkdtempSync(join(tmpdir(), 'ls-wp-test-'));
  write(relative: string, content: string) {
    const target = join(this.root, relative);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, content);
    return target;
  }
  remove() {
    rmSync(this.root, { recursive: true, force: true });
  }
}
