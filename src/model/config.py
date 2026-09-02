"""Model hyperparameters for the ASTAR AI project.

Every architectural knob lives here so that scaling the model is a config
change rather than a code change. See docs/ARCHITECTURE.md.
"""

from dataclasses import dataclass, asdict, field
from typing import Any, Dict


@dataclass
class ModelConfig:
    """Configuration of the decoder-only transformer."""

    vocab_size: int = 256          # byte-level tokenizer: exactly 256 symbols
    n_positions: int = 128         # context window, in tokens
    n_layer: int = 4
    n_head: int = 4
    n_embd: int = 128
    dropout: float = 0.1
    bias: bool = True              # bias terms in Linear / LayerNorm

    def __post_init__(self) -> None:
        if self.n_embd % self.n_head != 0:
            raise ValueError(
                f"n_embd ({self.n_embd}) must be divisible by n_head ({self.n_head})"
            )
        if self.n_positions < 1:
            raise ValueError("n_positions must be >= 1")
        if not 0.0 <= self.dropout < 1.0:
            raise ValueError("dropout must be in [0, 1)")

    @property
    def head_dim(self) -> int:
        return self.n_embd // self.n_head

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "ModelConfig":
        known = {f: data[f] for f in cls.__dataclass_fields__ if f in data}
        return cls(**known)


@dataclass
class TrainConfig:
    """Configuration of the bootstrap training loop."""

    batch_size: int = 32
    max_steps: int = 2000
    learning_rate: float = 3e-4
    min_learning_rate: float = 3e-5
    warmup_steps: int = 100
    weight_decay: float = 0.1
    grad_clip: float = 1.0
    eval_interval: int = 200
    eval_batches: int = 20
    seed: int = 1337
    device: str = "auto"           # "auto" | "cpu" | "cuda"
    out_dir: str = "checkpoints"
    extras: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


# Named presets. "tiny" is the one a contributor can run on a laptop CPU.
PRESETS: Dict[str, ModelConfig] = {
    "tiny": ModelConfig(),
    "small": ModelConfig(n_positions=256, n_layer=6, n_head=6, n_embd=384),
    "medium": ModelConfig(n_positions=512, n_layer=12, n_head=12, n_embd=768),
}


def preset(name: str) -> ModelConfig:
    if name not in PRESETS:
        raise KeyError(f"unknown preset {name!r}; known: {sorted(PRESETS)}")
    return ModelConfig(**PRESETS[name].to_dict())
