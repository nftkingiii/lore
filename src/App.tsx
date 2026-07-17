import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import './App.css'
import {
  type LoreMemory,
  type LocalDocument,
  addMemory,
  addRepositoryFile,
  demoMemories,
  getDocumentStatus,
  listDocuments,
  probeSupermemory,
  searchMemories,
} from './lib/supermemory'

type IconName = 'search' | 'plus' | 'branch' | 'file' | 'spark' | 'clock' | 'shield' | 'arrow' | 'x' | 'chevron' | 'folder' | 'stop'

const paths: Record<IconName, React.ReactNode> = {
  search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
  plus: <><path d="M12 5v14M5 12h14"/></>,
  branch: <><circle cx="6" cy="5" r="2"/><circle cx="18" cy="7" r="2"/><circle cx="6" cy="19" r="2"/><path d="M6 7v10M8 7h5a5 5 0 0 1 5 5v-3"/></>,
  file: <><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v5h5"/></>,
  spark: <path d="m12 3 1.25 4.1L17 9l-3.75 1.9L12 15l-1.25-4.1L7 9l3.75-1.9L12 3Zm-6 11 .7 2.3L9 17.5l-2.3 1.2L6 21l-.7-2.3L3 17.5l2.3-1.2L6 14Z"/>,
  clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  shield: <><path d="M12 3 5 6v5c0 4.8 2.8 8.1 7 10 4.2-1.9 7-5.2 7-10V6z"/><path d="m9 12 2 2 4-4"/></>,
  arrow: <><path d="M5 12h14M14 7l5 5-5 5"/></>,
  x: <><path d="m6 6 12 12M18 6 6 18"/></>,
  chevron: <path d="m14 6-6 6 6 6"/>,
  folder: <><path d="M3 6h7l2 2h9v10H3z"/><path d="M3 8V5h7l2 3"/></>,
  stop: <rect x="7" y="7" width="10" height="10" rx="1"/>,
}

function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>
}

const suggestedQuestions = [
  'Why did we choose bearer auth?',
  'What broke the last deployment?',
  'How is repository data isolated?',
]

