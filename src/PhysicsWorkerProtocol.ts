import type { JointState, BodyTransform, PhysicsVector3, PhysicsBackendStatus } from './contracts.js';

export type PhysicsWorkerCommand =
  | 'init'
  | 'loadSubject'
  | 'step'
  | 'stepAndWait'
  | 'synchronize'
  | 'resetSimulation'
  | 'setJointTarget'
  | 'applyBodyImpulse'
  | 'clearJointTargets'
  | 'releaseJointTargets'
  | 'syncKinematicPose'
  | 'setRuntimeConfig'
  | 'dispose';

export interface PhysicsWorkerStatePayload {
  jointStates?: JointState[];
  bodyTransforms?: BodyTransform[];
  centerOfMass?: PhysicsVector3 | null;
  status?: PhysicsBackendStatus;
}

export interface PhysicsWorkerRequest {
  id: number;
  command: PhysicsWorkerCommand;
  payload?: unknown;
}

export interface PhysicsWorkerResponse {
  id: number;
  ok: boolean;
  payload?: PhysicsWorkerStatePayload | null;
  error?: string;
}

export interface PhysicsWorkerStateMessage {
  type: 'state';
  payload: PhysicsWorkerStatePayload;
}

export type PhysicsWorkerMessage = PhysicsWorkerResponse | PhysicsWorkerStateMessage;
