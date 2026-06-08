# liblingua

Official Python SDK for liblingua — a crowdsourced collection of human-validated translations between English and 8 Liberian indigenous languages: **Kpelle, Bassa, Grebo, Vai, Mende, Loma, Krahn, and Dan (Gio)**.

---

## Installation

```bash
pip install liblingua
```

With optional extras:

```bash
pip install "liblingua[pandas]"       # adds pandas support
pip install "liblingua[huggingface]"  # adds HuggingFace datasets support
pip install "liblingua[all]"          # everything
```

Install directly from source:

```bash
pip install git+https://github.com/your-org/liblingua.git#subdirectory=sdk/python
```

---

## Authentication

Generate a free API key from your account dashboard at the platform website, then pass it to the client:

```python
from liblingua import Liblingua

client = Liblingua(api_key="ldlib_xxxx")
```

Or set the environment variable:

```bash
export LIBLINGUA_BASE_URL=https://your-platform.com
```

---

## Quick Start

```python
from liblingua import Liblingua

client = Liblingua(api_key="ldlib_xxxx")

# See what's available
print(client.list_languages())
# → ['kpelle', 'bassa', 'grebo', ...]

# Load a full language dataset into memory (preprocessed, validated-only)
records = client.load("kpelle")
print(records[0])
# {
#   "id": "...",
#   "split": "train",
#   "source_lang": "en",
#   "source_lang_iso": "eng",
#   "target_lang": "kpelle",
#   "target_lang_iso": "kpe",
#   "target_lang_bcp47": "kpe-LR",
#   "source_text": "Wash your hands with soap and clean water.",
#   "target_text": "Kpuu ye la wuu gbi ee...",
#   "domain": "health",
#   "difficulty": "easy",
#   "is_validated": true,
#   "quality_score": 0.87,
#   ...
# }
```

---

## Usage

### Load into memory

```python
from liblingua import Liblingua

client = Liblingua(api_key="ldlib_xxxx")

# Preprocessed (splits, ISO codes, normalised text) — recommended for training
data = client.load("kpelle")

# Multiple languages at once
data = client.load(["kpelle", "bassa", "grebo"])

# All translations including unvalidated
data = client.load("kpelle", validated_only=False)

# Filter by minimum quality score
data = client.load("kpelle", min_quality=0.7)

# Raw data — original DB values, no preprocessing applied
raw = client.load("kpelle", raw=True)
```

### Stream (memory-efficient for large datasets)

```python
from liblingua import Liblingua

client = Liblingua(api_key="ldlib_xxxx")

for record in client.stream("kpelle"):
    source = record["source_text"]
    target = record["target_text"]
    split  = record["split"]   # "train" | "validation" | "test"
    # ... process one record at a time
```

### Download to disk

```python
from liblingua import Liblingua

client = Liblingua(api_key="ldlib_xxxx")

path = client.download("kpelle", format="jsonl", output_dir="./data")
path = client.download("kpelle", format="csv",   output_dir="./data")
path = client.download("kpelle", raw=True,        output_dir="./data/raw")
path = client.download("kpelle", validated_only=True, min_quality=0.8)
```

### pandas DataFrame

```python
# pip install "liblingua[pandas]"
from liblingua import Liblingua

client = Liblingua(api_key="ldlib_xxxx")
df = client.load_dataframe("kpelle", validated_only=True)
print(df[["source_text", "target_text", "split", "quality_score"]].head())
```

### HuggingFace Dataset

```python
# pip install "liblingua[huggingface]"
from liblingua import Liblingua

client = Liblingua(api_key="ldlib_xxxx")
ds = client.to_hf_dataset("kpelle")

train = ds.filter(lambda x: x["split"] == "train")
val   = ds.filter(lambda x: x["split"] == "validation")
test  = ds.filter(lambda x: x["split"] == "test")
```

---

## Data Fields

### Preprocessed (default)

| Field | Type | Description |
|-------|------|-------------|
| `id` | str | Unique record UUID |
| `split` | str | `train`, `validation`, or `test` (80/10/10, deterministic) |
| `source_lang` | str | `en` |
| `source_lang_iso` | str | ISO 639-3 code, e.g. `eng` |
| `source_lang_bcp47` | str | BCP-47 tag, e.g. `en` |
| `source_text` | str | English source sentence (whitespace normalised) |
| `target_lang` | str | e.g. `kpelle` |
| `target_lang_iso` | str | ISO 639-3 code, e.g. `kpe` |
| `target_lang_bcp47` | str | BCP-47 tag, e.g. `kpe-LR` |
| `target_text` | str | Translation (whitespace normalised) |
| `dialect` | str\|null | Dialect variant if specified |
| `domain` | str | `health`, `legal`, `education`, `news`, `conversational`, `general` |
| `difficulty` | str | `easy`, `medium`, `hard` |
| `contributor_region` | str\|null | Region of origin |
| `contributor_age_group` | str\|null | Age bracket |
| `is_l1_speaker` | bool\|null | First-language speaker flag |
| `is_validated` | bool | Human-validated flag |
| `quality_score` | float\|null | Adjudicator score 0–1 |
| `gold_sim_score` | float\|null | N-gram similarity to gold reference |
| `iaa_score` | float\|null | Inter-annotator agreement (0–1) |
| `has_source_audio` | bool | English spoken audio exists |
| `has_target_audio` | bool | Target-language spoken audio exists |
| `audio_source_url` | str\|null | Absolute URL to English audio |
| `audio_target_url` | str\|null | Absolute URL to target-language audio |
| `created_at` | str | ISO 8601 timestamp |

### Raw (`raw=True`)

Same fields minus `split`, `*_iso`, `*_bcp47`; text is unmodified; audio fields are stored paths, not URLs.

---

## Citation

```bibtex
@dataset{liberian_language_dataset_2026,
  title   = {Liberian Low-Resource Language Translation Dataset},
  year    = {2026},
  url     = {https://your-platform.com/datasets},
  note    = {Crowdsourced, human-validated translations across 8 Liberian
             languages.  Includes train/validation/test splits and spoken
             audio recordings.}
}
```

---

## License

Apache 2.0.
