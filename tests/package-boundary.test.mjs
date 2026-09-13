import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';

const json = path => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'));

test('the package and lock identify one dependency-free public runtime', () => {
  const manifest = json('package.json');
  const lock = json('package-lock.json');
  assert.equal(manifest.name, '@konitif/physics');
  assert.equal(manifest.version, '0.284.2');
  assert.equal(manifest.private, false);
  assert.deepEqual(manifest.dependencies ?? {}, {});
  assert.deepEqual(manifest.devDependencies, { typescript: '5.9.3' });
  assert.equal(lock.name, manifest.name);
  assert.equal(lock.version, manifest.version);
  assert.deepEqual(lock.packages[''].devDependencies, manifest.devDependencies);
  assert.deepEqual(Object.keys(lock.packages), ['', 'node_modules/typescript']);
});

test('the source closure imports only its own relative modules', () => {
  const root = new URL('../src/', import.meta.url);
  const files = readdirSync(root).filter(name => name.endsWith('.ts')).sort();
  assert.equal(files.length, 12);
  for (const file of files) {
    const source = readFileSync(new URL(file, root), 'utf8');
    for (const match of source.matchAll(/(?:from|import\s*\()\s*['"]([^'"]+)['"]/g)) {
      assert.match(match[1], /^\.\//, `${file}: ${match[1]}`);
    }
  }
});

test('validation CI has no publication authority', () => {
  const workflow = readFileSync(new URL('../.github/workflows/ci.yml', import.meta.url), 'utf8');
  assert.match(workflow, /permissions:\n {2}contents: read/);
  assert.doesNotMatch(workflow, /id-token: write|npm publish/);
});
