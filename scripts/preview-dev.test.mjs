import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';

// Exercise launch decisions without starting servers or touching existing ones.
function launch(port, backendListening) {
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', `
    import childProcess from 'node:child_process';
    import net from 'node:net';
    import { EventEmitter } from 'node:events';
    import { syncBuiltinESMExports } from 'node:module';
    const calls = [];
    childProcess.spawn = (executable, args, options) => {
      calls.push({ executable, args, port: options.env.PORT });
      const child = new EventEmitter();
      child.kill = () => {};
      return child;
    };
    net.connect = () => {
      const socket = new EventEmitter();
      socket.setTimeout = () => {};
      socket.destroy = () => {};
      process.nextTick(() => socket.emit(${JSON.stringify(backendListening ? 'connect' : 'error')}));
      return socket;
    };
    syncBuiltinESMExports();
    await import('./scripts/preview-dev.mjs');
    console.log(JSON.stringify(calls));
  `], {
    cwd: new URL('..', import.meta.url),
    env: { ...process.env, PORT: port, HOST: '127.0.0.1' },
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout.trim().split('\n').at(-1));
}

test('terminal development preserves the original Nx command and Node runtime', () => {
  const calls = launch('', false);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].executable, process.execPath);
  assert.deepEqual(calls[0].args.slice(1), [
    'run-many', '--target=serve', '--projects=backend,frontend', '--parallel',
  ]);
});

test('preview reuses the backend and gives only Vite the preview port', () => {
  const calls = launch('59838', true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].executable, process.execPath);
  assert.deepEqual(calls[0].args.slice(1), [
    '--config', 'apps/frontend/vite.config.mts',
    '--host', '127.0.0.1', '--port', '59838', '--strictPort',
  ]);
});

test('preview starts a missing backend on 3001, not the frontend port', () => {
  const calls = launch('59838', false);
  assert.equal(calls.length, 2);
  assert.deepEqual(calls[0].args.slice(1), ['serve', 'backend']);
  assert.equal(calls[0].port, '3001');
  assert.equal(calls[1].port, '59838');
});
