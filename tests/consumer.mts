import {
  NoopPhysicsBackend,
  PhysicsService,
  type PhysicsBackend,
  type PhysicsServicePort,
  type PhysicsSubjectSource
} from '@konitif/physics';
import {
  PhysicsWorkerBackendAdapter,
  type PhysicsWorkerMessage,
  type PhysicsWorkerPort
} from '@konitif/physics/worker';

const source: PhysicsSubjectSource = { id: 'external', kind: 'custom' };
const backend: PhysicsBackend = new NoopPhysicsBackend();
const service: PhysicsServicePort = new PhysicsService({
  backendFactories: { mujoco: () => backend }
});
const workerConstructor: typeof PhysicsWorkerBackendAdapter = PhysicsWorkerBackendAdapter;
declare const worker: PhysicsWorkerPort<PhysicsWorkerMessage>;

void source;
void service;
void workerConstructor;
void worker;
