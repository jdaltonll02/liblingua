"""
liberiandata — Official Python SDK for the Liberian Language Dataset.

Install:
    pip install liberiandata
    # or from source:
    pip install git+https://github.com/your-org/liberian-dataset-platform.git#subdirectory=sdk/python

Quick start:
    from liberiandata import LiberianDataset

    client = LiberianDataset(api_key="ldlib_xxxx")

    # Load a language into memory
    records = client.load("kpelle")

    # Stream a large dataset without loading it all into memory
    for record in client.stream("bassa"):
        print(record["target_text"])

    # Download to a file
    path = client.download("grebo", format="jsonl", output_dir="./data")

    # Load as a pandas DataFrame
    df = client.load_dataframe("vai")

    # Load directly as a HuggingFace Dataset
    hf_ds = client.to_hf_dataset("mende")
"""

from .client import LiberianDataset
from .exceptions import (
    LiberianDataError,
    AuthenticationError,
    DatasetNotFoundError,
    DatasetNotPublishedError,
)

__version__ = "1.0.0"
__all__ = [
    "LiberianDataset",
    "LiberianDataError",
    "AuthenticationError",
    "DatasetNotFoundError",
    "DatasetNotPublishedError",
]
