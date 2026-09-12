import type {
  BodyTransform,
  PhysicsBackendStatus,
  JointState,
  JointTarget,
  PhysicsBackend,
  PhysicsEngineType,
  PhysicsKinematicPoseOptions,
  PhysicsRuntimeConfig,
  PhysicsVector3,
  RobotPhysicsSource
} from './contracts.js';

export class NoopPhysicsBackend implements PhysicsBackend {
  readonly engine: PhysicsEngineType = 'none';

  private loadedSourceId: string | null = null;
  private readonly jointTargets = new Map<string, JointTarget>();

  async init(): Promise<void> {
    return undefined;
  }

  async loadRobot(source: RobotPhysicsSource): Promise<void> {
    this.loadedSourceId = source.id;
  }

  step(_dt: number): void {
    return undefined;
  }

  async stepAndWait(_dt: number): Promise<void> {
    return undefined;
  }

  async synchronize(): Promise<void> {
    return undefined;
  }

  resetSimulation(): void {
    this.jointTargets.clear();
  }

  setJointTarget(jointName: string, target: JointTarget): void {
    this.jointTargets.set(jointName, target);
  }

  clearJointTargets(): void {
    this.jointTargets.clear();
  }

  releaseJointTargets(targets: Record<string, JointTarget> = {}): void {
    this.jointTargets.clear();

    for (const [jointName, target] of Object.entries(targets)) {
      this.jointTargets.set(jointName, target);
    }
  }

  syncKinematicPose(targets: Record<string, JointTarget> = {}, _options: PhysicsKinematicPoseOptions = {}): void {
    this.releaseJointTargets(targets);
  }

  setRuntimeConfig(_config: PhysicsRuntimeConfig): void {
    return undefined;
  }

  getJointState(jointName: string): JointState {
    const target = this.jointTargets.get(jointName);

    return {
      name: jointName,
      value: target?.value ?? 0,
      velocity: target?.velocity,
      force: target?.force
    };
  }

  getBodyTransforms(): BodyTransform[] {
    return [];
  }

  getCenterOfMass(): PhysicsVector3 | null {
    return null;
  }

  getStatus(): PhysicsBackendStatus {
    return {
      engine: this.engine,
      initialized: true,
      loadedSourceId: this.loadedSourceId,
      metadata: {
        bodyTransformCount: 0,
        jointStateCount: this.jointTargets.size,
        centerOfMassAvailable: false,
        stepCount: 0,
        simulatedTime: 0
      }
    };
  }

  dispose(): void {
    this.loadedSourceId = null;
    this.jointTargets.clear();
  }
}
