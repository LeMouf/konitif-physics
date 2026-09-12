# @konitif/physics

Headless physics backend lifecycle, commands and observations with explicit providers.
Public distribution candidate `0.284.1`; not published yet. The intended
standalone authority is `LeMouf/konitif-physics`. Its repository remains planned
until an independent checkout, CI and exact archive have been reviewed.

```ts
import { PhysicsService } from '@konitif/physics';

const physics = new PhysicsService();
await physics.loadRobot({ id: 'fixture', kind: 'custom' });
physics.setJointTarget('slider', { value: 0.5 });
physics.dispose();
```

The default backend is inactive: it stores joint targets but simulates no physical
effects. Supply `backendFactories`, select an engine and enable the service to
use a real adapter. The caller explicitly drives stepping and owns disposal.
There is no scheduler, renderer, browser API, engine binary or product policy.
Backend identifiers and `loadRobot` retain their existing names for compatibility;
they do not imply an included engine or a specific robot model.

`PhysicsMetadata` describes JSON-shaped source and observation data. It is not
a general JSON utility library or a runtime validator; TypeScript alone does not
exclude non-finite numbers. Impulse admission is not confirmation of a physical
effect. Simulation observations are not evidence of real-device execution.

`PhysicsColliderProxy` and `PhysicsColliderProxyShape` describe proxy geometry
for support calculations and diagnostic presentation. These data-only types
do not construct engine colliders, validate dimensions or prescribe a model.

`PhysicsSimulationProfile` describes authored joint-release and support inputs.
It contains no model-specific defaults or presentation bindings. A host/backend
must explicitly interpret these inputs; exporting the type does not make every
backend apply them or turn them into a runtime command.

`PhysicsObservationProfile` declares an observation scope and body roles.
`centerOfMassBodyName` selects a calculation scope; `auxiliaryBodyNames` and
`contactBodyNames` declare roles, not measured contact, force or confirmation.
Resolving names, applying fallback rules and producing observations belong to
the host/backend; the profile itself does not perform those operations.

## Worker transport

`@konitif/physics/worker` exposes the message protocol and
`PhysicsWorkerBackendAdapter`. Supply both a structural worker port and a
`deadlineHost` that schedules asynchronously and returns idempotent cancellation
functions. The transport owns termination of that worker; do not share it
implicitly with another owner. This entry contains no browser APIs, timers,
worker creation or engine loading. The root entry does not load this transport.

The existing UI constructor remains a compatibility subclass supplying default
timers. It inherits the canonical methods but is not the same constructor
identity as the headless class.

## Build and qualification

Runtime dependencies: none. Build with an externally supplied TypeScript compiler
(verified with 5.9.3): `tsc -p tsconfig.json`. The compiler is not installed or
declared by this package in this development tranche. ESM and declarations are
emitted to `dist`; the configuration does not extend another package.

The repository's `scripts/verify-physics-distribution.mjs` copies these sources
and configuration outside the repository, builds with the supplied compiler,
and runs `npm pack` offline with lifecycle scripts disabled. It verifies the
archive's file list and SHA-512 integrity, then tests ESM execution and NodeNext
declarations using only the extracted package. No installation or publication
is performed. This qualifies the archive, not a real engine or a clean toolchain
installation.

## License

PolyForm Noncommercial 1.0.0; see [LICENSE.md](LICENSE.md).
