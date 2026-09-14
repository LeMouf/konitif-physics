import type {
  BodyTransform,
  JointState,
  JointTarget,
  PhysicsBackend,
  PhysicsBodyImpulse,
  PhysicsBackendStatus,
  PhysicsEngineType,
  PhysicsKinematicPoseOptions,
  PhysicsRuntimeConfig,
  PhysicsVector3,
  PhysicsSubjectSource
} from './contracts.js';
import type { PhysicsWorkerDeadlineHost, PhysicsWorkerPort } from './PhysicsWorkerHost.js';
export type { PhysicsWorkerDeadlineHost, PhysicsWorkerPort } from './PhysicsWorkerHost.js';

import type { PhysicsWorkerCommand, PhysicsWorkerStatePayload, PhysicsWorkerRequest, PhysicsWorkerStateMessage, PhysicsWorkerMessage } from './PhysicsWorkerProtocol.js';

export interface PhysicsWorkerBackendAdapterOptions {
  engine: Exclude<PhysicsEngineType, 'none'>;
  worker: PhysicsWorkerPort<PhysicsWorkerMessage>;
  deadlineHost: PhysicsWorkerDeadlineHost;
  workerSource?: string;
  initPayload?: unknown;
  requestTimeoutMs?: number;
}

export class PhysicsWorkerBackendAdapter implements PhysicsBackend {
  readonly engine: Exclude<PhysicsEngineType, 'none'>;

  private readonly worker: PhysicsWorkerPort<PhysicsWorkerMessage>;
  private readonly deadlineHost: PhysicsWorkerDeadlineHost;
  private readonly workerSource: string | null;
  private readonly initPayload: unknown;
  private nextRequestId = 1;
  private disposed = false;
  private failure: Error | null = null;
  private readonly requestTimeoutMs: number;
  private stepPending = false;
  private queuedStepDt: number | null = null;
  private readonly pendingRequests = new Map<
    number,
    {
      resolve: (payload: PhysicsWorkerStatePayload | null) => void;
      reject: (error: Error) => void;
      cancelDeadline: () => void;
    }
  >();
  private readonly jointStates = new Map<string, JointState>();
  private bodyTransforms: BodyTransform[] = [];
  private centerOfMass: PhysicsVector3 | null = null;
  private status: PhysicsBackendStatus;
  private stateRevision = 0;

  constructor(options: PhysicsWorkerBackendAdapterOptions) {
    this.engine = options.engine;
    this.worker = options.worker;
    this.deadlineHost = options.deadlineHost;
    this.workerSource = options.workerSource?.trim() || null;
    this.initPayload = options.initPayload;
    this.requestTimeoutMs = Number.isFinite(options.requestTimeoutMs) && options.requestTimeoutMs! > 0
      ? options.requestTimeoutMs! : 120_000;
    this.status = {
      engine: options.engine,
      initialized: false,
      loadedSourceId: null,
      diagnostics: []
    };
    this.worker.addEventListener('message', this.handleWorkerMessage);
    this.worker.addEventListener('error', this.handleWorkerError);
  }

  async init(): Promise<void> {
    await this.request('init', this.initPayload);
  }

  async loadSubject(source: PhysicsSubjectSource): Promise<void> {
    this.stepPending = false;
    this.queuedStepDt = null;
    await this.request('loadSubject', source);
  }

  step(dt: number): void {
    if (this.disposed || !Number.isFinite(dt) || dt <= 0) {
      return;
    }

    if (this.stepPending) {
      this.queuedStepDt = (this.queuedStepDt ?? 0) + dt;
      return;
    }

    this.postStep(dt);
  }

  async stepAndWait(dt: number): Promise<void> {
    if (this.failure) throw this.failure;
    if (this.disposed || !Number.isFinite(dt) || dt <= 0) {
      return;
    }

    await this.request('stepAndWait', { dt });
  }

  async synchronize(): Promise<void> {
    if (this.failure) throw this.failure;
    if (this.disposed) {
      return;
    }

    await this.request('synchronize');
  }

  async resetSimulation(): Promise<void> {
    this.stepPending = false;
    this.queuedStepDt = null;
    await this.request('resetSimulation');
  }

  setJointTarget(jointName: string, target: JointTarget): void {
    if (this.disposed) {
      return;
    }

    this.worker.postMessage({
      id: 0,
      command: 'setJointTarget',
      payload: { jointName, target }
    } satisfies PhysicsWorkerRequest);
  }

  applyBodyImpulse(impulse: PhysicsBodyImpulse): void {
    if (this.disposed) {
      return;
    }

    this.worker.postMessage({
      id: 0,
      command: 'applyBodyImpulse',
      payload: { impulse }
    } satisfies PhysicsWorkerRequest);
  }

  clearJointTargets(): void {
    if (this.disposed) {
      return;
    }

    this.worker.postMessage({ id: 0, command: 'clearJointTargets' } satisfies PhysicsWorkerRequest);
  }

  releaseJointTargets(targets: Record<string, JointTarget> = {}): void {
    if (this.disposed) {
      return;
    }

    this.worker.postMessage({
      id: 0,
      command: 'releaseJointTargets',
      payload: { targets }
    } satisfies PhysicsWorkerRequest);
  }

  syncKinematicPose(
    targets: Record<string, JointTarget> = {},
    options: PhysicsKinematicPoseOptions = {}
  ): void {
    if (this.disposed) {
      return;
    }

    this.worker.postMessage({
      id: 0,
      command: 'syncKinematicPose',
      payload: { targets, options }
    } satisfies PhysicsWorkerRequest);
  }

