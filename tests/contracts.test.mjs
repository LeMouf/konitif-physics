import assert from 'node:assert/strict';
import { test } from 'node:test';
import { NoopPhysicsBackend, PhysicsService } from '../dist/index.js';
import { PhysicsWorkerBackendAdapter } from '../dist/worker.js';

test('the default service remains explicitly inactive', async () => {
  const service = new PhysicsService();
  await service.loadRobot({ id: 'fixture', kind: 'custom' });
  service.setJointTarget('joint', { value: 0.5 });
  service.step(1 / 60);
  assert.deepEqual(service.snapshot(), {
    engine: 'none',
    enabled: false,
    initialized: true,
    loadedSourceId: 'fixture',
    diagnostics: [],
    backendStatus: {
      engine: 'none',
      initialized: true,
      loadedSourceId: 'fixture',
      metadata: {
        bodyTransformCount: 0,
        jointStateCount: 1,
        centerOfMassAvailable: false,
        stepCount: 0,
        simulatedTime: 0
      }
    }
  });
  service.dispose();
});

test('a missing backend is visible and cannot become active', async () => {
  const service = new PhysicsService({ enabled: true });
  await service.setEngine('mujoco');
  assert.equal(service.isEnabled, false);
  assert.match(service.snapshot().diagnostics[0].id, /missing-factory$/);
});

test('an injected backend receives only explicit lifecycle and step commands', async () => {
  const calls = [];
  class Backend extends NoopPhysicsBackend {
    engine = 'mujoco';
    async init() { calls.push('init'); }
    async loadRobot(source) { calls.push(`load:${source.id}`); }
    step(dt) { calls.push(`step:${dt}`); }
    dispose() { calls.push('dispose'); }
  }
  const service = new PhysicsService({
    enabled: true,
    backendFactories: { mujoco: () => new Backend() }
  });
  await service.setEngine('mujoco');
  await service.loadRobot({ id: 'fixture', kind: 'custom' });
  service.step(0.02);
  service.dispose();
  assert.deepEqual(calls, ['init', 'load:fixture', 'step:0.02', 'dispose']);
});

test('the worker adapter requires explicit transport and deadline providers', () => {
  assert.equal(typeof PhysicsWorkerBackendAdapter, 'function');
  assert.throws(() => new PhysicsWorkerBackendAdapter({ engine: 'mujoco' }), /addEventListener/);
});
