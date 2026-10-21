# To view this scene.

This is a Decentraland SDK6 scene (`decentraland-ecs` 6.6.8), previewed with the
`dcl` CLI from the `decentraland` npm package (not `sdk-commands`).

  Node.js 20 or 22 (both tested; the `decentraland` CLI 3.x needs Node 16+)

  npm install -g decentraland@3.11.2

  git clone https://github.com/ERC20s/ASTAR

  cd ASTAR

  npm ci

  npm start

The preview server listens on http://127.0.0.1:8000. Run `npm ci` before
anything else: the committed `node_modules` only has Windows `.bin` shims, so
`npm run build` and `npm start` fail with `build-ecs: Permission denied` on
Linux/macOS until it is reinstalled.

`npm run build` compiles `src/game.ts` into `bin/game.js` and fails on
TypeScript errors; CI runs it on Node 20 and 22.

CLI versions 3.12.0 and later download `@dcl/protocol` from
`sdk-team-cdn.decentraland.org` while installing; 3.11.2 installs from the npm
registry alone.
