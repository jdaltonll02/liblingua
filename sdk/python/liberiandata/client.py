"""
LiberianDataset — main client class.
"""

from __future__ import annotations

import json
import os
from typing import Iterator, List, Optional, Union

import requests

from .exceptions import (
    AuthenticationError,
    DatasetNotFoundError,
    DatasetNotPublishedError,
    LiberianDataError,
    RateLimitError,
)

SUPPORTED_LANGUAGES = [
    "kpelle", "bassa", "grebo", "vai",
    "mende", "loma", "krahn", "dan",
]

SUPPORTED_FORMATS = ("csv", "json", "jsonl")


class LiberianDataset:
    """
    Official Python client for the Liberian Language Dataset platform.

    Parameters
    ----------
    api_key : str
        Your personal API key.  Generate one at https://<platform>/dashboard.
    base_url : str, optional
        Override the platform URL (useful for self-hosted instances).
        Defaults to the public platform URL set at build time.

    Examples
    --------
    >>> from liberiandata import LiberianDataset
    >>> client = LiberianDataset(api_key="ldlib_xxxx")
    >>> records = client.load("kpelle")
    >>> print(records[0]["source_text"])
    """

    DEFAULT_BASE_URL = os.environ.get(
        "LIBERIAN_DATA_BASE_URL",
        "http://localhost:3000",   # replaced by your production URL at deploy time
    )

    def __init__(self, api_key: str, base_url: Optional[str] = None) -> None:
        if not api_key:
            raise AuthenticationError(
                "An API key is required.  Generate one at the platform dashboard."
            )
        self.api_key  = api_key
        self.base_url = (base_url or self.DEFAULT_BASE_URL).rstrip("/")

        self._session = requests.Session()
        self._session.headers.update(
            {
                "Authorization": f"ApiKey {api_key}",
                "User-Agent": f"liberiandata-python/1.0.0",
                "Accept": "application/json",
            }
        )

    # ── Internal helpers ──────────────────────────────────────────────────────

    def _get(
        self,
        path: str,
        params: Optional[dict] = None,
        stream: bool = False,
    ) -> requests.Response:
        url = f"{self.base_url}/api{path}"
        try:
            resp = self._session.get(url, params=params, stream=stream, timeout=60)
        except requests.ConnectionError as exc:
            raise LiberianDataError(f"Cannot connect to {self.base_url}: {exc}") from exc

        if resp.status_code == 401:
            raise AuthenticationError(resp.json().get("error", "Invalid API key."))
        if resp.status_code == 403:
            raise DatasetNotPublishedError(
                resp.json().get("error", "Dataset is not published.")
            )
        if resp.status_code == 404:
            raise DatasetNotFoundError(resp.json().get("error", "Dataset not found."))
        if resp.status_code == 429:
            raise RateLimitError("Export rate limit reached.  Try again later.")
        if not resp.ok:
            raise LiberianDataError(
                f"API error {resp.status_code}: {resp.text[:300]}"
            )
        return resp

    @staticmethod
    def _validate_language(language: str) -> None:
        if language not in SUPPORTED_LANGUAGES:
            raise ValueError(
                f"Unknown language '{language}'.  "
                f"Supported: {', '.join(SUPPORTED_LANGUAGES)}"
            )

    @staticmethod
    def _export_params(
        language: str,
        validated_only: bool,
        min_quality: Optional[float],
        raw: bool,
    ) -> dict:
        params: dict = {
            "language": language,
            "validated_only": "true" if validated_only else "false",
        }
        if min_quality is not None:
            if not 0 <= min_quality <= 1:
                raise ValueError("min_quality must be between 0 and 1.")
            params["min_quality"] = min_quality
        if raw:
            params["raw"] = "true"
        return params

    # ── Public API ────────────────────────────────────────────────────────────

    def list_languages(self) -> List[str]:
        """Return a list of published language codes.

        Returns
        -------
        list[str]
            e.g. ["kpelle", "bassa", "grebo"]
        """
        return [d["language"] for d in self.list_datasets()]

    def list_datasets(self) -> List[dict]:
        """Return full metadata for every published dataset.

        Returns
        -------
        list[dict]
            Each dict contains keys: language, record_count, audio_count,
            avg_quality, domain_dist, version, published_at.
        """
        return self._get("/dataset/published").json()

    def stream(
        self,
        language: str,
        *,
        validated_only: bool = True,
        min_quality: Optional[float] = None,
        raw: bool = False,
    ) -> Iterator[dict]:
        """Stream translation records one by one (memory-efficient).

        Yields each record as a Python dict without loading the whole
        dataset into memory first.

        Parameters
        ----------
        language : str
            Target language code, e.g. "kpelle".
        validated_only : bool
            If True (default), only return human-validated translations.
        min_quality : float, optional
            Minimum quality score in [0, 1].  Filters on the server side.
        raw : bool
            If True, return unprocessed DB values — no train/val/test split
            tag, no ISO language codes, no text normalisation, no resolved
            audio URLs.  Default False (preprocessed).

        Yields
        ------
        dict
            One translation record per iteration.

        Examples
        --------
        >>> for rec in client.stream("grebo", validated_only=True):
        ...     print(rec["target_text"])
        """
        self._validate_language(language)
        params = self._export_params(language, validated_only, min_quality, raw)
        resp   = self._get("/export/huggingface", params=params, stream=True)
        for line in resp.iter_lines(decode_unicode=True):
            line = line.strip()
            if line:
                yield json.loads(line)

    def load(
        self,
        language: Union[str, List[str]],
        *,
        validated_only: bool = True,
        min_quality: Optional[float] = None,
        raw: bool = False,
    ) -> List[dict]:
        """Load a full dataset (or multiple languages) into memory.

        Parameters
        ----------
        language : str | list[str]
            One language code or a list of language codes.
        validated_only : bool
            Only include validated translations (default True).
        min_quality : float, optional
            Minimum quality score in [0, 1].
        raw : bool
            Return unprocessed data (default False).

        Returns
        -------
        list[dict]
            All records as a flat list.

        Examples
        --------
        >>> records = client.load("kpelle")
        >>> multi   = client.load(["kpelle", "bassa"])
        >>> raw     = client.load("grebo", raw=True)
        """
        if isinstance(language, list):
            combined = []
            for lang in language:
                combined.extend(
                    self.stream(
                        lang,
                        validated_only=validated_only,
                        min_quality=min_quality,
                        raw=raw,
                    )
                )
            return combined
        return list(
            self.stream(
                language,
                validated_only=validated_only,
                min_quality=min_quality,
                raw=raw,
            )
        )

    def download(
        self,
        language: str,
        *,
        format: str = "jsonl",
        output_dir: str = ".",
        validated_only: bool = True,
        min_quality: Optional[float] = None,
        raw: bool = False,
    ) -> str:
        """Download a dataset file to disk.

        Parameters
        ----------
        language : str
            Target language code.
        format : str
            One of "csv", "json", "jsonl".  Default "jsonl".
        output_dir : str
            Directory to save the file.  Created if it does not exist.
        validated_only : bool
            Only include validated translations (default True).
        min_quality : float, optional
            Minimum quality score in [0, 1].
        raw : bool
            Download unprocessed data (default False).

        Returns
        -------
        str
            Absolute path to the downloaded file.

        Examples
        --------
        >>> path = client.download("kpelle", format="jsonl", output_dir="./data")
        >>> print(path)
        /project/data/kpelle_validated_liberian_dataset.jsonl
        """
        if format not in SUPPORTED_FORMATS:
            raise ValueError(f"format must be one of {SUPPORTED_FORMATS}")

        self._validate_language(language)
        params   = self._export_params(language, validated_only, min_quality, raw)
        endpoint = {
            "csv":   "/export/csv",
            "json":  "/export/json",
            "jsonl": "/export/huggingface",
        }[format]

        resp = self._get(endpoint, params=params, stream=True)

        # Derive filename from Content-Disposition header if present
        cd       = resp.headers.get("Content-Disposition", "")
        if "filename=" in cd:
            filename = cd.split("filename=")[-1].strip().strip('"')
        else:
            suffix = ("_validated" if validated_only else "") + ("_raw" if raw else "")
            ext    = {"csv": "csv", "json": "json", "jsonl": "jsonl"}[format]
            filename = f"{language}{suffix}_liberian_dataset.{ext}"

        os.makedirs(output_dir, exist_ok=True)
        path = os.path.abspath(os.path.join(output_dir, filename))

        with open(path, "wb") as fh:
            for chunk in resp.iter_content(chunk_size=8192):
                fh.write(chunk)

        return path

    def load_dataframe(
        self,
        language: Union[str, List[str]],
        **kwargs,
    ):
        """Load a dataset into a pandas DataFrame.

        Requires ``pandas``: ``pip install pandas``

        Parameters
        ----------
        language : str | list[str]
            Language code(s).
        **kwargs
            Forwarded to :meth:`load`.

        Returns
        -------
        pandas.DataFrame

        Examples
        --------
        >>> df = client.load_dataframe("kpelle", validated_only=True)
        >>> print(df[["source_text", "target_text"]].head())
        """
        try:
            import pandas as pd
        except ImportError as exc:
            raise ImportError(
                "pandas is required for load_dataframe().  "
                "Install it with: pip install pandas"
            ) from exc

        return pd.DataFrame(self.load(language, **kwargs))

    def to_hf_dataset(
        self,
        language: Union[str, List[str]],
        **kwargs,
    ):
        """Load directly into a HuggingFace ``datasets.Dataset`` object.

        Requires ``datasets``: ``pip install datasets``

        Parameters
        ----------
        language : str | list[str]
            Language code(s).
        **kwargs
            Forwarded to :meth:`load`.

        Returns
        -------
        datasets.Dataset

        Examples
        --------
        >>> ds = client.to_hf_dataset("kpelle")
        >>> ds.train_test_split(test_size=0.1)
        """
        try:
            from datasets import Dataset
        except ImportError as exc:
            raise ImportError(
                "The 'datasets' library is required for to_hf_dataset().  "
                "Install it with: pip install datasets"
            ) from exc

        return Dataset.from_list(self.load(language, **kwargs))

    def get_stats(self) -> dict:
        """Return platform-wide statistics.

        Returns
        -------
        dict
            total_samples, total_translations, total_validated, per_language, etc.
        """
        return self._get("/stats").json()

    def __repr__(self) -> str:
        return f"LiberianDataset(base_url={self.base_url!r})"
