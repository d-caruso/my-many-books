const { spawn } = require('child_process');
const path = require('path');

const resolveCommand = (command) => {
  return process.platform === 'win32' ? `${command}.cmd` : command;
};

const projectRoot = path.join(__dirname, '..', '..');
const apiRoot = path.join(__dirname, '..', '..', 'apps', 'api');
const webRoot = path.join(__dirname, '..', '..', 'apps', 'web-app');

let shuttingDown = false;
const children = [];

const shutdown = (signal) => {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    if (!child.killed) {
      child.kill(signal);
    }
  }
};

const startProcess = (label, command, args, cwd) => {
  const child = spawn(command, args, {
    cwd,
    env: process.env,
    stdio: 'inherit',
  });

  child.on('exit', (code, signal) => {
    if (shuttingDown) return;
    if (signal) {
      process.exitCode = 1;
      shutdown(signal);
      return;
    }
    if (code !== 0) {
      process.exitCode = code || 1;
      shutdown('SIGTERM');
      return;
    }
  });

  children.push(child);
  return child;
};

startProcess('api', resolveCommand('npm'), ['--prefix', 'apps/api', 'run', 'dev'], projectRoot);
startProcess('web-app', resolveCommand('npm'), ['--prefix', 'apps/web-app', 'run', 'start', '--', '--host', 'localhost', '--port', '3000'], projectRoot);

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
