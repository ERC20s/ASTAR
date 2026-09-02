# Architecture

This document defines the model approach, the source layout and the training
pipeline that the group agreed to in governance proposal #2 ("Define Core
Architecture and Bootstrap Training Pipeline").

## What this repository is

`ERC20s/ASTAR` holds two things that must not get in each other's way:

1. The **ASTAR Decentraland scene** — `src/game.ts`, `scene.json`, `models/`,
   built with `build-ecs` into `bin/game.js`. This is existing, working code and
   nothing here changes it.
2. The **AI project** — a from-scratch, GPT-style language model under
   `src/model/` and `src/data/`, trained by `src/train.py` and sampled with
   `src/generate.py`.

They share a repository but not a toolchain. `tsconfig.json` only compiles
`src/**/*.ts`, so Python files under `src/` are invisible to the scene build,
and `.dclignore` now excludes `*.py`, `docs` and `requirements.txt` so they are
never uploaded with the scene content.

## Model approach

A decoder-only transformer (GPT-style) language model, trained from scratch on
plain-text corpora. No pretrained weights, no external inference API — the point
of the group is to build the thing, not to wrap someone else's.

Layer stack, as implemented in `src/model/transformer.py`:

- token embedding + learned positional embedding (`n_positions` block size)
- `n_layer` × pre-norm block: causal multi-head self-attention → MLP (4x, GELU),
  each with a residual connection and dropout
- final LayerNorm, then a linear head tied to the token embedding matrix

Hyperparameters live in one place, `ModelConfig` in `src/model/config.py`, with a
`tiny` preset (4 layers, 4 heads, 128 dims, 128-token context) that trains on a
laptop CPU in minutes. Scaling up is a config change, not a code change.

## Tokenizer and data

Byte-level tokenizer (`src/data/tokenizer.py`): vocabulary of exactly 256
symbols plus nothing else, so any UTF-8 text encodes losslessly and there is no
vocabulary file to build, ship or version. When the group needs BPE, it replaces
this module behind the same `encode` / `decode` interface.

`src/data/dataset.py` memory-maps a `uint16` token array and draws random
contiguous windows for each batch, with a deterministic train/validation split.
`prepare_text` converts a raw `.txt` file into that array.

## Training loop

`src/train.py` is the bootstrap pipeline: AdamW, linear warmup then cosine
decay, gradient clipping at 1.0, periodic validation loss, and a checkpoint
written to `checkpoints/` containing both weights and the config that produced
them. Every knob is a command-line flag with a working default; no environment
variables are read, so nothing new is needed in the `.d8a` `keys:` block.

## Deliberate limits

The group has not secured training compute or a large corpus. This architecture
is therefore sized for a *small working prototype* that a contributor can run
end to end today, with the scaling path written down. Anything larger is a
separate proposal that names the compute and the data.
