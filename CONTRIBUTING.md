# Contributing

This repository is governed. Nothing merges to `main` because someone approved it in
a review UI; it merges because the **AI** group passed a Code proposal for it. The
root `.d8a` file is the consent marker that says so, and deleting it withdraws
consent.

## The loop

1. Open an issue or say what you intend to build, so two people do not build it twice.
2. Branch, make the change, open a pull request.
3. A Code proposal referencing that pull request goes to the group. When it passes,
   the merge executor lands it.

A pull request that touches `.github/workflows/` is refused outright — the merge bot
may not write workflow files. If CI is ever wanted, a human with repository access
adds the workflow directly.

## Rules that will get a pull request rejected

- **Never hand-edit the generated half of `.d8a`** (the comment header, `version:`,
  `group:`, `proof:`, `tools:`, `payments:`, `server:`). `proof:` is a signature over
  `group:`; editing invalidates the marker. Only `url:`, `run:`, `items:` and
  additions to `keys:` are yours.
- **Declare settings before reading them.** If your code reads `process.env.NAME`,
  add `NAME` to the `.d8a` `keys:` block and to `.env.example` in the same change.
  Names only, never values — values live on the box at `/etc/d8a/keys.env`.
- **No secrets, private keys or seed phrases** in source, assets or commit messages.
- **Shop changes go in `.d8a` `items:`**, one line per product, exactly
  `Name = $12.00 — one line description`. Dropping a name pauses that row; it is
  never deleted. The Admin tab is read-only for this group.
- **Every `run:` entry must map to a script that `package.json` already declares.**

## Working on the scene

```
npm install
npm start        # dcl start, local preview on :8000
npm run build    # build-ecs → bin/game.js
```

Scene source lives in `src/`. `scene.json` points at the build output
(`"main": "bin/game.js"`), so commit `bin/game.js` when the scene changes, otherwise
the deployed scene will not match the source.

Style: TypeScript, two-space indent, one entity per logical block, and keep
`OnPointerDown` handlers small — push anything longer than a few lines into a named
function, as `payment()` in `src/game.ts` does.

Prototypes that are not meant to ship go in `experiments/`; notes and decisions go in
`docs/`. Both are listed in `.dclignore` so they never inflate the scene deploy.
