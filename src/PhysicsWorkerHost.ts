/** Structural worker boundary; the adapter owns termination as before. */
export interface PhysicsWorkerPort<Message = unknown> {
  postMessage(message: unknown): void;
  addEventListener(type: 'message', listener: (event: { data: Message }) => void): void;
  addEventListener(type: 'error', listener: (event: { message: string }) => void): void;
  removeEventListener(type: 'message', listener: (event: { data: Message }) => void): void;
  removeEventListener(type: 'error', listener: (event: { message: string }) => void): void;
  terminate(): void;
}

export interface PhysicsWorkerDeadlineHost {
  /** Schedule asynchronously; return an idempotent cancellation function. */
  schedule(callback: () => void, delayMs: number): () => void;
}
