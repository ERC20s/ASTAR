# Architecture

How the pieces fit today. Written from the files in the repository, not from
intentions.

## The build chain

```
src/game.ts  --(npm run build → build-ecs)-->  bin/game.js  <--  scene.json "main"
```

`package.json` declares the whole toolchain:

```json
"scripts": {
  "start": "dcl start",
  "build": "build-ecs",
  "watch": "build-ecs --watch"
},
"devDependencies": { "decentraland-ecs": "latest" }
```

This is the SDK6 toolchain (`decentraland-ecs` + `build-ecs`), not the newer
`sdk-commands`. The `.d8a` `run:` block says the same thing in its `// setup` note,
so do not "upgrade" one without the other.

`bin/game.js` is committed build output. `scene.json` loads it:

```json
"main": "bin/game.js"
```

Consequence: a source change that is not rebuilt does not reach the deployed scene.

## The scene

`scene.json` claims 30 parcels with base `-141,-25`, spawns the visitor at
`(70, 1, 42.25)`, and requests `ALLOW_TO_MOVE_PLAYER_INSIDE_SCENE`.

`src/game.ts` creates four things:

- `logo` — `models/logo.glb`, rotated every frame by `SimpleRotate`, an `ISystem`
  registered with `engine.addSystem(new SimpleRotate())`; clicking opens
  `https://plasm.network`.
- `wall` — `models/walls2.glb` at the origin.
- `polkadot` — `models/eth.glb`; its `OnPointerDown` calls `payment()`, which wraps
  `eth.requirePayment(...)` in `executeTask` with a `try/catch` that logs
  `"failed process payment"`.
- `ethswap` — `models/sdn.glb`; signs a message via
  `eth.convertMessageToObject` / `eth.signMessage` and logs the signature.

Both wallet interactions go through `@decentraland/EthereumController`, and both are
labelled to the visitor as not fully working. Treat them as unfinished, not as a
payment system: the group's real checkout is the `payments:` widget in `.d8a`, which
settles to the group's shared credit balance at the prices in `items:`.

## What runs, and where the site is

`.d8a`:

```
run:
  {
    "// setup": "npm i once - this is the SDK6 toolchain (decentraland-ecs), not sdk-commands",
    "scene": { "cmd": "npm start", "port": 8000 }
  }
```

`// setup` starts with `// `, so it is a note and is never launched. `scene` is the
only live entry; because it is the first entry declaring a port, it is what the
public site is proxied to. `dcl start` serves the preview on 8000.

## Settings

No file in this repository reads an environment variable, so `.d8a` has no `keys:`
block and none is added here. The first change that reads one adds the NAME to
`keys:` and to `.env.example` in the same pull request.

## Assets and the deploy bundle

`.dclignore` decides what is *not* uploaded. Source, tooling, docs and experiments
are excluded; `models/`, `images/` and the root `.svg`/`.png` assets are shipped.
