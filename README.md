# ASTAR

This repository holds two projects that share a home:

1. **The ASTAR Decentraland scene** — the unofficial ASTAR meet-up venue
   (`src/game.ts`, `scene.json`, `models/`).
2. **The ASTAR AI project** — a GPT-style language model built from scratch
   (`src/model/`, `src/data/`, `src/train.py`, `src/generate.py`), defined by
   governance proposal #2 and described in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

The two toolchains do not overlap: `tsconfig.json` only compiles `src/**/*.ts`,
and `.dclignore` keeps the Python sources, `docs/` and `requirements.txt` out of
the scene upload.

## The AI project

Setup:

```
python -m venv .venv
. .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

Prepare a corpus (the bundled sample runs in seconds; swap in your own text with
`--source`):

```
python -m src.data.dataset --source src/data/sample_corpus.txt --out data/corpus.bin
```

Train, then sample:

```
python -m src.train --data data/corpus.bin --preset tiny --max-steps 500
python -m src.generate --prompt "The model is" --tokens 200
```

The same commands are wired as npm scripts (`npm run ai:prepare`,
`npm run ai:train`, `npm run ai:generate`) so the `.d8a` `run:` block can launch
them; they need Python on PATH, not Node.

What is in the box:

- `src/model/config.py` — every hyperparameter, plus the `tiny` / `small` /
  `medium` presets. Scaling up is a config change.
- `src/model/transformer.py` — causal multi-head self-attention, pre-norm
  blocks, weight-tied LM head, `generate()` with temperature and top-k.
- `src/data/tokenizer.py` — byte-level tokenizer, 256 symbols, lossless.
- `src/data/dataset.py` — memory-mapped token stream, deterministic
  train/validation split, random-window batching.
- `src/train.py` — AdamW, warmup + cosine decay, gradient clipping, periodic
  validation, checkpoints written to `checkpoints/`.

Roadmap:

- **Now** — `tiny` preset trains end to end on CPU on a small corpus.
- **Next** — a real corpus and the `small` preset; a byte-pair tokenizer behind
  the existing `encode` / `decode` interface; an evaluation harness that reports
  validation loss per checkpoint.
- **Later** — the `medium` preset on rented compute, and a serving entry point.
  Both need a proposal that names the compute and the data.

No environment variables are read, so nothing new is required in the `.d8a`
`keys:` block.

## The Decentraland scene

```
npm install -g decentraland
npm install
dcl start --web3
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Changes land on `main` only through a
pull request that the group approves with a Code proposal — the root `.d8a` file
is the consent marker that says so.
