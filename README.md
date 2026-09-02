# ASTAR

This repository holds two things:

- the **ASTAR event scene** — a Decentraland (SDK6) build, in `src/game.ts` with
  its assets in `models/` and `images/`;
- the **ASTAR AI baseline** — the group's from-scratch language model, its data
  pipeline and its training loop, in `ai/`.

They share a `package.json` and nothing else. The AI code adds no dependency to
the scene and is excluded from the scene bundle by `.dclignore`.

## View the scene

Node.js 8+ and the Decentraland CLI:

```
npm install -g decentraland
git clone https://github.com/ERC20s/ASTAR
cd ASTAR
npm install
dcl start --web3        # or: npm start
```

## Train the model

Node.js 12+. Nothing to install beyond the repository itself — the model, the
optimiser and the data pipeline are plain Node with no external packages.

```
npm run ai:test         # gradient check + loss-decrease check, a few seconds
npm run train           # trains on ai/data/sample.txt, writes ai/checkpoints/baseline.json
npm run sample          # generates text from that checkpoint
```

Options are passed through, for example:

```
npm run train -- --data ai/data/sample.txt --steps 2000 --hidden 128 --seed 1337
npm run sample -- --prompt "the group " --length 300 --temperature 0.8
```

A run prints the corpus size, the vocabulary size, the parameter count, the
train and validation loss as it goes, and a short sample at the end. It exits
non-zero if the loss did not improve, so a broken run cannot pass silently.

See `ai/README.md` for the file-by-file layout, the expected data format and
what comes after the baseline.
