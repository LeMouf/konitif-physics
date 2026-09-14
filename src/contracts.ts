import type { PhysicsMetadata } from './metadata.js';

export type PhysicsEngineType = 'none' | 'mujoco' | 'physx';

export type PhysicsSourceKind = 'mjcf' | 'urdf' | 'physx-scene' | 'custom';

export type JointTargetMode = 'position' | 'velocity' | 'torque';

export interface PhysicsVector3 {
  x: number;
  y: number;
  z: number;
}

export interface PhysicsQuaternion {
  x: number;
  y: number;
  z: number;
  w: number;
}

/** Authored source for any physical subject admitted by a backend. */
export interface PhysicsSubjectSource {
  id: string;
  kind: PhysicsSourceKind;
  label?: string;
  url?: string;
  sourceText?: string;
  visualSubjectId?: string | null;
  metadata?: PhysicsMetadata;
}

export interface JointTarget {
  mode?: JointTargetMode;
  value?: number;
  velocity?: number;
  force?: number;
}

export interface PhysicsRootPose {
  position: PhysicsVector3;
  rotation: PhysicsQuaternion;
}

export interface PhysicsKinematicPoseOptions {
  resetRoot?: boolean;
  rootPose?: PhysicsRootPose;
  clearDynamics?: boolean;
  retainTargets?: boolean;
}

export interface PhysicsRuntimeConfig {
  stepDtSeconds?: number;
  maxSubsteps?: number;
}

/** One instantaneous world-space momentum transfer to a simulated body. */
export interface PhysicsBodyImpulse {
  bodyName: string;
  impulse: PhysicsVector3;
  /** Optional world-space point of application, used to derive angular impulse. */
  point?: PhysicsVector3;
}

export interface JointState {
  name: string;
  value: number;
  velocity?: number;
  force?: number;
  lowerLimit?: number | null;
  upperLimit?: number | null;
  metadata?: PhysicsMetadata;
}

export interface BodyTransform {
  bodyName: string;
  position: PhysicsVector3;
  rotation: PhysicsQuaternion;
  scale?: PhysicsVector3;
  sourceBodyName?: string;
  metadata?: PhysicsMetadata;
}

export interface PhysicsBackendStatus {
  engine: PhysicsEngineType;
  initialized: boolean;
  loadedSourceId?: string | null;
  diagnostics?: PhysicsBackendDiagnostic[];
  metadata?: PhysicsMetadata;
}

export interface PhysicsBackendDiagnostic {
  id: string;
  severity: 'info' | 'warning' | 'error';
  message: string;
  metadata?: PhysicsMetadata;
}

export interface PhysicsBackend {
  readonly engine: PhysicsEngineType;
  init(): Promise<void>;
  loadSubject(source: PhysicsSubjectSource): Promise<void>;
  step(dt: number): void;
  /** Advances one explicit simulation slice and resolves with its resulting state. */
  stepAndWait?(dt: number): Promise<void>;
  /** Waits until every command posted before this barrier is reflected by getters. */
  synchronize?(): Promise<void>;
  resetSimulation?(): void | Promise<void>;
  setJointTarget(jointName: string, target: JointTarget): void;
  applyBodyImpulse?(impulse: PhysicsBodyImpulse): void;
  clearJointTargets?(): void;
  releaseJointTargets?(targets?: Record<string, JointTarget>): void;
  syncKinematicPose?(targets?: Record<string, JointTarget>, options?: PhysicsKinematicPoseOptions): void;
  setRuntimeConfig?(config: PhysicsRuntimeConfig): void;
  getJointState(jointName: string): JointState;
  getBodyTransforms(): BodyTransform[];
  getCenterOfMass(): PhysicsVector3 | null;
  getStatus?(): PhysicsBackendStatus;
  dispose(): void;
}

export type PhysicsBackendFactory = () => PhysicsBackend | Promise<PhysicsBackend>;

export type PhysicsBackendFactoryRegistry = Partial<Record<Exclude<PhysicsEngineType, 'none'>, PhysicsBackendFactory>>;

export interface PhysicsServiceSnapshot {
  engine: PhysicsEngineType;
  enabled: boolean;
  initialized: boolean;
  loadedSourceId: string | null;
  diagnostics: PhysicsBackendDiagnostic[];
  backendStatus?: PhysicsBackendStatus | null;
}

/**
 * Consumer-facing simulation service contract, independent of any renderer or backend class.
 * The caller decides execution authority and disposal ownership; injection transfers neither.
 */
export interface PhysicsServicePort {
  setEnabled(enabled: boolean): void;
  setEngine(engine: PhysicsEngineType): Promise<void>;
  loadSubject(source: PhysicsSubjectSource): Promise<void>;
  step(dt: number): void;
  /** Resolves when the explicit simulation step has completed. */
  stepAndWait(dt: number): Promise<void>;
  /** Barrier for prior commands before reading resulting state. */
  synchronize(): Promise<void>;
  resetSimulation(): Promise<void>;
  setJointTarget(jointName: string, target: JointTarget): void;
  /** True means the impulse was admitted, not that its physical effect is confirmed. */
  applyBodyImpulse(impulse: PhysicsBodyImpulse): boolean;
  clearJointTargets(): void;
  releaseJointTargets(targets?: Record<string, JointTarget>): void;
  syncKinematicPose(targets?: Record<string, JointTarget>, options?: PhysicsKinematicPoseOptions): void;
  setRuntimeConfig(config: PhysicsRuntimeConfig): void;
  getJointState(jointName: string): JointState;
  getBodyTransforms(): BodyTransform[];
  getCenterOfMass(): PhysicsVector3 | null;
  snapshot(): PhysicsServiceSnapshot;
  dispose(): void;
}
