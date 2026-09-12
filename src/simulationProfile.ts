import type { PhysicsColliderProxy } from './colliderGeometry.js';

/** Authored simulation inputs; the host/backend decides how they are applied. */
export interface PhysicsSimulationProfile {
  releaseLockedJointNames?: string[];
  bodyColliderProxies?: Record<string, PhysicsColliderProxy[]>;
  supportBodyNames?: string[];
  supportBodyGroundClearance?: Record<string, number>;
}
