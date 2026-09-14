# @konitif/physics

Headless physics lifecycle, command and observation contracts with explicit
backend providers.

## Installation

```sh
npm install @konitif/physics
```

## What it provides

- `PhysicsService` for backend selection, articulated-subject loading, stepping
  and disposal.
- `NoopPhysicsBackend` for an explicitly inactive simulation boundary.
- Data-only collider, simulation and observation profiles.
- Worker protocol contracts and `PhysicsWorkerBackendAdapter` through a separate
  entry point.

## Authority boundary

The package coordinates a selected backend but includes no physics engine,
model asset, scheduler, renderer or domain policy. An admitted command is not
proof of a physical effect, and a simulation observation is not evidence of
external-system execution. Hosts provide engines, clocks and model-specific
rules.

## Quick start

```ts
import { PhysicsService } from '@konitif/physics';

const physics = new PhysicsService();
await physics.loadSubject({ id: 'fixture', kind: 'custom' });
physics.setJointTarget('slider', { value: 0.5 });
physics.dispose();
```

The default backend records targets but does not simulate. Supply explicit
`backendFactories`, select a backend and enable the service for real stepping.
`PhysicsSubjectSource` describes the admitted physical source independently of
its visual projection or domain-specific identity.

## Public entry points

| Entry | Purpose |
| --- | --- |
| `@konitif/physics` | Service lifecycle, backend and physics data contracts. |
| `@konitif/physics/worker` | Worker protocol and explicit-host transport adapter. |

## Reference

See [`reference/`](reference/) for the machine-readable capability catalog and
authority diagrams. Profiles describe authored inputs; they do not apply
themselves to a backend.

## License

Source-available under [PolyForm Noncommercial 1.0.0](LICENSE.md), not OSI open
source. Commercial use requires separate written authorization.
