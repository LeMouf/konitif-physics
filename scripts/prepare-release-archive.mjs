import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { constants, copyFileSync, mkdirSync, readFileSync, readdirSync, realpathSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const authorityRoot = fileURLToPath(new URL('..', import.meta.url));
const releaseRoot = realpathSync(resolve(authorityRoot, process.env.PHYSICS_RELEASE_ROOT ?? '.'));
const output = execFileSync(process.execPath, ['scripts/verify-package.mjs'], {
  cwd: releaseRoot,
  encoding: 'utf8'
});
process.stdout.write(output);
const evidence = JSON.parse(output);
assert.equal(typeof evidence.evidence, 'string');
const directory = realpathSync(evidence.evidence);
const archives = readdirSync(directory).filter((file) => file.endsWith('.tgz'));
assert.equal(archives.length, 1, 'Expected exactly one verified archive');
const archive = join(directory, archives[0]);
const bytes = readFileSync(archive);
assert.equal(`sha512-${createHash('sha512').update(bytes).digest('base64')}`, evidence.integrity);
assert.equal(bytes.length, evidence.bytes);
mkdirSync(join(authorityRoot, '.release'), { recursive: true });
copyFileSync(archive, join(authorityRoot, '.release/package.tgz'), constants.COPYFILE_EXCL);
console.log('Verified archive retained at .release/package.tgz');
