#!/usr/bin/env python3
"""Embed AgentGuard attack corpus and store vectors in Neo4j for GraphRAG.

Usage:
    python scripts/embed_corpus.py                     # embed all built-in prompts
    python scripts/embed_corpus.py --api-key <key>     # custom OpenAI key

Requires: pip install openai neo4j
Optional: set OPENAI_API_KEY, NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD env vars.
"""

import argparse, json, os, sys, time
from pathlib import Path

def parse_args():
    p = argparse.ArgumentParser(description="Embed attack corpus → Neo4j")
    p.add_argument("--api-key", help="OpenAI API key")
    p.add_argument("--uri", default=os.getenv("NEO4J_URI", "neo4j://localhost:7687"))
    p.add_argument("--user", default=os.getenv("NEO4J_USER", "neo4j"))
    p.add_argument("--password", default=os.getenv("NEO4J_PASSWORD", "password"))
    return p.parse_args()

def get_builtin_prompts():
    """Scrape built-in attack prompts from src/_core/prompts/*.ts"""
    prompts_dir = Path(__file__).resolve().parent.parent / "src" / "_core" / "prompts"
    corpus = []
    for ts_file in prompts_dir.glob("*.ts"):
        text = ts_file.read_text()
        # crude extraction: grab string literals that look like attack prompts
        lines = text.split("\n")
        category = ts_file.stem.replace("_", " ").title()
        for line in lines:
            line = line.strip()
            if line.startswith('"') and len(line) > 60:
                prompt = line.strip('",;')
                corpus.append({"category": category, "prompt": prompt})
    if not corpus:
        # fallback: use well-known attack categories
        categories = [
            "Prompt Injection", "Context Overflow", "Logic Collapse",
            "Jailbreak", "Hallucination", "Schema Drift",
            "Multi-tenant Context Leak", "Indirect Prompt Injection",
            "Multi-turn Crescendo", "Memory Poisoning",
        ]
        for cat in categories:
            for i in range(3):
                corpus.append({"category": cat, "prompt": f"Sample {cat} attack #{i+1}"})
    return corpus

def embed_batch(client, texts, model="text-embedding-ada-002"):
    r = client.embeddings.create(input=texts, model=model)
    return [e.embedding for e in r.data]

def store_in_neo4j(driver, entries, embeddings):
    with driver.session() as session:
        session.run("CREATE CONSTRAINT IF NOT EXISTS FOR (a:AttackCorpus) REQUIRE a.id IS UNIQUE")
        for entry, emb in zip(entries, embeddings):
            session.run(
                """MERGE (a:AttackCorpus {id: $id})
                   ON CREATE SET a.category = $cat, a.prompt = $p, a.embedding = $e
                   ON MATCH SET a.embedding = $e""",
                id=hash(entry["prompt"]), cat=entry["category"],
                p=entry["prompt"], e=emb,
            )
    print(f"Stored {len(entries)} embeddings in Neo4j ({entries[0]['category']}…)")

def main():
    args = parse_args()
    api_key = args.api_key or os.getenv("OPENAI_API_KEY")
    if not api_key:
        print("No OPENAI_API_KEY. Writing corpus.json instead of embedding.")
        corpus = get_builtin_prompts()
        out = Path("corpus.json")
        out.write_text(json.dumps(corpus, indent=2))
        print(f"Wrote {len(corpus)} prompts to {out}. Set OPENAI_API_KEY to embed.")
        return

    from openai import OpenAI
    client = OpenAI(api_key=api_key)

    try:
        from neo4j import GraphDatabase
        driver = GraphDatabase.driver(args.uri, auth=(args.user, args.password))
    except Exception as e:
        print(f"Neo4j unavailable ({e}). Writing embeddings.json instead.")
        corpus = get_builtin_prompts()
        embs = embed_batch(client, [c["prompt"] for c in corpus])
        Path("embeddings.json").write_text(json.dumps(
            [{"category": c["category"], "prompt": c["prompt"], "embedding": e}
             for c, e in zip(corpus, embs)], indent=2))
        print(f"Embedded {len(corpus)} prompts → embeddings.json")
        return

    corpus = get_builtin_prompts()
    batch_size = 20
    for i in range(0, len(corpus), batch_size):
        batch = corpus[i:i+batch_size]
        texts = [c["prompt"] for c in batch]
        embs = embed_batch(client, texts)
        store_in_neo4j(driver, batch, embs)
        time.sleep(0.5)

    driver.close()
    print(f"Done. {len(corpus)} attack prompts embedded and stored in Neo4j.")

if __name__ == "__main__":
    main()
