import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const gitPath = path.join(repoRoot, '.git');

if (!existsSync(gitPath)) {
  process.exit(0);
}

try {
  execFileSync('git', ['config', 'core.hooksPath', '.githooks'], {
    cwd: repoRoot,
    stdio: 'ignore',
  });
  console.log('Configured Git hooks path to .githooks');
} catch (error) {
  console.warn('Unable to configure Git hooks path automatically.');
}

