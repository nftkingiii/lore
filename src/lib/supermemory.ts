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

export async function searchMemories({ apiUrl, apiKey, containerTag, query }: Connection & { query: string }): Promise<LoreMemory[]> {
  const response = await fetch(`${requestBase(apiUrl)}/v4/search`, {
    method: 'POST', headers: headers(apiUrl, apiKey),
    body: JSON.stringify({ q: query, containerTag, limit: 6, searchMode: 'hybrid' }),
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
