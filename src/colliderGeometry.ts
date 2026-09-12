import type { PhysicsQuaternion, PhysicsVector3 } from './contracts.js';

/** Proxy geometry shared by support calculations and diagnostic presentation. */
export type PhysicsColliderProxyShape = 'sphere' | 'box' | 'capsule' | 'ellipsoid';

export interface PhysicsColliderProxy {
  shape: PhysicsColliderProxyShape;
  size?: number[];
  fromTo?: number[];
  position?: PhysicsVector3;
  rotation?: PhysicsQuaternion;
  label?: string;
}