function App() {
  const [activeView, setActiveView] = useState<'ask' | 'timeline'>('ask')
  const [query, setQuery] = useState('Why did we move authentication into the API client?')
  const [results, setResults] = useState<LoreMemory[]>([])
  const [exploreDemo, setExploreDemo] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [isConnecting, setIsConnecting] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => localStorage.getItem('lore-sidebar-collapsed') === 'true')
  const [connectionMessage, setConnectionMessage] = useState('')
  const [notice, setNotice] = useState('Demo memories · connect Local to search your own repo')
  const [showCapture, setShowCapture] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showBootstrap, setShowBootstrap] = useState(false)
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('lore-api-key') ?? '')
  const [apiUrl, setApiUrl] = useState(() => localStorage.getItem('lore-api-url') ?? 'http://localhost:6767')
  const [capture, setCapture] = useState({ title: '', content: '', file: '', type: 'decision' })
  const [repository, setRepository] = useState(() => localStorage.getItem('lore-repository') ?? 'lore')
  const [repositoryDraft, setRepositoryDraft] = useState(repository)
  const [documents, setDocuments] = useState<LocalDocument[]>([])
  const [documentTotal, setDocumentTotal] = useState(0)
  const [documentsLoaded, setDocumentsLoaded] = useState(false)
  const [isTimelineLoading, setIsTimelineLoading] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0, phase: '', failed: 0 })
  const [isCapturing, setIsCapturing] = useState(false)
  const searchController = useRef<AbortController | null>(null)

  const containerTag = useMemo(() => `lore_${repository.toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-|-$/g, '') || 'repository'}`, [repository])
  const fileCount = useMemo(() => new Set(documents.map((document) => document.file).filter((file) => file !== 'repository-wide')).size, [documents])
  const onboardingStage = useMemo<'connect' | 'loading' | 'import' | 'processing' | null>(() => {
    if (exploreDemo) return null
    if (!isConnected) return 'connect'
    if (importProgress.phase === 'processing') return 'processing'
    if (!documentsLoaded) return 'loading'
    if (documentTotal === 0) return 'import'
    if (documents.length > 0 && documents.every((document) => document.status !== 'done')) return 'processing'
    return null
  }, [documentTotal, documents, documentsLoaded, exploreDemo, importProgress.phase, isConnected])

  const refreshDocuments = useCallback(async (showLoading = true) => {
    if (showLoading) setIsTimelineLoading(true)
    try {
      const listed = await listDocuments({ apiUrl, apiKey, containerTag })
      setDocuments(listed.documents)
      setDocumentTotal(listed.total)
    } catch {
      if (showLoading) setNotice('Could not refresh repository memories')
    } finally {
      setDocumentsLoaded(true)
      if (showLoading) setIsTimelineLoading(false)
    }
  }, [apiKey, apiUrl, containerTag])

  useEffect(() => {
    let active = true
    probeSupermemory(apiUrl, apiKey).then(async (connected) => {
      if (!active) return
      setIsConnected(connected)
      if (!connected) setDocumentsLoaded(false)
      setNotice(connected ? 'Supermemory Local connected · ready for repository context' : 'Saved connection unavailable · start Supermemory Local')
      if (connected) await refreshDocuments(false)
    })
    return () => { active = false }
  }, [apiKey, apiUrl, containerTag, refreshDocuments])

  useEffect(() => {
    if (activeView === 'timeline' && isConnected) void refreshDocuments(true)
  }, [activeView, isConnected, containerTag, refreshDocuments])

  function toggleSidebar() {
    setIsSidebarCollapsed((collapsed) => {
      localStorage.setItem('lore-sidebar-collapsed', String(!collapsed))
      return !collapsed
    })
  }

  async function handleSearch(event?: FormEvent, requestedQuery?: string) {
    event?.preventDefault()
    const searchQuery = requestedQuery ?? query
    if (!searchQuery.trim()) return
    setIsSearching(true)
    setSearchError('')
    const controller = new AbortController()
    searchController.current = controller
    const timeout = window.setTimeout(() => controller.abort(), 12000)
    try {
      const found = await searchMemories({ apiUrl, apiKey, containerTag, query: searchQuery, signal: controller.signal })
      setResults(found.length ? found : [])
      setIsConnected(true)
      setNotice(found.length ? `${found.length} local memories found` : 'No matching memories yet')
    } catch (error) {
      const connected = await probeSupermemory(apiUrl, apiKey)
      setIsConnected(connected)
      if (connected) {
        setSearchError(error instanceof DOMException && error.name === 'AbortError' ? 'Search took longer than 12 seconds. Retry when ingestion finishes.' : 'Local search failed. Retry or check the engine logs.')
        setNotice('Search stopped without replacing your current results')
      } else {
        const q = searchQuery.toLowerCase()
        const fallback = demoMemories.filter((item) => `${item.title} ${item.content} ${item.file}`.toLowerCase().split(' ').some((word) => q.includes(word)))
        setResults(fallback.length ? fallback : demoMemories.slice(0, 2))
        setNotice('Local server unavailable · showing clearly labeled demo memories')
      }
    } finally {
      window.clearTimeout(timeout)
      searchController.current = null
      setIsSearching(false)
    }
  }

  function cancelSearch() {
    searchController.current?.abort()
  }

  function enterDemo() {
    setExploreDemo(true)
    setResults(demoMemories.slice(0, 2))
    setNotice('Demo memories · connect Local when you are ready to use your own repository')
  }

  async function saveSettings(event: FormEvent) {
    event.preventDefault()
    const normalizedUrl = apiUrl.replace(/\/$/, '')
    localStorage.setItem('lore-api-key', apiKey)
    localStorage.setItem('lore-api-url', normalizedUrl)
    setApiUrl(normalizedUrl)
    setIsConnecting(true)
    setConnectionMessage('Testing the local API…')
    setNotice('Checking Supermemory Local…')
    const connected = await probeSupermemory(normalizedUrl, apiKey)
    setIsConnected(connected)
    if (connected) {
      setExploreDemo(false)
      setDocumentsLoaded(false)
    }
    setNotice(connected ? 'Supermemory Local connected · ready for repository context' : 'Could not reach Supermemory Local · check that it is running')
    setConnectionMessage(connected ? 'Connected successfully. Repository memory is ready.' : 'Connection failed. Confirm the URL and that Supermemory Local is running.')
    setIsConnecting(false)
    if (connected) window.setTimeout(() => setShowSettings(false), 650)
  }

  async function handleCapture(event: FormEvent) {
    event.preventDefault()
    if (!capture.title || !capture.content) return
    setIsCapturing(true)
    try {
      const added = await addMemory({ apiUrl, apiKey, containerTag, memory: capture }) as { id?: string; status?: string }
      setIsConnected(true)
      setShowCapture(false)
      setCapture({ title: '', content: '', file: '', type: 'decision' })
      setNotice(added.status === 'done' ? 'Context is searchable' : 'Context uploaded · Supermemory is processing it')
      if (added.id) void watchDocument(added.id)
    } catch {
      setNotice('Could not reach Supermemory Local · check connection settings')
    } finally {
      setIsCapturing(false)
    }
  }

  async function watchDocument(id: string) {
    for (let attempt = 0; attempt < 15; attempt += 1) {
      await new Promise((resolve) => window.setTimeout(resolve, 1200))
      try {
        const current = await getDocumentStatus({ apiUrl, apiKey, id })
        setNotice(current.status === 'queued' ? 'Context queued for embedding…' : current.status === 'processing' ? 'Building searchable repository memory…' : current.status === 'failed' ? 'Context processing failed · check Supermemory logs' : 'Context is searchable')
        if (current.status === 'done' || current.status === 'failed') {
          await refreshDocuments(false)
          return
        }
      } catch { return }
    }
    setNotice('Context is still processing · you can keep working')
  }

  function chooseRepositoryFiles(files: FileList | null) {
    if (!files) return
    const allowed = /\.(md|mdx|txt|ts|tsx|js|jsx|json|css|scss|html|py|rs|go|java|kt|swift|sol|toml|ya?ml)$/i
    const ignored = /(^|\/)(node_modules|dist|build|coverage|\.git|\.next|\.supermemory)(\/|$)|(^|\/)(\.env($|\.)|.*\.(pem|key)|package-lock\.json|pnpm-lock\.yaml|yarn\.lock)$/i
    const safe = Array.from(files).filter((file) => {
      const path = file.webkitRelativePath || file.name
      return allowed.test(path) && !ignored.test(path) && file.size <= 300_000
    }).slice(0, 40)
    setSelectedFiles(safe)
    setImportProgress({ current: 0, total: safe.length, phase: safe.length ? 'ready' : 'No safe text files found', failed: 0 })
    const root = safe[0]?.webkitRelativePath.split('/')[0]
    if (root) setRepositoryDraft(root)
  }

  async function importRepository(event: FormEvent) {
    event.preventDefault()
    if (!selectedFiles.length || !repositoryDraft.trim()) return
    const nextRepository = repositoryDraft.trim()
    const nextContainer = `lore_${nextRepository.toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-|-$/g, '') || 'repository'}`
    setImportProgress({ current: 0, total: selectedFiles.length, phase: 'uploading', failed: 0 })
    let failed = 0
    const importedIds: string[] = []
    for (let index = 0; index < selectedFiles.length; index += 1) {
      const file = selectedFiles[index]
      const path = file.webkitRelativePath ? file.webkitRelativePath.split('/').slice(1).join('/') : file.name
      try {
        const imported = await addRepositoryFile({ apiUrl, apiKey, containerTag: nextContainer, repository: nextRepository, file: path, content: await file.text() })
        if (imported.id) importedIds.push(imported.id)
      } catch { failed += 1 }
      setImportProgress({ current: index + 1, total: selectedFiles.length, phase: 'uploading', failed })
    }
    setRepository(nextRepository)
    setDocumentsLoaded(false)
    localStorage.setItem('lore-repository', nextRepository)
    setImportProgress({ current: selectedFiles.length, total: selectedFiles.length, phase: 'processing', failed })
    setNotice(`${selectedFiles.length - failed} files uploaded · Supermemory is building repository memory`)
    void watchImportedDocuments(importedIds, nextContainer)
    window.setTimeout(() => {
      setShowBootstrap(false)
      setSelectedFiles([])
    }, 900)
  }

  async function watchImportedDocuments(ids: string[], targetContainer: string) {
    if (!ids.length) {
      setImportProgress((progress) => ({ ...progress, phase: 'complete' }))
      return
    }
    for (let attempt = 0; attempt < 20; attempt += 1) {
      await new Promise((resolve) => window.setTimeout(resolve, 1500))
      const statuses = await Promise.all(ids.map(async (id) => {
        try { return (await getDocumentStatus({ apiUrl, apiKey, id })).status } catch { return 'unknown' }
      }))
      const finished = statuses.filter((status) => status === 'done' || status === 'failed').length
      setImportProgress((progress) => ({ ...progress, current: finished, phase: finished === ids.length ? 'complete' : 'processing' }))
      if (finished === ids.length) {
        setNotice('Repository memory is ready · ask Lore your first question')
        const listed = await listDocuments({ apiUrl, apiKey, containerTag: targetContainer })
        setDocuments(listed.documents)
        setDocumentTotal(listed.total)
        setDocumentsLoaded(true)
        return
      }
    }
    setNotice('Repository is still processing · Timeline will update when it is ready')
    const listed = await listDocuments({ apiUrl, apiKey, containerTag: targetContainer })
    setDocuments(listed.documents)
    setDocumentTotal(listed.total)
    setDocumentsLoaded(true)
  }

  return (
    <div className={isSidebarCollapsed ? 'app-shell sidebar-collapsed' : 'app-shell'}>
      <aside className={isSidebarCollapsed ? 'sidebar collapsed' : 'sidebar'}>
        <div className="brand"><span className="brand-mark">L</span><span className="brand-name">Lore</span><button className="sidebar-toggle" onClick={toggleSidebar} aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'} aria-expanded={!isSidebarCollapsed}><Icon name="chevron" size={17}/></button></div>
        <nav aria-label="Primary navigation">
          <button title="Ask Lore" className={activeView === 'ask' ? 'nav-item active' : 'nav-item'} onClick={() => setActiveView('ask')}><Icon name="search"/><span>Ask Lore</span></button>
          <button title={!isConnected && !exploreDemo ? 'Connect Supermemory Local first' : 'Timeline'} disabled={!isConnected && !exploreDemo} className={activeView === 'timeline' ? 'nav-item active' : 'nav-item'} onClick={() => setActiveView('timeline')}><Icon name="clock"/><span>Timeline</span></button>
        </nav>
        <div className="repo-block">
          <p className="eyebrow">Current repository</p>
          <div className="repo-name"><Icon name="branch"/><div><strong>{repository}</strong><span>{isConnected ? 'local container' : 'demo workspace'}</span></div></div>
          <div className="repo-stats"><span>{documentTotal} memories</span><span>{fileCount} files</span></div>
        </div>
        <div className="local-card">
          <div className="local-status"><span className={isConnected ? 'status-dot online' : 'status-dot'}/><strong>{isConnected ? 'Local connected' : 'Demo mode'}</strong></div>
          <p>{isConnected ? 'Your context never leaves this machine.' : 'Connect the memory engine to use real repository context.'}</p>
          <button onClick={() => setShowSettings(true)}>{isConnected ? 'Connection settings' : 'Connect localhost:6767'}<Icon name="arrow" size={15}/></button>
        </div>
        <div className="sidebar-footer"><Icon name="shield" size={16}/>Private by architecture</div>
      </aside>

      <main>
        <header className="topbar">
          <div><span className="breadcrumb">Repositories / lore</span></div>
          <div className="topbar-actions"><button className="import-button" onClick={() => { if (!isConnected) { setShowSettings(true); return } setRepositoryDraft(repository); setShowBootstrap(true) }}><Icon name="folder"/>{isConnected ? 'Import repository' : 'Connect first'}</button><button className="capture-button" disabled={!isConnected} title={!isConnected ? 'Connect Supermemory Local first' : undefined} onClick={() => setShowCapture(true)}><Icon name="plus"/>Capture context</button></div>
        </header>

        {activeView === 'ask' ? (
          <div className="content">
            <section className="hero-copy">
              <div className="kicker"><Icon name="spark" size={16}/>Repository intelligence</div>
              <h1>Ask the codebase<br/><em>why.</em></h1>
              <p>Lore remembers the decisions, dead ends, and fixes that Git cannot—entirely on your machine.</p>
            </section>

            {onboardingStage && <section className="onboarding-card" aria-labelledby="onboarding-title">
              <div className="onboarding-progress" aria-label="Setup progress">
                <div className={isConnected ? 'setup-step complete' : 'setup-step active'}><span>1</span><div><strong>Connect</strong><small>Supermemory Local</small></div></div>
                <i/>
                <div className={documentTotal > 0 || importProgress.phase === 'processing' || importProgress.phase === 'complete' ? 'setup-step complete' : onboardingStage === 'import' ? 'setup-step active' : 'setup-step'}><span>2</span><div><strong>Import</strong><small>Repository context</small></div></div>
                <i/>
                <div className={onboardingStage === 'processing' ? 'setup-step active' : 'setup-step'}><span>3</span><div><strong>Ask</strong><small>Evidence-backed answers</small></div></div>
              </div>
              <div className="onboarding-content">
                <div className="onboarding-icon"><Icon name={onboardingStage === 'connect' ? 'shield' : onboardingStage === 'import' ? 'folder' : 'spark'} size={22}/></div>
                <div><p className="eyebrow">{onboardingStage === 'connect' ? 'Step 1 of 3' : onboardingStage === 'import' ? 'Step 2 of 3' : onboardingStage === 'processing' ? 'Building repository memory' : 'Checking repository'}</p><h2 id="onboarding-title">{onboardingStage === 'connect' ? 'Connect your private memory engine' : onboardingStage === 'import' ? 'Choose the repository Lore should remember' : onboardingStage === 'processing' ? 'Turning source into searchable context' : 'Loading your local workspace…'}</h2><p>{onboardingStage === 'connect' ? 'Lore uses Supermemory Local so repository context stays on your machine. Start it on port 6767, then test the connection.' : onboardingStage === 'import' ? 'Select a project folder. Lore safely filters dependencies, builds, credentials, binaries, and oversized files before importing.' : onboardingStage === 'processing' ? `${importProgress.current || documents.filter((document) => document.status === 'done').length} of ${importProgress.total || documentTotal} documents ready. You can inspect Timeline while indexing continues.` : 'Checking the active repository container for existing memory.'}</p></div>
              </div>
              <div className="onboarding-actions">{onboardingStage === 'connect' ? <><button className="primary" onClick={() => setShowSettings(true)}>Connect Supermemory Local<Icon name="arrow" size={16}/></button><button className="text-button" onClick={enterDemo}>Explore the demo instead</button></> : onboardingStage === 'import' ? <button className="primary" onClick={() => setShowBootstrap(true)}>Choose repository folder<Icon name="folder" size={16}/></button> : onboardingStage === 'processing' ? <button className="primary secondary" onClick={() => setActiveView('timeline')}>View processing timeline<Icon name="clock" size={16}/></button> : <span className="checking-label"><span className="loading-ring"/>Checking local memory…</span>}</div>
            </section>}

            {!onboardingStage && isConnected && <div className="ready-strip"><span><Icon name="shield" size={15}/>Local connected</span><span><Icon name="folder" size={15}/>{fileCount} files indexed</span><strong>Ready to ask</strong></div>}

            <form className={onboardingStage ? 'search-box onboarding-hidden' : 'search-box'} onSubmit={handleSearch}>
              <Icon name="search" size={21}/>
              <input aria-label="Ask your repository" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Why was this built this way?"/>
              <button type={isSearching ? 'button' : 'submit'} onClick={isSearching ? cancelSearch : undefined}>{isSearching ? 'Stop search' : 'Ask Lore'}<Icon name={isSearching ? 'stop' : 'arrow'} size={16}/></button>
            </form>
            {searchError && <div className="search-error" role="alert"><span>{searchError}</span><button onClick={() => void handleSearch()}>Retry</button></div>}
            <div className={onboardingStage ? 'suggestions onboarding-hidden' : 'suggestions'} aria-label="Suggested questions">
              {suggestedQuestions.map((item) => <button key={item} onClick={() => { setQuery(item); void handleSearch(undefined, item) }}>{item}</button>)}
            </div>

            <section className={onboardingStage ? 'answer-section onboarding-hidden' : 'answer-section'}>
              <div className="section-heading"><div><p className="eyebrow">Answer</p><h2>What the repository remembers</h2></div><span className={isConnected ? 'source-badge live' : 'source-badge'}>{isConnected ? 'Live local data' : 'Demo data'}</span></div>
              <p className="notice">{notice}</p>
              {results.length === 0 ? (
                <div className="empty-state"><Icon name="spark" size={24}/><h3>No matching lore yet</h3><p>Capture a decision or try a broader question.</p></div>
              ) : results.map((memory, index) => (
                <article className="memory-card" key={`${memory.title}-${index}`}>
                  <div className="memory-index">0{index + 1}</div>
                  <div className="memory-body">
                    <div className="memory-meta"><span className={`type ${memory.type}`}>{memory.type}</span><span>{memory.date}</span><span>confidence {memory.confidence}%</span></div>
                    <h3>{memory.title}</h3>
                    <p>{memory.content}</p>
                    <div className="evidence"><Icon name="file" size={15}/><code>{memory.file}</code><span>{memory.commit}</span></div>
                  </div>
                </article>
              ))}
            </section>
          </div>
        ) : (
          <div className="content timeline-view">
            <div className="kicker"><Icon name="clock" size={16}/>Memory trail</div>
            <h1>How this repository<br/><em>became itself.</em></h1>
            <p className="timeline-intro">A local, searchable record of technical intent—not just commits.</p>
            <div className="timeline-toolbar"><span>{isConnected ? `${documentTotal} memories in ${repository}` : 'Connect Supermemory Local to load this repository'}</span>{isConnected && <button onClick={() => void refreshDocuments(true)}>Refresh</button>}</div>
            {isTimelineLoading ? <div className="timeline-state"><span className="loading-ring"/>Loading repository history…</div> : isConnected && documents.length === 0 ? <div className="empty-state timeline-empty"><Icon name="folder" size={24}/><h3>No repository memory yet</h3><p>Import a folder or capture the first technical decision.</p><button className="primary compact" onClick={() => setShowBootstrap(true)}>Import repository</button></div> : <div className="timeline-list">{(isConnected ? documents : demoMemories).map((memory, index, list) => {
              const date = 'createdAt' in memory ? new Date(memory.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : memory.date
              return <article key={'id' in memory ? memory.id : memory.title}><span className="timeline-dot"/><time>{date}</time><div><span className={`type ${memory.type}`}>{memory.type}</span>{'status' in memory && memory.status !== 'done' && <span className={`processing-status ${memory.status}`}>{memory.status}</span>}<h3>{memory.title}</h3><p>{memory.content || ('status' in memory ? `Supermemory is ${memory.status}. Content will appear when processing finishes.` : '')}</p><code>{memory.file}</code></div>{index < list.length - 1 && <span className="timeline-line"/>}</article>
            })}</div>}
          </div>
        )}
      </main>

      {showCapture && <div className="modal-backdrop" role="presentation"><section className="modal" role="dialog" aria-modal="true" aria-labelledby="capture-title"><button className="close" aria-label="Close" onClick={() => setShowCapture(false)}><Icon name="x"/></button><div className="modal-icon"><Icon name="plus"/></div><p className="eyebrow">New repository memory</p><h2 id="capture-title">Capture the why</h2><p>Record the context future contributors—and future you—will need.</p><form onSubmit={handleCapture}><label>Short title<input required value={capture.title} onChange={(e) => setCapture({...capture, title: e.target.value})} placeholder="Why we chose this approach"/></label><label>Context<textarea required value={capture.content} onChange={(e) => setCapture({...capture, content: e.target.value})} placeholder="Decision, alternatives considered, and tradeoffs…" rows={5}/></label><div className="form-row"><label>File path<input value={capture.file} onChange={(e) => setCapture({...capture, file: e.target.value})} placeholder="src/lib/api.ts"/></label><label>Kind<select value={capture.type} onChange={(e) => setCapture({...capture, type: e.target.value})}><option value="decision">Decision</option><option value="fix">Fix</option><option value="constraint">Constraint</option><option value="discovery">Discovery</option></select></label></div><button className="primary" type="submit" disabled={isCapturing}>{isCapturing ? 'Uploading context…' : 'Commit to local memory'}{!isCapturing && <Icon name="arrow" size={16}/>}</button></form></section></div>}

      {showBootstrap && <div className="modal-backdrop" role="presentation"><section className="modal bootstrap-modal" role="dialog" aria-modal="true" aria-labelledby="bootstrap-title"><button className="close" aria-label="Close" onClick={() => setShowBootstrap(false)}><Icon name="x"/></button><div className="modal-icon"><Icon name="folder"/></div><p className="eyebrow">Repository bootstrap</p><h2 id="bootstrap-title">Give Lore the starting context</h2><p>Select a repository folder. Lore imports up to 40 safe text and source files, while ignoring dependencies, builds, credentials, keys, and lockfiles.</p><form onSubmit={importRepository}><label>Repository name<input required value={repositoryDraft} onChange={(event) => setRepositoryDraft(event.target.value)} placeholder="my-project"/></label><label className="folder-picker"><input type="file" multiple ref={(input) => { if (input) input.setAttribute('webkitdirectory', '') }} onChange={(event) => chooseRepositoryFiles(event.currentTarget.files)}/><Icon name="folder" size={22}/><span><strong>{selectedFiles.length ? `${selectedFiles.length} files ready` : 'Choose repository folder'}</strong><small>Text and source files · 300 KB maximum per file</small></span></label>{importProgress.total > 0 && <div className="import-progress" role="status"><div><span>{importProgress.phase === 'ready' ? 'Ready to import' : importProgress.phase === 'processing' ? 'Uploaded · processing' : `Uploading ${importProgress.current} of ${importProgress.total}`}</span><span>{Math.round((importProgress.current / importProgress.total) * 100)}%</span></div><progress value={importProgress.current} max={importProgress.total}/>{importProgress.failed > 0 && <small>{importProgress.failed} files could not be uploaded.</small>}</div>}<div className="privacy-note"><Icon name="shield" size={16}/><span>Files go directly to your local Supermemory container. Lore does not upload them to a hosted backend.</span></div><button className="primary" type="submit" disabled={!selectedFiles.length || importProgress.phase === 'uploading'}>{importProgress.phase === 'uploading' ? 'Importing repository…' : 'Build repository memory'}{importProgress.phase !== 'uploading' && <Icon name="arrow" size={16}/>}</button></form></section></div>}

      {showSettings && <div className="modal-backdrop" role="presentation"><section className="modal small" role="dialog" aria-modal="true" aria-labelledby="settings-title"><button className="close" aria-label="Close" onClick={() => setShowSettings(false)}><Icon name="x"/></button><div className="modal-icon"><Icon name="shield"/></div><p className="eyebrow">Private connection</p><h2 id="settings-title">Supermemory Local</h2><p>These credentials stay in this browser and are sent only to your local server.</p><form onSubmit={saveSettings}><label>Local API URL<input value={apiUrl} onChange={(e) => setApiUrl(e.target.value)} placeholder="http://localhost:6767"/></label><label>Bearer API key <span>(optional on localhost)</span><input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="sm_…"/></label><div className="container-preview"><span>Container</span><code>{containerTag}</code></div>{connectionMessage && <p className={isConnected ? 'connection-feedback success' : 'connection-feedback'} role="status">{connectionMessage}</p>}<button className="primary" type="submit" disabled={isConnecting}>{isConnecting ? 'Testing connection…' : 'Test & save connection'}{!isConnecting && <Icon name="arrow" size={16}/>}</button></form></section></div>}
    </div>
  )
}

export default App
