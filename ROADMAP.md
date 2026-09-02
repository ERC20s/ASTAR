# Roadmap

Three milestones, deliberately high-level. Proposal #1 committed the group to a
roadmap that does *not* pre-decide architecture or compute strategy, so this file
says what has to exist and in what order, not which framework wins.

Each milestone lands through its own pull request and its own Code proposal.

## M1 — Groundwork (this change)

- README, LICENSE, CONTRIBUTING, ROADMAP, `docs/`, `experiments/`.
- An accurate map of what the repository already contains, so contributors stop
  guessing: `src/game.ts` → `bin/game.js` → `scene.json`.
- The `.d8a` `run:` entry describes how the project actually starts.

**Done when** a new contributor can clone, run `npm install && npm start`, and know
from the README alone what this is and what to build next.

## M2 — A minimal prototype surface

- One small, self-contained feature built end to end in `src/`, with its notes in
  `docs/`, to prove the propose → build → Code proposal → merge loop works with real
  code and not just documentation.
- Candidate: replace the placeholder in `src/game.ts` —

  ```ts
  export function requirePayment(arg0: number, arg1: number, arg2: string) {
    throw new Error("Function not implemented.");
  }
  ```

  which is dead code sitting next to a live `eth.requirePayment(...)` call, and clean
  up the hover text that currently reads "(NOT ACTUALLY WORKING)".

**Done when** one behavioural change ships through governance without anyone editing
the generated half of `.d8a`.

## M3 — Something to sell, and a way to tell whether it worked

- The store is empty today, so the widget prints "Nothing for sale right now"
  whatever the code does. Stocking it is a `.d8a` `items:` change in a Code
  proposal — for example an event pass or a wearable claim — priced at the floor of
  `$1.00` or above.
- A release handler for the `group-store:paid` DOM event that the shipped `payments:`
  widget fires when a buyer returns with `?d8a_order=<id>`. Copy that widget as it
  stands; do not write a second checkout.
- A short evaluation note per milestone in `docs/`: what changed, what we measured.

**Done when** a member can buy one listed item and receive it automatically.

## Deliberately not scheduled

Model architecture, training pipelines and compute procurement. The group agreed in
#2 and #3 to define architecture before building it; when that decision exists,
it gets its own section here, not an assumption baked in now.
