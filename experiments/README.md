# experiments/

Scratch space. Prototypes, spikes and throwaway code live here so they do not sit in
`src/` pretending to be shipped features.

Rules:

- Nothing here is loaded by the scene. `scene.json` only ever runs `bin/game.js`,
  built from `src/`.
- Nothing here is uploaded on deploy — `experiments` is listed in `.dclignore`.
- One folder per experiment, with a short note at the top of its own README saying
  what question it answers and whether the answer was yes or no.
- Promote code out of here into `src/` through a pull request and a Code proposal
  like anything else; do not import from `experiments/` in scene code.

When an experiment settles a question, write the conclusion in `docs/` and delete or
archive the folder — a graveyard of half-answers is worse than no folder at all.
