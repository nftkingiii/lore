# Lore

**Ask your codebase why.**

Lore is a local repository-intelligence layer that remembers technical decisions, dead ends, constraints, and fixes that Git cannot explain. It uses Supermemory Local for private ingestion and semantic retrieval, scoped independently per repository.

## Why it exists

`git blame` tells you who changed a line and when. Lore tells you why the line exists, which alternatives were rejected, and what broke the last time somebody tried to change it.

## Supermemory Local integration

Lore follows the canonical Supermemory API surface:

- `POST /v3/documents` captures repository context.
- `POST /v4/search` retrieves related decisions with hybrid semantic search.
- Bearer authentication is supported; unauthenticated loopback requests are automatically authorized by Supermemory Local.
- A deterministic, singular `containerTag` isolates each repository's context.
- The default base URL is `http://localhost:6767`; no repository data is sent to a Lore backend because there is no Lore backend.

Demo fallback memories are visibly labeled and are used only when the local server is unavailable. They never masquerade as live results.

## Local setup

Prerequisites:

- Node.js 20 or newer and npm.
- macOS, Linux, or Ubuntu on WSL 2 for Windows.
- An API key for the LLM provider selected during setup, unless you use a local OpenAI-compatible model.

### 1. Start Supermemory Local

Supermemory Local currently supports macOS and Linux natively. On Windows, open Ubuntu from PowerShell:

```powershell
wsl -d Ubuntu
```

Then, inside Ubuntu, move to the repository and start Supermemory:

```bash
cd "/mnt/c/path/to/lore"
npx supermemory local
```

Complete the LLM setup wizard. For embeddings, press Enter to keep the default local `Xenova/bge-base-en-v1.5` model, or select another provider before ingesting your first document. When startup succeeds, the ready panel prints:

```text
url         http://localhost:6767
api key     sm_...
```

### 2. Get the bearer API key

Copy the complete `sm_...` value from that ready panel. Treat it as a secret: do not commit it, share it, or add it to Vercel. If the panel has scrolled away, stop Supermemory with Ctrl+C and run `npx supermemory local` again to print it.

Supermemory Local automatically authorizes unauthenticated requests to its loopback URL, so Lore's bearer-key field may be left blank when both services are running locally. The printed key is still useful for authenticated clients or a non-loopback deployment.

### 3. Start Lore

Keep Supermemory running and open a second terminal in this repository:

```bash
npm install
npm run dev
```

Open `http://localhost:5173`, choose **Connect localhost:6767**, and use:

- URL: `http://localhost:6767`
- Bearer API key: optional for loopback; otherwise paste the printed `sm_...` value

Select **Test & save connection**. During local development, Vite forwards `/supermemory` to port 6767 so browser CORS restrictions do not block the connection. If it fails, confirm that Supermemory is still running and listening on port 6767.

### 4. Verify the workflow

1. Confirm Lore shows **Connected**.
2. Capture a repository decision or constraint.
3. Allow ingestion to finish, then ask a question about it.
4. Confirm the answer is labeled **Live local data** and shows matching evidence.

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

## Deploy the Lore interface on Vercel

Lore's Vercel deployment is the static interface only; it does not host Supermemory Local or an application backend.

1. Import `nftkingiii/lore` in Vercel.
2. Keep the detected Vite preset, `npm run build` command, and `dist` output directory.
3. Deploy. `vercel.json` provides the SPA fallback for client-side routes.

No Supermemory or Gemini API key belongs in Vercel.

Browsers do not reliably allow a public HTTPS page to call a visitor's HTTP loopback service because of mixed-content, CORS, and private-network protections. Use the local Vite app for the complete localhost workflow. Treat the Vercel build as a public UI preview unless you connect it to a secured HTTPS Supermemory endpoint that explicitly permits the deployed origin.

## Privacy model

Lore is local-first by architecture: the UI runs in the browser, the memory engine runs on the user's machine, and credentials are never committed. In local development, Vite proxies browser requests to the private Supermemory process; Lore has no separate backend.

## Hackathon

Built for **Localhost:6767**, the Supermemory Local Hackathon.
