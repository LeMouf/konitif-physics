# Release boundary

`@konitif/physics` is published only from the standalone
`LeMouf/konitif-physics` repository. A merge does not publish a package.

Before release:

1. install exactly the reviewed lockfile with lifecycle scripts disabled;
2. build ESM and declarations with the locked TypeScript compiler;
3. run the package contracts and isolated archive consumer;
4. review the exact archive file list, integrity and version;
5. require a matching protected `v<version>` tag and the `npm-release`
   environment;
6. publish that verified archive through GitHub Actions OIDC.

Publication additionally requires the repository variable
`PHYSICS_NPM_PUBLISH_ENABLED=true`. Future tags trigger the protected workflow
directly. Because the initial `v0.284.1` tag predates that workflow, its first
publication uses the manual workflow input with exactly `v0.284.1`; the
workflow checks out and publishes the tagged source rather than `main`.

No workflow may download an engine, browser, robot asset or vendor adapter.
The release proves the headless package boundary only.
