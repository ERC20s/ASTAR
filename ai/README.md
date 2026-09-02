# ASTAR AI — baseline training pipeline

This folder is the group's AI work: a character-level language model, its data
pipeline and its training loop, written from scratch in plain Node (CommonJS),
with **no dependencies to install**. It is separate from the Decentraland scene
in `src/` and is excluded from the scene bundle by `.dclignore`.

## Requirements

Node.js 12 or newer. Nothing else — no Python, no native build, no GPU.

## Run it

```
npm run ai:test        # gradient check + "the loss goes down" check (seconds)
npm run train          # train the baseline, write ai/checkpoints/baseline.json
npm run sample         # generate text from the last checkpoint
```

Useful flags (all optional, all have defaults in `ai/src/train.js`):

```
npm run train -- --data ai/data/sample.txt --steps 2000 --batch-size 64 \
                 --block-size 12 --emb-dim 32 --hidden 128 --lr 0.05 --seed 1337
npm run sample -- --prompt "the group " --length 300 --temperature 0.8
```

## Layout

| file | what it does |
| --- | --- |
| `src/data.js` | loads a UTF-8 text corpus, builds the character vocabulary, encodes/decodes, splits train/val, samples batches |
| `src/model.js` | `MLPLanguageModel`: embedding → concatenated context → `tanh` hidden layer → softmax over the vocabulary; forward, loss, backward, generate, save/load |
| `src/optim.js` | AdamW with decoupled weight decay, global gradient clipping, warmup + cosine learning-rate schedule |
| `src/train.js` | the training entry point: config, loop, evaluation, checkpointing, sample print |
| `src/sample.js` | loads a checkpoint and generates text |
| `src/smoke-test.js` | gradient check, loss-decrease check, checkpoint round-trip check |
| `src/rng.js` | seeded PRNG so every run is reproducible |
| `src/args.js` | `--flag value` parsing with defaults |
| `data/sample.txt` | placeholder corpus so a clone can train immediately |
| `checkpoints/` | written by training; not committed |

## Data format

One plain UTF-8 text file. The loader reads it as a character stream, so any
prose, transcript or log works unchanged. Point at your own with `--data`.
Larger corpora belong outside git; keep the placeholder small.

## What "it worked" means

`npm run ai:test` prints `all checks passed`, and `npm run train` ends with a
`closing loss` well below both its `opening loss` and the printed `uniform loss`
(`ln(vocabSize)`, the score of a model that has learned nothing). Training exits
non-zero if the loss did not improve, so a broken run cannot look like a good one.

## Where this goes next

The model boundary — forward / loss / backward / params / save / load — is meant
to stay put while the model behind it changes: a real tokenizer, a longer
context, self-attention instead of a concatenated window, then more data. Each
of those is a separate pull request and a separate Code proposal.
