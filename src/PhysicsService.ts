import type {
  BodyTransform,
  JointState,
  JointTarget,
  PhysicsBackend,
  PhysicsBackendDiagnostic,
  PhysicsBackendFactoryRegistry,
  PhysicsBodyImpulse,
  PhysicsEngineType,
  PhysicsKinematicPoseOptions,
  PhysicsRuntimeConfig,
  PhysicsServiceSnapshot,
  PhysicsServicePort,
  PhysicsVector3,
  PhysicsSubjectSource
} from './contracts.js';
import { NoopPhysicsBackend } from './NoopPhysicsBackend.js';

export interface PhysicsServiceOptions {
  backendFactories?: PhysicsBackendFactoryRegistry;
  enabled?: boolean;
}

export class PhysicsService implements PhysicsServicePort {
  private readonly backendFactories: PhysicsBackendFactoryRegistry;
  private backend: PhysicsBackend = new NoopPhysicsBackend();
  private engine: PhysicsEngineType = 'none';
  private enabled: boolean;
  private initialized = false;
  private loadedSource: PhysicsSubjectSource | null = null;
  private backendLoadedSourceId: string | null = null;
  private initializationPromise: Promise<void> | null = null;
  private lifecycleRevision = 0;
  private diagnostics: PhysicsBackendDiagnostic[] = [];

  constructor(options: PhysicsServiceOptions = {}) {
    this.backendFactories = options.backendFactories ?? {};
    this.enabled = options.enabled ?? false;
  }

  get activeEngine(): PhysicsEngineType {
    return this.engine;
  }

