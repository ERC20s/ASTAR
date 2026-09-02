# Contributing

## How a change lands

This repository is governed. The root `.d8a` file names the group whose vote
merges code; nothing reaches `main` without it.

1. Open an issue or a governance proposal describing the change, if it is more
   than a fix.
2. Branch from `main`, make the change, open a pull request.
3. A Code proposal referencing that pull request goes to the group. When it
   passes, the merge executor lands it.

Do not edit the generated half of `.d8a` (`version:`, `group:`, `proof:`,
`tools:`, `payments:`). A pull request that touches those lines is wrong — the
`proof:` line is a signature over `group:` and a hand edit invalidates it. The
`url:` line and the `run:` block are the developer half and may be changed.

## The AI project (Python)

- Target Python 3.9+ and the pins in `requirements.txt`. Do not add a dependency
  without saying in the pull request why the standard library and torch are not
  enough.
- Keep hyperparameters in `src/model/config.py`. Code should read config, not
  hardcode numbers.
- Keep the tokenizer interface (`encode`, `decode`) stable; a better tokenizer
  is a drop-in replacement, not a new API.
- Type-annotate public functions, keep lines under 100 characters, and prefer a
  readable implementation over a clever one — this repository is meant to be
  read by people learning the architecture.
- If a change reads a setting from the environment, add its NAME to the `keys:`
  block of `.d8a` and to `.env.example` in the same pull request. Never a value.
- Before opening the pull request, run the pipeline once:

  ```
  python -m src.data.dataset --source src/data/sample_corpus.txt --out data/corpus.bin
  python -m src.train --data data/corpus.bin --preset tiny --max-steps 50
  ```

  and paste the last log line into the description.

## The Decentraland scene (TypeScript)

- The scene is SDK6 (`decentraland-ecs`), built with `build-ecs` into
  `bin/game.js`. `dcl start --web3` runs it locally.
- Only `.ts` files under `src/` are compiled. Python files are ignored by the
  scene build and excluded from the upload by `.dclignore`; keep it that way.
- Do not commit new binary models without saying where they came from and under
  what licence.

## Commits

One logical change per pull request. Write commit messages in the imperative
("Add cosine learning rate decay"), and reference the proposal number when the
change implements one.
