"""
liblingua — Official Python SDK for liblingua.

Install:
    pip install liblingua
    # or from source:
    pip install git+https://github.com/your-org/liblingua.git#subdirectory=sdk/python

Quick start:
    from liblingua import Liblingua

    client = Liblingua(api_key="ldlib_xxxx")

    # Load a language into memory
    records = client.load("kpelle")

    # Stream without loading everything into memory
    for record in client.stream("bassa"):
        print(record["target_text"])

    # Download to a file
    path = client.download("grebo", format="jsonl", output_dir="./data")

    # Load as a pandas DataFrame
    df = client.load_dataframe("vai")

    # Load directly as a HuggingFace Dataset
    hf_ds = client.to_hf_dataset("mende")
"""

from .client import Liblingua
from .exceptions import (
    LiblinguaError,
    AuthenticationError,
    DatasetNotFoundError,
    DatasetNotPublishedError,
    RateLimitError,
)

__version__ = "1.0.0"
__all__ = [
    "Liblingua",
    "LiblinguaError",
    "AuthenticationError",
    "DatasetNotFoundError",
    "DatasetNotPublishedError",
    "RateLimitError",
]