  get isEnabled(): boolean {
    return this.enabled;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  async setEngine(engine: PhysicsEngineType): Promise<void> {
    if (engine === this.engine) {
      await this.initializationPromise;
      return;
    }

    const lifecycleRevision = ++this.lifecycleRevision;
    this.disposeBackend();
    this.engine = engine;
    this.initialized = false;
    this.backendLoadedSourceId = null;
    this.diagnostics = [];

    if (engine === 'none') {
      this.backend = new NoopPhysicsBackend();
      this.enabled = false;
      return;
    }

    const factory = this.backendFactories[engine];
    if (!factory) {
      this.backend = new NoopPhysicsBackend();
      this.enabled = false;
      this.diagnostics = [
        {
          id: `physics.backend.${engine}.missing-factory`,
          severity: 'warning',
          message: `Physics backend "${engine}" is not registered.`
        }
      ];
      return;
    }

    this.backend = new NoopPhysicsBackend();
    const initializationPromise = (async () => {
      const backend = await factory();

      if (lifecycleRevision !== this.lifecycleRevision || engine !== this.engine) {
        backend.dispose();
        return;
      }

      this.backend = backend;
      await backend.init();

      if (lifecycleRevision !== this.lifecycleRevision || backend !== this.backend) {
        return;
      }

      this.initialized = true;
      const source = this.loadedSource;

      if (source) {
        await backend.loadSubject(source);

        if (
          lifecycleRevision === this.lifecycleRevision &&
          backend === this.backend &&
          source === this.loadedSource
        ) {
          this.backendLoadedSourceId = source.id;
        }
      }
    })();
    this.initializationPromise = initializationPromise;

    try {
      await initializationPromise;
    } catch (error) {
      if (lifecycleRevision !== this.lifecycleRevision || engine !== this.engine) {
        return;
      }
      this.disposeBackend();
      this.backend = new NoopPhysicsBackend();
      this.enabled = false;
      this.initialized = false;
      this.backendLoadedSourceId = null;
      this.diagnostics = [
        {
          id: `physics.backend.${engine}.initialization-failed`,
          severity: 'error',
          message: `Physics backend "${engine}" failed to initialize: ${resolvePhysicsErrorMessage(error)}`
        }
      ];
      throw error;
    } finally {
      if (this.initializationPromise === initializationPromise) {
        this.initializationPromise = null;
      }
    }
  }

  async init(): Promise<void> {
    if (this.initialized) {
      return;
    }

    if (this.initializationPromise) {
      await this.initializationPromise;
      return;
    }

    await this.backend.init();
    this.initialized = true;
  }

  async loadSubject(source: PhysicsSubjectSource): Promise<void> {
    this.loadedSource = source;
    this.backendLoadedSourceId = null;
    await this.initializationPromise;
    await this.init();
    const backend = this.backend;
    const lifecycleRevision = this.lifecycleRevision;
    await backend.loadSubject(source);

    if (
      lifecycleRevision === this.lifecycleRevision &&
      backend === this.backend &&
      source === this.loadedSource
    ) {
      this.backendLoadedSourceId = source.id;
    }
  }

  step(dt: number): void {
    if (!this.enabled || this.engine === 'none' || !Number.isFinite(dt) || dt <= 0) {
      return;
    }

    this.backend.step(dt);
  }

  async stepAndWait(dt: number): Promise<void> {
    if (!this.enabled || this.engine === 'none' || !Number.isFinite(dt) || dt <= 0) {
      return;
    }

    if (this.backend.stepAndWait) {
      await this.backend.stepAndWait(dt);
      return;
    }

    this.backend.step(dt);
  }

  async synchronize(): Promise<void> {
    if (!this.enabled || this.engine === 'none') {
      return;
    }

    await this.backend.synchronize?.();
  }

  async resetSimulation(): Promise<void> {
    await this.backend.resetSimulation?.();
  }

  setJointTarget(jointName: string, target: JointTarget): void {
    this.backend.setJointTarget(jointName, target);
  }

  applyBodyImpulse(impulse: PhysicsBodyImpulse): boolean {
    const backendStatus = this.backend.getStatus?.();
    if (
      !this.enabled ||
      this.engine === 'none' ||
      !this.initialized ||
      !this.backendLoadedSourceId ||
      backendStatus?.initialized === false ||
      (backendStatus?.loadedSourceId !== undefined &&
        backendStatus.loadedSourceId !== this.backendLoadedSourceId) ||
      !this.backend.applyBodyImpulse
    ) {
      return false;
    }

    this.backend.applyBodyImpulse(impulse);
    return true;
  }

  clearJointTargets(): void {
    this.backend.clearJointTargets?.();
  }

  releaseJointTargets(targets?: Record<string, JointTarget>): void {
    if (this.backend.releaseJointTargets) {
      this.backend.releaseJointTargets(targets);
      return;
    }

    if (targets) {
      for (const [jointName, target] of Object.entries(targets)) {
        this.backend.setJointTarget(jointName, target);
      }
    }

    this.backend.clearJointTargets?.();
  }

  syncKinematicPose(
    targets: Record<string, JointTarget> = {},
    options: PhysicsKinematicPoseOptions = {}
  ): void {
    if (!this.enabled || this.engine === 'none') {
      return;
    }

    if (this.backend.syncKinematicPose) {
      this.backend.syncKinematicPose(targets, options);
      return;
    }

    this.releaseJointTargets(targets);
  }

  setRuntimeConfig(config: PhysicsRuntimeConfig): void {
    this.backend.setRuntimeConfig?.(config);
  }

  getJointState(jointName: string): JointState {
    return this.backend.getJointState(jointName);
  }

  getBodyTransforms(): BodyTransform[] {
    return this.backend.getBodyTransforms();
  }

  getCenterOfMass(): PhysicsVector3 | null {
    return this.backend.getCenterOfMass();
  }

  snapshot(): PhysicsServiceSnapshot {
    return {
      engine: this.engine,
      enabled: this.enabled,
      initialized: this.initialized,
      loadedSourceId: this.backendLoadedSourceId,
      diagnostics: [...this.diagnostics],
      backendStatus: this.backend.getStatus?.() ?? null
    };
  }

  dispose(): void {
    this.lifecycleRevision += 1;
    this.disposeBackend();
    this.loadedSource = null;
    this.backendLoadedSourceId = null;
    this.initializationPromise = null;
    this.engine = 'none';
    this.backend = new NoopPhysicsBackend();
    this.enabled = false;
    this.initialized = false;
    this.diagnostics = [];
  }

  private disposeBackend(): void {
    this.backend.dispose();
  }
}

function resolvePhysicsErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
