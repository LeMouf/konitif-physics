import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { assertPublishingTools, assertReleaseInputs } from '../scripts/check-release.mjs';

const json = (path) => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'));

test('release inputs bind the exact package version to its repository and tag', () => {
  const policy = json('release-policy.json');
  const manifest = json('package.json');
  const lock = json('package-lock.json');
  assert.doesNotThrow(() => assertReleaseInputs(policy, manifest, lock, {
    GITHUB_REPOSITORY: 'LeMouf/konitif-physics',
    GITHUB_EVENT_NAME: 'push',
    GITHUB_REF: 'refs/tags/v0.285.0'
  }));
  assert.doesNotThrow(() => assertReleaseInputs(policy, manifest, lock, {
    GITHUB_REPOSITORY: 'LeMouf/konitif-physics',
    GITHUB_EVENT_NAME: 'workflow_dispatch',
    PHYSICS_RELEASE_TAG: 'v0.285.0'
  }));
  assert.throws(() => assertReleaseInputs(policy, manifest, lock, {
    GITHUB_REPOSITORY: 'LeMouf/konitif-physics',
    GITHUB_EVENT_NAME: 'workflow_dispatch',
    PHYSICS_RELEASE_TAG: 'v0.285.1'
  }));
});

test('publication requires an OIDC-capable preinstalled npm without upgrading it', () => {
  assert.doesNotThrow(() => assertPublishingTools('24.20.0', '11.6.0'));
  assert.throws(() => assertPublishingTools('22.13.0', '11.6.0'));
  assert.throws(() => assertPublishingTools('24.20.0', '11.4.9'));
});

test('the publish workflow is the only constrained publication authority', () => {
  const workflow = readFileSync(new URL('../.github/workflows/publish.yml', import.meta.url), 'utf8');
  assert.match(workflow, /tags: \['v\*'\]/);
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /vars\.PHYSICS_NPM_PUBLISH_ENABLED == 'true'/);
  assert.match(workflow, /environment: npm-release/);
  assert.match(workflow, /id-token: write/);
  assert.match(workflow, /npm publish \.release\/package\.tgz --access public --provenance --ignore-scripts/);
  assert.doesNotMatch(workflow, /npm install -g|npm update/);
});