  setRuntimeConfig(config: PhysicsRuntimeConfig): void {
    if (this.disposed) {
      return;
    }

    this.worker.postMessage({
      id: 0,
      command: 'setRuntimeConfig',
      payload: { config }
    } satisfies PhysicsWorkerRequest);
  }

  getJointState(jointName: string): JointState {
    return this.jointStates.get(jointName) ?? { name: jointName, value: 0 };
  }

  getBodyTransforms(): BodyTransform[] {
    return this.bodyTransforms;
  }

  getCenterOfMass(): PhysicsVector3 | null {
    return this.centerOfMass;
  }

  getStatus(): PhysicsBackendStatus {
    return {
      ...this.status,
      metadata: {
        ...(this.status.metadata ?? {}),
        bodyTransformCount: this.bodyTransforms.length,
        jointStateCount: this.jointStates.size,
        centerOfMassAvailable: this.centerOfMass !== null,
        stateRevision: this.stateRevision
      }
    };
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }

    this.disposed = true;
    try {
      this.worker.postMessage({ id: 0, command: 'dispose' } satisfies PhysicsWorkerRequest);
    } catch {
      // A worker that failed during module loading may already reject messages.
    }
    this.worker.removeEventListener('message', this.handleWorkerMessage);
    this.worker.removeEventListener('error', this.handleWorkerError);

    for (const request of this.pendingRequests.values()) {
      request.cancelDeadline();
      request.reject(new Error(`Physics ${this.engine} worker adapter was disposed.`));
    }

    this.pendingRequests.clear();
    this.stepPending = false;
    this.queuedStepDt = null;
    this.jointStates.clear();
    this.bodyTransforms = [];
    this.centerOfMass = null;
    this.stateRevision = 0;
    this.status = {
      engine: this.engine,
      initialized: false,
      loadedSourceId: null,
      diagnostics: []
    };
    this.worker.terminate();
  }

  private request(
    command: PhysicsWorkerCommand,
    payload?: unknown
  ): Promise<PhysicsWorkerStatePayload | null> {
    if (this.failure) return Promise.reject(this.failure);
    if (this.disposed) {
      return Promise.reject(new Error(`Physics ${this.engine} worker adapter is disposed.`));
    }

    const id = this.nextRequestId++;

    return new Promise((resolve, reject) => {
      const cancelDeadline = this.deadlineHost.schedule(() => this.failWorker(new Error(
        `Physics ${this.engine} worker ${command} timed out after ${this.requestTimeoutMs}ms.`
      )), this.requestTimeoutMs);
      this.pendingRequests.set(id, { resolve, reject, cancelDeadline });
      try {
        this.worker.postMessage({ id, command, payload } satisfies PhysicsWorkerRequest);
      } catch (error) {
        this.failWorker(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }

  private handleWorkerMessage = (event: { data: PhysicsWorkerMessage }): void => {
    if (this.disposed) return;
    const message = event.data;

    if (isPhysicsWorkerStateMessage(message)) {
      this.stepPending = false;
      this.applyStatePayload(message.payload);
      this.flushQueuedStep();
      return;
    }

    const request = this.pendingRequests.get(message.id);

    if (!request) {
      return;
    }

    this.pendingRequests.delete(message.id);
    request.cancelDeadline();

    if (!message.ok) {
      request.reject(new Error(message.error ?? `Physics ${this.engine} worker request failed.`));
      return;
    }

    if (message.payload) {
      this.applyStatePayload(message.payload);
    }

    request.resolve(message.payload ?? null);
  };

  private handleWorkerError = (event: { message: string }): void => {
    const sourceContext = this.workerSource ? ` while loading "${this.workerSource}"` : '';
    const error = new Error(event.message || `Physics ${this.engine} worker error${sourceContext}.`);
    this.failWorker(error);
  };

  private failWorker(error: Error): void {
    if (this.disposed) return;
    this.failure = error;
    for (const request of this.pendingRequests.values()) {
      request.cancelDeadline();
      request.reject(error);
    }

    this.pendingRequests.clear();
    this.dispose();
    this.status = {
      engine: this.engine, initialized: false, loadedSourceId: null,
      diagnostics: [{ id: 'physics-worker-failed', severity: 'error', message: error.message }]
    };
  }

  private postStep(dt: number): void {
    this.stepPending = true;
    this.worker.postMessage({ id: 0, command: 'step', payload: { dt } } satisfies PhysicsWorkerRequest);
  }

  private flushQueuedStep(): void {
    const dt = this.queuedStepDt;
    this.queuedStepDt = null;

    if (dt !== null && !this.disposed) {
      this.postStep(dt);
    }
  }

  private applyStatePayload(payload: PhysicsWorkerStatePayload): void {
    // Every accepted worker payload is a new observation boundary, including
    // explicit synchronize/reset acknowledgements that do not advance the
    // simulation step counter. Consumers must not infer freshness from
    // `stepCount`, which intentionally remains stable across kinematic resets.
    this.stateRevision += 1;

    if (payload.jointStates) {
      this.jointStates.clear();

      for (const jointState of payload.jointStates) {
        this.jointStates.set(jointState.name, jointState);
      }
    }

    if (payload.bodyTransforms) {
      this.bodyTransforms = payload.bodyTransforms;
    }

    if ('centerOfMass' in payload) {
      this.centerOfMass = payload.centerOfMass ?? null;
    }

    if (payload.status) {
      this.status = payload.status;
    }
  }
}

function isPhysicsWorkerStateMessage(message: PhysicsWorkerMessage): message is PhysicsWorkerStateMessage {
  return 'type' in message && message.type === 'state';
}
