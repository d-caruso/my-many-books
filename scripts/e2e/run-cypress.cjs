const { spawn } = require('child_process');

const resolveCommand = (command) => {
  return process.platform === 'win32' ? `${command}.cmd` : command;
};

const runId = process.env.GITHUB_RUN_ID || Date.now().toString();
const args = ['run', 'cypress:run'];

if (process.env.CYPRESS_RECORD_KEY) {
  args.push('--', '--record', '--parallel', '--ci-build-id', runId);
}

const child = spawn(resolveCommand('npm'), args, {
  stdio: 'inherit',
  env: process.env,
});

child.on('exit', (code) => {
  process.exit(code ?? 1);
});
