export type LoreMemory = {
  title: string
  content: string
  file: string
  type: 'decision' | 'fix' | 'constraint' | 'discovery'
  date: string
  commit: string
  confidence: number
}

type Connection = { apiUrl: string; apiKey: string; containerTag: string }

export type LocalDocument = {
  id: string
  title: string
  content: string
  file: string
  type: LoreMemory['type']
  status: 'queued' | 'processing' | 'done' | 'failed' | string
  createdAt: string
  updatedAt: string
}

function isLoopback(hostname: string) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1'
}

function requestBase(apiUrl: string) {
  const target = new URL(apiUrl)
  const localPage = isLoopback(window.location.hostname)
  const localTarget = isLoopback(target.hostname) && target.port === '6767'
  return localPage && localTarget ? '/supermemory' : apiUrl.replace(/\/$/, '')
}

export async function probeSupermemory(apiUrl: string, apiKey = '') {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 4000)
  try {
    const response = await fetch(`${requestBase(apiUrl)}/v3/documents/list`, {
      method: 'POST',
      headers: headers(apiUrl, apiKey),
      body: JSON.stringify({ limit: 1 }),
      signal: controller.signal,
    })
    return response.ok
  } catch {
    return false
  } finally {
    window.clearTimeout(timeout)
  }
}

export const demoMemories: LoreMemory[] = [
  {
    title: 'Centralized authentication in the API client',
    content: 'Bearer authentication was moved out of individual features so every Supermemory request follows one auditable path. This prevents headers drifting between capture and search, and makes a local-only endpoint easy to verify.',
    file: 'src/lib/supermemory.ts',
    type: 'decision', date: 'Jul 13, 22:41', commit: 'a1f7c2e', confidence: 98,
  },
  {
    title: 'Repository isolation uses a deterministic container tag',
    content: 'Every document and search includes the same repository-scoped containerTag. Without it, unrelated repository context can collapse into the default memory bucket and produce plausible but incorrect answers.',
    file: 'src/lib/supermemory.ts',
    type: 'constraint', date: 'Jul 13, 22:18', commit: '7bd281a', confidence: 96,
  },
  {
    title: 'Kept demo mode explicit instead of silently mocking the API',
    content: 'The interface remains demoable when the local engine is offline, but every fallback result is labeled as demo data. This keeps the three-minute walkthrough reliable without misrepresenting where an answer came from.',
    file: 'src/App.tsx',
    type: 'decision', date: 'Jul 13, 21:52', commit: '22f0c41', confidence: 94,
  },
  {
    title: 'Fixed cross-origin failures in local development',
    content: 'The app now targets a configurable local API URL and keeps the connection at the browser edge. For stricter environments, the documented Vite proxy can forward requests without exposing the key in committed source.',
    file: 'vite.config.ts',
    type: 'fix', date: 'Jul 13, 21:25', commit: 'db092c8', confidence: 91,
  },
]

