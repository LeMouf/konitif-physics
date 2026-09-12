# Physics public baseline

This repository starts from the reviewed `@konitif/physics@0.284.1` source
snapshot. It owns headless physics contracts, explicit backend lifecycle and a
structural worker transport. It does not include a renderer, browser worker,
physics engine, robot model, scheduler or product policy.

The initial public archive must remain dependency-free at runtime and expose
only `@konitif/physics` and `@konitif/physics/worker`. The PolyForm
Noncommercial 1.0.0 licence is unchanged.

Local archive, ESM and NodeNext checks qualify a candidate; they do not prove a
real engine integration, robot behavior, npm publication or GitHub provenance.
The first remote commit, CI run, protected release environment, tag and npm
artifact must each be observed separately.
