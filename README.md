# ASTAR

ASTAR EVENT — a Decentraland SDK6 scene, governed by the **AI** group through the
root [`.d8a`](./.d8a) consent marker. Code lands on `main` only when a Code proposal
from that group passes a vote.

This README is the single entry point the group agreed to in proposal #1
("Bootstrap the initial AI project scaffold"). Start here, then read
[ROADMAP.md](./ROADMAP.md) for what to build next and
[CONTRIBUTING.md](./CONTRIBUTING.md) for how a change gets in.

## What is in this repository today

The working tree is a Decentraland SDK6 scene, not a model-training project. That is
the honest starting point, and the scaffold below is laid on top of it rather than
over it.

| Path | What it is |
| --- | --- |
| `src/game.ts` | The scene source. Builds the logo, walls and two interactive entities; wires `OnPointerDown` handlers to `EthereumController`. |
| `bin/game.js` | Build output (`npm run build`), referenced by `scene.json` as `"main": "bin/game.js"`. |
| `scene.json` | Scene manifest: title, 30 parcels, spawn point, `requiredPermissions`. |
| `models/`, `images/`, `*.svg`, `*.png` | Scene assets shipped with the deploy. |
| `docs/` | Written notes; see [docs/architecture.md](./docs/architecture.md). |
| `experiments/` | Throwaway prototypes, kept out of the scene bundle. |
| `.d8a` | Governance marker plus the `run:` block the platform launches. |

## Scope and non-goals

**Scope.** One venue and one codebase the group controls end to end: the ASTAR scene
as the public surface, a documented layout, and a roadmap that lets the group's AI
work land here incrementally without a rewrite.

**Non-goals (for now).**

- No model architecture, training framework or compute strategy is chosen here. The
  roadmap deliberately stops short of that; the group has not debated it.
- No secrets, keys or wallet material in the repository. Settings are declared by
  NAME in the `.d8a` `keys:` block and set on the server. Nothing in this change
  reads an environment variable, so `keys:` is untouched.
- No new payment flow. The group's checkout and shop widget already exist in the
  `.d8a` generated blocks; do not hand-roll another one.

## Running it

```
npm install        # SDK6 toolchain (decentraland-ecs), not sdk-commands
npm start          # dcl start — local preview on http://localhost:8000
npm run build      # build-ecs → bin/game.js
npm run watch      # rebuild on change
```

The platform runs the same thing from the `.d8a` `run:` block, entry `scene`
(`npm start`, port 8000). That entry is what the public site is proxied to.

## Governance in one paragraph

`.d8a` names the group (`group: d8a:ai`) and carries a `proof:` signature over it.
Never hand-edit anything above the `# url:` comment. `items:` is the shop (currently
absent, so the store is empty), `keys:` is settings by name, and the `run:` block is
what starts. Everything else goes through a proposal.