function headers(apiUrl: string, apiKey: string) {
  const hostname = new URL(apiUrl).hostname
  const isLocalApi = isLoopback(hostname)
  return {
    'Content-Type': 'application/json',
    ...(!isLocalApi && apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
  }
}

export async function addMemory({ apiUrl, apiKey, containerTag, memory }: Connection & { memory: Omit<LoreMemory, 'date' | 'commit' | 'confidence'> | { title: string; content: string; file: string; type: string } }) {
  const response = await fetch(`${requestBase(apiUrl)}/v3/documents`, {
    method: 'POST', headers: headers(apiUrl, apiKey),
    body: JSON.stringify({
      content: `[${memory.type.toUpperCase()}] ${memory.title}\n\n${memory.content}\n\nFile: ${memory.file || 'repository-wide'}`,
      containerTag,
      metadata: { title: memory.title, file: memory.file || 'repository-wide', type: memory.type, source: 'lore' },
    }),
  })
  if (!response.ok) throw new Error(`Supermemory write failed (${response.status})`)
  return response.json()
}

export async function addRepositoryFile({ apiUrl, apiKey, containerTag, repository, file, content }: Connection & { repository: string; file: string; content: string }) {
  const response = await fetch(`${requestBase(apiUrl)}/v3/documents`, {
    method: 'POST', headers: headers(apiUrl, apiKey),
    body: JSON.stringify({
      content: `[SOURCE] ${file}\n\n${content}`,
      containerTag,
      customId: `lore:${repository}:${file}`,
      metadata: { title: file, file, type: 'discovery', source: 'lore-bootstrap', repository },
    }),
  })
  if (!response.ok) throw new Error(`Supermemory import failed (${response.status})`)
  return response.json() as Promise<{ id: string; status: string }>
}

export async function listDocuments({ apiUrl, apiKey, containerTag }: Connection): Promise<{ documents: LocalDocument[]; total: number }> {
  const response = await fetch(`${requestBase(apiUrl)}/v3/documents/list`, {
    method: 'POST', headers: headers(apiUrl, apiKey),
    body: JSON.stringify({ containerTags: [containerTag], includeContent: true, limit: 100, page: 1, sort: 'createdAt', order: 'desc' }),
  })
  if (!response.ok) throw new Error(`Supermemory list failed (${response.status})`)
  const payload = await response.json()
  const memories = payload.memories ?? payload.documents ?? []
  return {
    total: payload.pagination?.totalItems ?? memories.length,
    documents: memories.map((document: Record<string, any>) => {
      const metadata = document.metadata ?? {}
      const rawContent = String(document.content ?? document.summary ?? '')
      return {
        id: String(document.id),
        title: metadata.title ?? document.title ?? rawContent.split('\n')[0].replace(/^\[[A-Z]+\]\s*/, '') ?? 'Repository memory',
        content: rawContent.replace(/^\[[A-Z]+\].*\n+/, '').replace(/\nFile:.*$/, ''),
        file: metadata.file ?? document.filepath ?? 'repository-wide',
        type: metadata.type ?? 'discovery',
        status: document.status ?? 'done',
        createdAt: document.createdAt ?? document.updatedAt ?? new Date().toISOString(),
        updatedAt: document.updatedAt ?? document.createdAt ?? new Date().toISOString(),
      }
    }),
  }
}

export async function getDocumentStatus({ apiUrl, apiKey, id }: Pick<Connection, 'apiUrl' | 'apiKey'> & { id: string }) {
  const response = await fetch(`${requestBase(apiUrl)}/v3/documents/${encodeURIComponent(id)}`, { headers: headers(apiUrl, apiKey) })
  if (!response.ok) throw new Error(`Supermemory status failed (${response.status})`)
  return response.json() as Promise<{ status: string }>
}

export async function searchMemories({ apiUrl, apiKey, containerTag, query, signal }: Connection & { query: string; signal?: AbortSignal }): Promise<LoreMemory[]> {
  const response = await fetch(`${requestBase(apiUrl)}/v4/search`, {
    method: 'POST', headers: headers(apiUrl, apiKey),
    body: JSON.stringify({ q: query, containerTag, limit: 6, searchMode: 'hybrid' }),
    signal,
  })
  if (!response.ok) throw new Error(`Supermemory search failed (${response.status})`)
  const payload = await response.json()
  const items = payload.results ?? payload.memories ?? []
  return items.map((item: Record<string, any>) => {
    const metadata = item.metadata ?? item.document?.metadata ?? {}
    const content = item.content ?? item.chunk ?? item.memory ?? item.document?.content ?? ''
    const firstLine = String(content).split('\n')[0].replace(/^\[[A-Z]+\]\s*/, '')
    return {
      title: metadata.title ?? firstLine ?? 'Repository memory',
      content: String(content).replace(/^\[[A-Z]+\].*\n+/, '').replace(/\nFile:.*$/, ''),
      file: metadata.file ?? 'repository-wide',
      type: metadata.type ?? 'discovery',
      date: metadata.date ?? 'Local memory',
      commit: metadata.commit ?? 'semantic match',
      confidence: Math.round((item.score ?? item.similarity ?? 0.9) * 100),
    }
  })
}
