"""Byte-level tokenizer.

256 symbols, one per byte of UTF-8. Lossless for any text, no vocabulary file
to build or ship. A BPE tokenizer can replace this later behind the same
`encode` / `decode` interface.
"""

from typing import List

import numpy as np

VOCAB_SIZE = 256


class ByteTokenizer:
    vocab_size = VOCAB_SIZE

    def encode(self, text: str) -> List[int]:
        return list(text.encode("utf-8"))

    def decode(self, ids) -> str:
        return bytes(int(i) & 0xFF for i in ids).decode("utf-8", errors="replace")

    def encode_to_array(self, text: str) -> "np.ndarray":
        return np.frombuffer(text.encode("utf-8"), dtype=np.uint8).astype(np.uint16)
