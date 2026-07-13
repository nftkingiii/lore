# Lore — submission copy

## One-line pitch

Lore is semantic `git blame` for intent: ask your codebase why it became itself, entirely on your machine.

## How it uses Supermemory Local

Lore stores technical decisions, rejected alternatives, debugging discoveries, and file-linked context as documents in Supermemory Local. Every write and search uses a deterministic repository `containerTag`, so memories from different codebases never mix. Natural-language questions are sent to the local `/v4/search` endpoint with semantic reranking, then rendered with their supporting file evidence. Because ingestion, embeddings, storage, and retrieval run at `localhost:6767`, sensitive engineering context never needs to leave the developer's machine.

## Demo video outline (under 3 minutes)

- **0:00–0:20** — Problem: Git remembers code changes, not intent.
- **0:20–0:45** — Show Lore, the local connection state, and repository isolation.
- **0:45–1:20** — Capture a real decision with a file path.
- **1:20–2:00** — Ask “Why did we choose bearer auth?” and reveal the live local answer.
- **2:00–2:30** — Open Timeline and show the repository's evolving narrative.
- **2:30–2:50** — Close on privacy: browser → localhost:6767 → local memory engine.

## Showcase template

**Project:** Lore  
**Pitch:** Semantic git blame for intent—ask your codebase why, privately.  
**Team:** [name]  
**Repository:** [public GitHub URL]  
**Demo:** [video URL]
