"""Dataset loading and batching for the ASTAR AI project.

`prepare_text` turns a raw .txt file into a flat uint16 token array on disk;
`TokenDataset` memory-maps that array and draws random contiguous windows.
"""

import os
from typing import Tuple

import numpy as np
import torch

from .tokenizer import ByteTokenizer


def prepare_text(source_path: str, out_path: str) -> int:
    """Encode a UTF-8 text file into a .bin of uint16 tokens. Returns the count."""
    with open(source_path, "r", encoding="utf-8") as handle:
        text = handle.read()
    tokens = ByteTokenizer().encode_to_array(text)
    out_dir = os.path.dirname(os.path.abspath(out_path))
    os.makedirs(out_dir, exist_ok=True)
    tokens.tofile(out_path)
    return int(tokens.size)


class TokenDataset:
    """A flat token stream with a deterministic train/validation split."""

    def __init__(self, path: str, block_size: int, val_fraction: float = 0.1) -> None:
        if not os.path.exists(path):
            raise FileNotFoundError(
                f"{path} not found - run `python -m src.data.dataset --source <file.txt>` first"
            )
        if not 0.0 < val_fraction < 1.0:
            raise ValueError("val_fraction must be in (0, 1)")
        self.tokens = np.memmap(path, dtype=np.uint16, mode="r")
        self.block_size = block_size
        if self.tokens.size < block_size + 2:
            raise ValueError(
                f"corpus has {self.tokens.size} tokens, need at least {block_size + 2}"
            )
        split = int(self.tokens.size * (1.0 - val_fraction))
        self.splits = {"train": (0, split), "val": (split, self.tokens.size)}

    def __len__(self) -> int:
        return int(self.tokens.size)

    def get_batch(
        self, split: str, batch_size: int, device: str = "cpu"
    ) -> Tuple[torch.Tensor, torch.Tensor]:
        if split not in self.splits:
            raise KeyError(f"unknown split {split!r}")
        start, end = self.splits[split]
        high = end - self.block_size - 1
        if high <= start:
            start, high = self.splits["train"]
            high = high - self.block_size - 1
        offsets = np.random.randint(start, high, size=batch_size)
        x = np.stack([self.tokens[i: i + self.block_size] for i in offsets])
        y = np.stack([self.tokens[i + 1: i + 1 + self.block_size] for i in offsets])
        x_t = torch.from_numpy(x.astype(np.int64))
        y_t = torch.from_numpy(y.astype(np.int64))
        return x_t.to(device), y_t.to(device)


def _cli() -> None:
    import argparse

    parser = argparse.ArgumentParser(description="Prepare a text corpus for training.")
    parser.add_argument(
        "--source",
        default=os.path.join("src", "data", "sample_corpus.txt"),
        help="UTF-8 text file to encode",
    )
    parser.add_argument(
        "--out",
        default=os.path.join("data", "corpus.bin"),
        help="where to write the uint16 token array",
    )
    args = parser.parse_args()
    count = prepare_text(args.source, args.out)
    print(f"wrote {count} tokens to {args.out}")


if __name__ == "__main__":
    _cli()
