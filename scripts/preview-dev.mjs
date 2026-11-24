import { spawn } from 'node:child_process';
import { connect } from 'node:net';
import { realpathSync } from 'node:fs';

// Normal terminal development retains the original Nx workflow. In the editor,
// PORT belongs only to the frontend; the API must remain on its own port.
const children = new Set();
let stopping = false;

function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  process.exitCode = code;
  for (const child of children) child.kill('SIGTERM');
}

function run(binary, args, env = process.env) {
  const child = spawn(process.execPath, [realpathSync(binary), ...args], {
    env,
    stdio: 'inherit',
  });
  children.add(child);
  child.on('error', (error) => {
    console.error(error);
    stop(1);
  });
  child.on('exit', (code, signal) => {
    children.delete(child);
    if (!stopping) stop(code ?? (signal ? 1 : 0));
  });
}

function isListening(port) {
  return new Promise((resolve) => {
    const socket = connect({ host: '127.0.0.1', port });
    const finish = (listening) => {
      socket.destroy();
      resolve(listening);
    };
    socket.setTimeout(1000);
    socket.once('connect', () => finish(true));
    socket.once('error', () => finish(false));
    socket.once('timeout', () => finish(false));
  });
}

process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());

if (!process.env.PORT) {
  run('node_modules/.bin/nx', [
    'run-many', '--target=serve', '--projects=backend,frontend', '--parallel',
  ]);
} else {
  const backendPort = 3001;
  if (await isListening(backendPort)) {
    console.log(`Using existing backend on port ${backendPort}`);
  } else {
    run('node_modules/.bin/nx', ['serve', 'backend'], {
      ...process.env,
      PORT: String(backendPort),
    });
  }
  run('node_modules/vite/bin/vite.js', [
    '--config', 'apps/frontend/vite.config.mts',
    '--host', process.env.HOST || '127.0.0.1',
    '--port', process.env.PORT,
    '--strictPort',
  ]);
}
