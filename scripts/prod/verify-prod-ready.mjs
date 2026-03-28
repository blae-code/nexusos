import { spawnSync } from 'node:child_process';

const commands = [
  ['npm', ['run', 'typecheck']],
  ['npm', ['run', 'lint']],
  ['npm', ['run', 'build']],
  ['npm', ['run', 'audit:repo-sample-data']],
  ['npm', ['run', 'base44:check']],
  ['npm', ['run', 'version:check']],
  ['npm', ['run', 'audit:prod']],
  ['npm', ['run', 'test:e2e:live']],
];

for (const [command, args] of commands) {
  const rendered = `${command} ${args.join(' ')}`;
  console.log(`\n>>> ${rendered}`);
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: process.env,
  });

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}
