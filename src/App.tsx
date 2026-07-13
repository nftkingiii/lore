import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import './App.css'
import {
  type LoreMemory,
  addMemory,
  demoMemories,
  searchMemories,
} from './lib/supermemory'

type IconName = 'search' | 'plus' | 'branch' | 'file' | 'spark' | 'clock' | 'shield' | 'arrow' | 'x'

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
  const [results, setResults] = useState<LoreMemory[]>(demoMemories.slice(0, 2))
  const [isSearching, setIsSearching] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [notice, setNotice] = useState('Demo memories · connect Local to search your own repo')
  const [showCapture, setShowCapture] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('lore-api-key') ?? '')
  const [apiUrl, setApiUrl] = useState(() => localStorage.getItem('lore-api-url') ?? 'http://localhost:6767')
  const [capture, setCapture] = useState({ title: '', content: '', file: '', type: 'decision' })

  const containerTag = useMemo(() => 'lore_localhost-hack-quick', [])

  async function handleSearch(event?: FormEvent) {
    event?.preventDefault()
    if (!query.trim()) return
    setIsSearching(true)
    try {
      const found = await searchMemories({ apiUrl, apiKey, containerTag, query })
      setResults(found.length ? found : [])
      setIsConnected(true)
      setNotice(found.length ? `${found.length} local memories found` : 'No matching memories yet')
    } catch {
      const q = query.toLowerCase()
      const fallback = demoMemories.filter((item) => `${item.title} ${item.content} ${item.file}`.toLowerCase().split(' ').some((word) => q.includes(word)))
      setResults(fallback.length ? fallback : demoMemories.slice(0, 2))
      setIsConnected(false)
      setNotice('Local server unavailable · showing clearly labeled demo memories')
    } finally {
      setIsSearching(false)
    }
  }

  function saveSettings(event: FormEvent) {
    event.preventDefault()
    localStorage.setItem('lore-api-key', apiKey)
    localStorage.setItem('lore-api-url', apiUrl.replace(/\/$/, ''))
    setShowSettings(false)
    setNotice('Connection saved locally in this browser')
  }

  async function handleCapture(event: FormEvent) {
    event.preventDefault()
    if (!capture.title || !capture.content) return
    try {
      await addMemory({ apiUrl, apiKey, containerTag, memory: capture })
      setIsConnected(true)
      setNotice('Decision committed to Supermemory Local')
      setShowCapture(false)
      setCapture({ title: '', content: '', file: '', type: 'decision' })
    } catch {
      setNotice('Could not reach Supermemory Local · check connection settings')
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">L</span><span>Lore</span></div>
        <nav aria-label="Primary navigation">
          <button className={activeView === 'ask' ? 'nav-item active' : 'nav-item'} onClick={() => setActiveView('ask')}><Icon name="search"/>Ask Lore</button>
          <button className={activeView === 'timeline' ? 'nav-item active' : 'nav-item'} onClick={() => setActiveView('timeline')}><Icon name="clock"/>Timeline</button>
        </nav>
        <div className="repo-block">
          <p className="eyebrow">Current repository</p>
          <div className="repo-name"><Icon name="branch"/><div><strong>lore</strong><span>main · clean</span></div></div>
          <div className="repo-stats"><span>24 memories</span><span>8 files</span></div>
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
          <button className="capture-button" onClick={() => setShowCapture(true)}><Icon name="plus"/>Capture context</button>
        </header>

        {activeView === 'ask' ? (
          <div className="content">
            <section className="hero-copy">
              <div className="kicker"><Icon name="spark" size={16}/>Repository intelligence</div>
              <h1>Ask the codebase<br/><em>why.</em></h1>
              <p>Lore remembers the decisions, dead ends, and fixes that Git cannot—entirely on your machine.</p>
            </section>

            <form className="search-box" onSubmit={handleSearch}>
              <Icon name="search" size={21}/>
              <input aria-label="Ask your repository" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Why was this built this way?"/>
              <button disabled={isSearching}>{isSearching ? 'Searching…' : 'Ask Lore'}<Icon name="arrow" size={16}/></button>
            </form>
            <div className="suggestions" aria-label="Suggested questions">
              {suggestedQuestions.map((item) => <button key={item} onClick={() => { setQuery(item); }}>{item}</button>)}
            </div>

            <section className="answer-section">
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
            <div className="timeline-list">{demoMemories.map((memory, index) => <article key={memory.title}><span className="timeline-dot"/><time>{memory.date}</time><div><span className={`type ${memory.type}`}>{memory.type}</span><h3>{memory.title}</h3><p>{memory.content}</p><code>{memory.file}</code></div>{index < demoMemories.length - 1 && <span className="timeline-line"/>}</article>)}</div>
          </div>
        )}
      </main>

      {showCapture && <div className="modal-backdrop" role="presentation"><section className="modal" role="dialog" aria-modal="true" aria-labelledby="capture-title"><button className="close" aria-label="Close" onClick={() => setShowCapture(false)}><Icon name="x"/></button><div className="modal-icon"><Icon name="plus"/></div><p className="eyebrow">New repository memory</p><h2 id="capture-title">Capture the why</h2><p>Record the context future contributors—and future you—will need.</p><form onSubmit={handleCapture}><label>Short title<input required value={capture.title} onChange={(e) => setCapture({...capture, title: e.target.value})} placeholder="Why we chose this approach"/></label><label>Context<textarea required value={capture.content} onChange={(e) => setCapture({...capture, content: e.target.value})} placeholder="Decision, alternatives considered, and tradeoffs…" rows={5}/></label><div className="form-row"><label>File path<input value={capture.file} onChange={(e) => setCapture({...capture, file: e.target.value})} placeholder="src/lib/api.ts"/></label><label>Kind<select value={capture.type} onChange={(e) => setCapture({...capture, type: e.target.value})}><option value="decision">Decision</option><option value="fix">Fix</option><option value="constraint">Constraint</option><option value="discovery">Discovery</option></select></label></div><button className="primary" type="submit">Commit to local memory<Icon name="arrow" size={16}/></button></form></section></div>}

      {showSettings && <div className="modal-backdrop" role="presentation"><section className="modal small" role="dialog" aria-modal="true" aria-labelledby="settings-title"><button className="close" aria-label="Close" onClick={() => setShowSettings(false)}><Icon name="x"/></button><div className="modal-icon"><Icon name="shield"/></div><p className="eyebrow">Private connection</p><h2 id="settings-title">Supermemory Local</h2><p>These credentials stay in this browser and are sent only to your local server.</p><form onSubmit={saveSettings}><label>Local API URL<input value={apiUrl} onChange={(e) => setApiUrl(e.target.value)} placeholder="http://localhost:6767"/></label><label>Bearer API key<input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="sm_…"/></label><div className="container-preview"><span>Container</span><code>{containerTag}</code></div><button className="primary" type="submit">Save connection<Icon name="arrow" size={16}/></button></form></section></div>}
    </div>
  )
}

export default App
