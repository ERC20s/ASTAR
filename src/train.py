"""Bootstrap training loop for the ASTAR language model.

Usage:

    python -m src.data.dataset --source src/data/sample_corpus.txt --out data/corpus.bin
    python -m src.train --data data/corpus.bin --preset tiny --max-steps 500

Every knob is a command-line flag with a working default. No environment
variables are read, so the .d8a `keys:` block needs nothing new.
"""

import argparse
import json
import math
import os
import time
from typing import Dict

import torch

from .data.dataset import TokenDataset
from .model.config import ModelConfig, TrainConfig, PRESETS, preset
from .model.transformer import AstarLM


def resolve_device(name: str) -> str:
    if name != "auto":
        return name
    return "cuda" if torch.cuda.is_available() else "cpu"


def lr_at(step: int, cfg: TrainConfig) -> float:
    """Linear warmup, then cosine decay to min_learning_rate."""
    if step < cfg.warmup_steps:
        return cfg.learning_rate * (step + 1) / max(cfg.warmup_steps, 1)
    span = max(cfg.max_steps - cfg.warmup_steps, 1)
    progress = min((step - cfg.warmup_steps) / span, 1.0)
    coeff = 0.5 * (1.0 + math.cos(math.pi * progress))
    return cfg.min_learning_rate + coeff * (cfg.learning_rate - cfg.min_learning_rate)


@torch.no_grad()
def estimate_loss(
    model: AstarLM, dataset: TokenDataset, cfg: TrainConfig, device: str
) -> Dict[str, float]:
    model.eval()
    out: Dict[str, float] = {}
    for split in ("train", "val"):
        total = 0.0
        for _ in range(cfg.eval_batches):
            x, y = dataset.get_batch(split, cfg.batch_size, device)
            _, loss = model(x, y)
            total += float(loss.item())
        out[split] = total / max(cfg.eval_batches, 1)
    model.train()
    return out


def save_checkpoint(
    model: AstarLM, model_cfg: ModelConfig, train_cfg: TrainConfig, step: int, val_loss: float
) -> str:
    os.makedirs(train_cfg.out_dir, exist_ok=True)
    path = os.path.join(train_cfg.out_dir, "astar_lm.pt")
    torch.save(
        {
            "model_state": model.state_dict(),
            "model_config": model_cfg.to_dict(),
            "train_config": train_cfg.to_dict(),
            "step": step,
            "val_loss": val_loss,
        },
        path,
    )
    with open(os.path.join(train_cfg.out_dir, "astar_lm.json"), "w", encoding="utf-8") as fh:
        json.dump(
            {"model_config": model_cfg.to_dict(), "step": step, "val_loss": val_loss},
            fh,
            indent=2,
        )
    return path


def build_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Train the ASTAR language model.")
    parser.add_argument("--data", default=os.path.join("data", "corpus.bin"))
    parser.add_argument("--preset", default="tiny", choices=sorted(PRESETS))
    parser.add_argument("--batch-size", type=int, default=TrainConfig.batch_size)
    parser.add_argument("--max-steps", type=int, default=TrainConfig.max_steps)
    parser.add_argument("--learning-rate", type=float, default=TrainConfig.learning_rate)
    parser.add_argument("--warmup-steps", type=int, default=TrainConfig.warmup_steps)
    parser.add_argument("--eval-interval", type=int, default=TrainConfig.eval_interval)
    parser.add_argument("--seed", type=int, default=TrainConfig.seed)
    parser.add_argument("--device", default=TrainConfig.device)
    parser.add_argument("--out-dir", default=TrainConfig.out_dir)
    return parser.parse_args()


def main() -> None:
    args = build_args()
    model_cfg = preset(args.preset)
    train_cfg = TrainConfig(
        batch_size=args.batch_size,
        max_steps=args.max_steps,
        learning_rate=args.learning_rate,
        warmup_steps=args.warmup_steps,
        eval_interval=args.eval_interval,
        seed=args.seed,
        device=args.device,
        out_dir=args.out_dir,
    )

    torch.manual_seed(train_cfg.seed)
    device = resolve_device(train_cfg.device)

    dataset = TokenDataset(args.data, model_cfg.n_positions)
    model = AstarLM(model_cfg).to(device)
    print(
        f"preset={args.preset} device={device} params={model.num_parameters():,} "
        f"tokens={len(dataset):,}"
    )

    decay, no_decay = [], []
    for name, param in model.named_parameters():
        if not param.requires_grad:
            continue
        (no_decay if param.dim() < 2 else decay).append(param)
    optimizer = torch.optim.AdamW(
        [
            {"params": decay, "weight_decay": train_cfg.weight_decay},
            {"params": no_decay, "weight_decay": 0.0},
        ],
        lr=train_cfg.learning_rate,
        betas=(0.9, 0.95),
    )

    best_val = float("inf")
    started = time.time()
    model.train()
    for step in range(train_cfg.max_steps):
        lr = lr_at(step, train_cfg)
        for group in optimizer.param_groups:
            group["lr"] = lr

        x, y = dataset.get_batch("train", train_cfg.batch_size, device)
        _, loss = model(x, y)
        optimizer.zero_grad(set_to_none=True)
        loss.backward()
        torch.nn.utils.clip_grad_norm_(model.parameters(), train_cfg.grad_clip)
        optimizer.step()

        is_last = step == train_cfg.max_steps - 1
        if step % train_cfg.eval_interval == 0 or is_last:
            losses = estimate_loss(model, dataset, train_cfg, device)
            print(
                f"step {step:>6} | lr {lr:.2e} | train {losses['train']:.4f} "
                f"| val {losses['val']:.4f} | {time.time() - started:.0f}s"
            )
            if losses["val"] < best_val:
                best_val = losses["val"]
                path = save_checkpoint(model, model_cfg, train_cfg, step, best_val)
                print(f"  saved {path} (val {best_val:.4f})")

    print(f"done in {time.time() - started:.0f}s, best val loss {best_val:.4f}")


if __name__ == "__main__":
    main()
