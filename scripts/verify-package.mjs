import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = realpathSync(fileURLToPath(new URL('..', import.meta.url)));
const evidence = mkdtempSync(join(tmpdir(), 'konitif-physics-package-'));
const cache = join(evidence, 'npm-cache');
const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
assert.equal(manifest.name, '@konitif/physics');
assert.equal(manifest.private, false);
assert.deepEqual(manifest.dependencies ?? {}, {});
assert.deepEqual(manifest.exports, {
  '.': { types: './dist/index.d.ts', import: './dist/index.js' },
  './worker': { types: './dist/worker.d.ts', import: './dist/worker.js' }
});

const run = (command, args, cwd = root) => execFileSync(command, args, {
  cwd,
  encoding: 'utf8',
  maxBuffer: 8 * 1024 * 1024,
  env: { ...process.env, npm_config_offline: 'true', npm_config_cache: cache }
});
const packArgs = ['pack', '--offline', '--ignore-scripts', '--json', '--pack-destination', evidence];
let output;
if (process.platform === 'win32') {
  const npmCli = join(dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js');
  assert.ok(existsSync(npmCli), `Installed npm CLI required at ${npmCli}`);
  output = run(process.execPath, [npmCli, ...packArgs]);
} else {
  output = run('npm', packArgs);
}
const [packed] = JSON.parse(output);
const files = packed.files.map(file => file.path).sort();
for (const file of files) {
  assert.match(file, /^(dist\/|src\/|package\.json$|README\.md$|LICENSE\.md$|tsconfig\.json$)/);
}
for (const file of [
  'dist/index.js', 'dist/index.d.ts', 'dist/worker.js', 'dist/worker.d.ts',
  'src/index.ts', 'src/worker.ts', 'README.md', 'LICENSE.md', 'package.json'
]) assert.ok(files.includes(file), file);

const archive = join(evidence, packed.filename);
const bytes = readFileSync(archive);
assert.equal(packed.integrity, `sha512-${createHash('sha512').update(bytes).digest('base64')}`);
const dependency = join(evidence, 'consumer/node_modules/@konitif/physics');
mkdirSync(dependency, { recursive: true });
run('tar', ['-xzf', archive, '-C', dependency, '--strip-components=1']);
cpSync(join(root, 'tests/consumer.mts'), join(evidence, 'consumer/consumer.mts'));
run(process.execPath, [join(root, 'node_modules/typescript/bin/tsc'), '--noEmit', '--strict',
  '--target', 'ES2022', '--module', 'NodeNext', '--moduleResolution', 'NodeNext',
  'consumer.mts'], join(evidence, 'consumer'));
run(process.execPath, ['--input-type=module', '-e', `
  import assert from 'node:assert/strict';
  import { NoopPhysicsBackend, PhysicsService } from '@konitif/physics';
  import { PhysicsWorkerBackendAdapter } from '@konitif/physics/worker';
  const service = new PhysicsService();
  await service.loadRobot({ id: 'external', kind: 'custom' });
  assert.equal(service.snapshot().loadedSourceId, 'external');
  assert.equal(new NoopPhysicsBackend().engine, 'none');
  assert.equal(typeof PhysicsWorkerBackendAdapter, 'function');
`], join(evidence, 'consumer'));

console.log(JSON.stringify({
  status: 'passed',
  name: manifest.name,
  version: manifest.version,
  integrity: packed.integrity,
  bytes: bytes.length,
  files: files.length,
  consumer: 'isolated ESM and NodeNext declarations',
  evidence
}, null, 2));
