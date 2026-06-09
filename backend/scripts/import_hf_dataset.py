#!/usr/bin/env python3
"""
Import English sentences from HuggingFace datasets into liblingua.

Sources:
  1. Helsinki-NLP/opus_books  — literary/general sentences (sentence-aligned, clean)
  2. fancyzhx/ag_news         — news articles (split into sentences for news domain)

Usage:
  python3 import_hf_dataset.py [--dry-run] [--limit N]
"""

import os
import re
import sys
import uuid
import argparse
from datetime import datetime, timezone
from collections import Counter

import psycopg2
from psycopg2.extras import execute_values

DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://neondb_owner:npg_CQL6miSk0MIY@ep-steep-union-a420eeoj-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
)

# opus_books English-pair configs to pull from (each is a different set of books)
OPUS_BOOKS_CONFIGS = [
    "en-fr", "en-es", "en-ru", "en-it", "en-pt",
    "de-en", "en-nl", "en-pl", "en-sv", "en-no",
]

HEALTH_KW = re.compile(
    r"\b(hospital|doctor|patient|medicine|disease|health|symptom|treatment|clinic|nurse|"
    r"surgery|diagnosis|medication|vaccine|infection|fever|blood|pain|wound|"
    r"pharmacy|drug|dose|prescription|malaria|epidemic|cure|healing|injury)\b", re.I,
)
LEGAL_KW = re.compile(
    r"\b(law|court|judge|lawyer|attorney|contract|rights|constitution|arrest|police|"
    r"crime|criminal|civil|justice|verdict|sentence|trial|prison|legal|legislation|"
    r"government|parliament|election|vote|tax|regulation|treaty|decree|statute)\b", re.I,
)
EDUCATION_KW = re.compile(
    r"\b(school|student|teacher|class|lesson|university|college|learn|study|"
    r"education|grade|exam|homework|library|textbook|curriculum|degree|knowledge|"
    r"literacy|mathematics|science|history|professor|lecture|graduate|scholarship)\b", re.I,
)
NEWS_KW = re.compile(
    r"\b(according to|reported|announced|said that|president|minister|official|"
    r"government|international|statement|conference|policy|attack|protest|crisis|"
    r"military|economy|billion|percent|election|party)\b", re.I,
)


def classify_domain(text: str) -> str:
    if HEALTH_KW.search(text):     return "health"
    if LEGAL_KW.search(text):      return "legal"
    if EDUCATION_KW.search(text):  return "education"
    if NEWS_KW.search(text):       return "news"
    words = len(text.split())
    if words <= 7:                 return "conversational"
    return "general"


def classify_difficulty(text: str) -> str:
    words = len(text.split())
    if words <= 8:  return "easy"
    if words <= 20: return "medium"
    return "hard"


def normalize(text: str) -> str:
    return re.sub(r"\s+", " ", text.strip().lower())


def is_good_sentence(text: str) -> bool:
    text = text.strip()
    words = text.split()
    if len(words) < 5 or len(words) > 60:
        return False
    # Skip if mostly non-ASCII (foreign language bleed-through)
    ascii_ratio = sum(1 for c in text if ord(c) < 128) / max(len(text), 1)
    if ascii_ratio < 0.85:
        return False
    # Skip chapter headers, page numbers, etc.
    if re.match(r"^(chapter|part|section|volume|book)\s+\w+$", text, re.I):
        return False
    if re.match(r"^\d+[\.\)]\s*$", text):
        return False
    return True


def split_sentences(text: str) -> list:
    """Rough sentence splitter for ag_news articles."""
    parts = re.split(r"(?<=[.!?])\s+(?=[A-Z])", text)
    return [p.strip() for p in parts if p.strip()]


def fetch_opus_books(limit: int, existing_norms: set) -> list:
    from datasets import load_dataset
    collected = []
    seen = set(existing_norms)

    for config in OPUS_BOOKS_CONFIGS:
        if len(collected) >= limit:
            break
        try:
            ds = load_dataset("Helsinki-NLP/opus_books", config, split="train", streaming=True)
        except Exception as e:
            print(f"  opus_books/{config}: skipped ({e})")
            continue

        added = 0
        for row in ds:
            if len(collected) >= limit:
                break
            # Extract English side
            trans = row.get("translation", {})
            en = trans.get("en", "").strip()
            if not en or not is_good_sentence(en):
                continue
            n = normalize(en)
            if n in seen:
                continue
            seen.add(n)
            collected.append(en)
            added += 1

        print(f"  opus_books/{config}: +{added} (running total: {len(collected)})")

    return collected


def fetch_ag_news(limit: int, existing_norms: set) -> list:
    from datasets import load_dataset
    print("Downloading ag_news…")
    collected = []
    seen = set(existing_norms)

    try:
        ds = load_dataset("fancyzhx/ag_news", split="train", streaming=True)
    except Exception as e:
        print(f"  ag_news: skipped ({e})")
        return []

    for row in ds:
        if len(collected) >= limit:
            break
        text = row.get("text", "").strip()
        sentences = split_sentences(text)
        for sent in sentences:
            if len(collected) >= limit:
                break
            if not is_good_sentence(sent):
                continue
            n = normalize(sent)
            if n in seen:
                continue
            seen.add(n)
            collected.append(sent)

    print(f"  ag_news: +{len(collected)} news sentences")
    return collected


def load_existing_norms(cur) -> set:
    cur.execute("SELECT text FROM english_samples")
    return {normalize(row[0]) for row in cur.fetchall()}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--limit", type=int, default=12000)
    args = parser.parse_args()

    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()

    print("Loading existing samples from DB…")
    existing_norms = load_existing_norms(cur)
    print(f"  {len(existing_norms)} already in DB")

    # Phase 1: opus_books for general/mixed domain (up to 70% of limit)
    books_target = int(args.limit * 0.70)
    print(f"\nFetching opus_books sentences (target: {books_target})…")
    books_sentences = fetch_opus_books(books_target, existing_norms)

    all_norms_so_far = set(existing_norms)
    all_norms_so_far.update(normalize(s) for s in books_sentences)

    # Phase 2: ag_news for news domain (remaining)
    news_target = args.limit - len(books_sentences)
    print(f"\nFetching ag_news sentences (target: {news_target})…")
    news_sentences = fetch_ag_news(news_target, all_norms_so_far)

    all_new = books_sentences + news_sentences
    if not all_new:
        print("Nothing new to import.")
        conn.close()
        return

    now = datetime.now(timezone.utc)
    rows = [
        (str(uuid.uuid4()), text, classify_domain(text), classify_difficulty(text), 0, False, False, now)
        for text in all_new
    ]

    domain_counts = Counter(r[2] for r in rows)
    diff_counts   = Counter(r[3] for r in rows)
    print(f"\nReady to insert {len(rows):,} sentences")
    print("  Domains:     ", dict(domain_counts))
    print("  Difficulties:", dict(diff_counts))

    if args.dry_run:
        print("\n[DRY RUN] No changes made.")
        conn.close()
        return

    BATCH = 500
    total = 0
    for i in range(0, len(rows), BATCH):
        execute_values(
            cur,
            """INSERT INTO english_samples
               (id, text, domain, difficulty, translation_count, is_locked, is_gold_standard, created_at)
               VALUES %s ON CONFLICT DO NOTHING""",
            rows[i : i + BATCH],
        )
        total += min(BATCH, len(rows) - i)
        print(f"  Inserted {total:,}/{len(rows):,}…", end="\r")

    conn.commit()
    print(f"\nDone. {total:,} sentences inserted.")
    conn.close()


if __name__ == "__main__":
    main()
