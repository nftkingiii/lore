# Lore

**Ask your codebase why.**

Lore is a local repository-intelligence layer that remembers technical decisions, dead ends, constraints, and fixes that Git cannot explain. It uses Supermemory Local for private ingestion and semantic retrieval, scoped independently per repository.

## Why it exists

`git blame` tells you who changed a line and when. Lore tells you why the line exists, which alternatives were rejected, and what broke the last time somebody tried to change it.

## Supermemory Local integration

Lore follows the canonical Supermemory API surface:

- `POST /v3/documents` captures repository context.
- `POST /v4/search` retrieves related decisions with semantic search and reranking.
- `Authorization: Bearer <local-api-key>` is used for every request.
- A deterministic, singular `containerTag` isolates each repository's context.
- The default base URL is `http://localhost:6767`; no repository data is sent to a Lore backend because there is no Lore backend.

Demo fallback memories are visibly labeled and are used only when the local server is unavailable. They never masquerade as live results.

## Run locally

### 1. Start Supermemory Local

Supermemory Local currently supports macOS and Linux natively. On Windows, run it inside WSL:

```bash
npx supermemory local
```

First boot prints the server URL and bearer API key. Keep the default local embedding model or configure an OpenAI-compatible local model such as Ollama for a fully offline stack.

### 2. Start Lore

```bash
npm install
npm run dev
```

Open the shown Vite URL, choose **Connect localhost:6767**, and paste the bearer key printed by Supermemory Local. The key is stored only in that browser's local storage.

## Demo flow

1. Open Lore and point out the explicit **Demo mode** state.
2. Connect the running Supermemory Local instance.
3. Choose **Capture context** and record a decision tied to a file.
4. Ask a natural-language question about that decision.
5. Show the matching evidence, repository-scoped container, and **Live local data** state.
6. Switch to **Timeline** to explain how Lore creates a narrative of technical intent.

## Scripts

```bash
npm run dev      # development server
npm run build    # TypeScript and production build
npm run lint     # source linting
npm run preview  # preview production build
```

## Privacy model

Lore is local-first by architecture: the UI runs in the browser, the memory engine runs on the user's machine, and credentials are never committed. A hosted static build can still connect to the user's own local endpoint, subject to the local server's browser/CORS policy.

## Hackathon

Built for **Localhost:6767**, the Supermemory Local Hackathon.
