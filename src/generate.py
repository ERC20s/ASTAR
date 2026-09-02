"""Sample text from a trained ASTAR checkpoint.

    python -m src.generate --prompt "ASTAR" --tokens 200
"""

import argparse
import os

import torch

from .data.tokenizer import ByteTokenizer
from .model.config import ModelConfig
from .model.transformer import AstarLM


def load_model(checkpoint: str, device: str) -> AstarLM:
    if not os.path.exists(checkpoint):
        raise FileNotFoundError(
            f"{checkpoint} not found - train one first with `python -m src.train`"
        )
    blob = torch.load(checkpoint, map_location=device)
    config = ModelConfig.from_dict(blob["model_config"])
    model = AstarLM(config).to(device)
    model.load_state_dict(blob["model_state"])
    model.eval()
    return model


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate text with the ASTAR model.")
    parser.add_argument("--checkpoint", default=os.path.join("checkpoints", "astar_lm.pt"))
    parser.add_argument("--prompt", default="\n")
    parser.add_argument("--tokens", type=int, default=200)
    parser.add_argument("--temperature", type=float, default=0.9)
    parser.add_argument("--top-k", type=int, default=40)
    parser.add_argument("--device", default="cuda" if torch.cuda.is_available() else "cpu")
    args = parser.parse_args()

    tokenizer = ByteTokenizer()
    model = load_model(args.checkpoint, args.device)

    ids = tokenizer.encode(args.prompt) or [ord("\n")]
    idx = torch.tensor([ids], dtype=torch.long, device=args.device)
    out = model.generate(
        idx, max_new_tokens=args.tokens, temperature=args.temperature, top_k=args.top_k
    )
    print(tokenizer.decode(out[0].tolist()))


if __name__ == "__main__":
    main()
