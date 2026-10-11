# GitDiagram architecture — @konitif/physics

This architecture view was generated from the public repository by [GitDiagram](https://gitdiagram.com/lemouf/konitif-physics) on 2026-09-20 18:45:09 UTC.

It is a documentation projection of the repository tree, README, and source files sampled by GitDiagram. It does not replace the authored contracts in [catalog.json](catalog.json) and [diagrams.json](diagrams.json), nor does it establish runtime authority.

The Mermaid source keeps GitDiagram's groups, nodes, relationships, and source links. GitDiagram's forced color classes and HTML line breaks are omitted so the diagram remains readable in local previews and dark themes.

- Public repository: [konitif-physics](https://github.com/LeMouf/konitif-physics)
- Interactive diagram: [Open in GitDiagram](https://gitdiagram.com/lemouf/konitif-physics)

## Architecture diagram

```mermaid
flowchart TD

subgraph group_api["Service API"]
  node_service["Physics Service — [PhysicsService.ts]"]
end

subgraph group_data["Physics Contracts"]
  node_contracts["Physics Contracts — [contracts.ts]"]
  node_simulation_profiles["Simulation Profiles"]
  node_observation_profiles["Observation Profiles"]
  node_collider_geometry["Collider Geometry"]
end

subgraph group_backends["Backend Runtime"]
  node_noop_backend["Noop Backend"]
  node_physics_provider(("Physics Provider"))
end

subgraph group_worker["Worker Transport"]
  node_worker_adapter["Worker Adapter"]
  node_worker_protocol["Worker Protocol"]
  node_worker_host["Worker Host Boundary"]
end

node_consumer(("Physics Consumer"))
node_worker_runtime(("Worker Runtime"))
node_deadline_host(("Deadline Host"))

node_consumer -->|"authors inputs"| node_contracts
node_consumer -->|"authors profiles"| node_simulation_profiles
node_consumer -->|"authors profiles"| node_observation_profiles
node_consumer -->|"defines geometry"| node_collider_geometry
node_consumer -->|"controls lifecycle"| node_service
node_service -->|"exchanges data"| node_contracts
node_service -.->|"dispatches backend"| node_physics_provider
node_service -->|"falls back"| node_noop_backend
node_service -->|"returns observations"| node_consumer
node_consumer -.->|"configures adapter"| node_worker_adapter
node_worker_adapter -->|"formats messages"| node_worker_protocol
node_worker_adapter -->|"uses port"| node_worker_host
node_worker_adapter -->|"schedules deadlines"| node_deadline_host
node_worker_adapter -->|"posts commands"| node_worker_runtime
node_worker_runtime -->|"returns state"| node_worker_adapter

click node_service "https://github.com/lemouf/konitif-physics/blob/main/src/PhysicsService.ts"
click node_contracts "https://github.com/lemouf/konitif-physics/blob/main/src/contracts.ts"
click node_simulation_profiles "https://github.com/lemouf/konitif-physics/blob/main/src/simulationProfile.ts"
click node_observation_profiles "https://github.com/lemouf/konitif-physics/blob/main/src/observationProfile.ts"
click node_collider_geometry "https://github.com/lemouf/konitif-physics/blob/main/src/colliderGeometry.ts"
click node_noop_backend "https://github.com/lemouf/konitif-physics/blob/main/src/NoopPhysicsBackend.ts"
click node_worker_adapter "https://github.com/lemouf/konitif-physics/blob/main/src/PhysicsWorkerBackendAdapter.ts"
click node_worker_protocol "https://github.com/lemouf/konitif-physics/blob/main/src/PhysicsWorkerProtocol.ts"
click node_worker_host "https://github.com/lemouf/konitif-physics/blob/main/src/PhysicsWorkerHost.ts"

```

## Generated analysis

@konitif/physics is a headless physics lifecycle and contract package. A consumer authors a subject and profiles, configures PhysicsService, selects an injected backend, loads the subject, submits targets or impulses, steps or synchronizes simulation, and reads joint/body observations before disposal. The default Noop backend records targets without simulation. An optional worker adapter transports backend commands and state through an explicit worker boundary; actual physics engines and worker hosts remain external. Sampled source covers orchestration, contracts, fallback behavior, and worker transport, but not concrete engine providers.
