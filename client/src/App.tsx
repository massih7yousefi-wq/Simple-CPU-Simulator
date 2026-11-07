
import { useCallback, useEffect, useMemo, useState } from 'react'
import './App.css'

type CpuStatus = 'Ready' | 'Running' | 'Halted' | 'Error'

type CpuState = {
  registers: number[]
  memory: number[]
  pc: number
  zeroFlag: boolean
  status: CpuStatus
  lastError: string | null
  lastOperation: string | null
}

type CpuSnapshot = {
  state: CpuState
  program: unknown[]
  programText: string
}

const INITIAL_PROGRAM = `LOAD R0, #5
ADD R0, #3
STORE R0, [10]
HALT`

const emptyState: CpuState = {
  registers: [0, 0],
  memory: Array(256).fill(0),
  pc: 0,
  zeroFlag: false,
  status: 'Ready',
  lastError: null,
  lastOperation: null,
}

async function apiRequest<T>(
  path: string,
  method = 'GET',
  body?: unknown,
): Promise<T> {
  const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '')
  const response = await fetch(`${apiBaseUrl}/api/cpu/${path}`, {
    method,
    headers: body === undefined
      ? undefined
      : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  if (!response.ok) {
    let message = `Request failed (${response.status})`

    try {
      const data = await response.json()
      message = data.error ?? data.title ?? message
    } catch {
      // Keep the fallback message if the response is not JSON.
    }

    throw new Error(message)
  }

  return response.json() as Promise<T>
}

function App() {
  const [programText, setProgramText] = useState(INITIAL_PROGRAM)
  const [cpu, setCpu] = useState<CpuState>(emptyState)
  const [loaded, setLoaded] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [history, setHistory] = useState<string[]>([])
  const [memoryStart, setMemoryStart] = useState(0)
  const [memoryFilter, setMemoryFilter] = useState<'all' | 'nonzero'>('all')

  const addHistory = useCallback((message: string) => {
    const time = new Date().toLocaleTimeString()
    setHistory(previous => [`${time}  ${message}`, ...previous].slice(0, 30))
  }, [])

  const syncState = useCallback(async () => {
    const data = await apiRequest<CpuSnapshot>('state')
    setCpu(data.state)
    if (data.programText) setProgramText(data.programText)
    setLoaded(data.program.length > 0)
  }, [])

  useEffect(() => {
    syncState().catch(() => {
      setNotice('API is waiting. Start the .NET backend on port 5089.')
    })
  }, [syncState])

  const currentInstruction = useMemo(() => {
    const lines = programText
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(Boolean)

    return lines[cpu.pc] ?? (cpu.status === 'Halted' ? 'HALT' : 'No instruction')
  }, [programText, cpu.pc, cpu.status])

  const memoryCells = useMemo(() => {
    const end = Math.min(memoryStart + 32, 256)

    return Array.from({ length: end - memoryStart }, (_, index) => {
      const address = memoryStart + index
      return { address, value: cpu.memory[address] ?? 0 }
    }).filter(cell => memoryFilter === 'all' || cell.value !== 0)
  }, [cpu.memory, memoryStart, memoryFilter])

  async function loadProgram() {
    setBusy(true)
    setError('')
    setNotice('')

    try {
      const state = await apiRequest<CpuState>('load', 'POST', {
        program: programText,
      })

      setCpu(state)
      setLoaded(true)
      setHistory([])
      addHistory('Program loaded successfully')
      setNotice('Program loaded. CPU is ready.')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not load program'
      setError(message)
      addHistory(`Load failed: ${message}`)
    } finally {
      setBusy(false)
    }
  }

  async function stepCpu() {
    setBusy(true)
    setError('')
    setNotice('')

    try {
      const state = await apiRequest<CpuState>('step', 'POST')
      setCpu(state)
      addHistory(`Executed ${state.lastOperation ?? 'instruction'} Â· PC = ${state.pc}`)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Step failed'
      setError(message)

      try {
        await syncState()
      } catch {
        // Preserve the original execution error.
      }

      addHistory(`Step failed: ${message}`)
    } finally {
      setBusy(false)
    }
  }

  async function runCpu() {
    setBusy(true)
    setError('')
    setNotice('')

    try {
      const state = await apiRequest<CpuState>('run', 'POST')
      setCpu(state)
      addHistory(`Run finished Â· status ${state.status} Â· PC = ${state.pc}`)

      if (state.status === 'Error') {
        setError(state.lastError ?? 'CPU execution failed')
      } else if (state.status === 'Halted') {
        setNotice('Execution completed successfully.')
      } else {
        setNotice('Execution stopped after the instruction limit.')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Run failed'
      setError(message)
      addHistory(`Run failed: ${message}`)
    } finally {
      setBusy(false)
    }
  }

  async function resetCpu() {
    setBusy(true)
    setError('')
    setNotice('')

    try {
      const state = await apiRequest<CpuState>('reset', 'POST')
      setCpu(state)
      addHistory('CPU reset')
      setNotice('CPU reset. The program is still loaded.')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Reset failed'
      setError(message)
    } finally {
      setBusy(false)
    }
  }

  const statusClass = cpu.status.toLowerCase()

  return (
    <main className="app-shell">
      <video
        className="background-video"
        autoPlay
        muted
        loop
        playsInline
        aria-hidden="true"
      >
        <source
          src="/15254965_1920_1080_24fps.mp4"
          type="video/mp4"
        />
      </video>

      <div className="video-overlay" />
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <div className="dashboard">
        <header className="topbar glass">
          <a className="brand" href="#" aria-label="CPU Lab home">
            <div className="brand-icon">C<span>â†—</span></div>
            <div>
              <div className="brand-name">NEXUS<span> CPU</span></div>
              <div className="brand-caption">ARCHITECTURE LAB / 01</div>
            </div>
          </a>

          <div className="topbar-center">
            <span className="live-dot" />
            <span>SIMULATION ENVIRONMENT</span>
          </div>

          <div className="topbar-right">
            <span className="version-tag">16-BIT</span>
            <span className="version-tag">v1.0.0</span>
          </div>
        </header>

        <section className="hero">
          <div>
            <div className="eyebrow"><span /> COMPUTER ARCHITECTURE / SIMULATOR</div>
            <h1>CPU <span>CONTROL</span> CENTER</h1>
            <p className="hero-description">
              A visual playground for instruction execution, registers and memory.
            </p>
          </div>

          <div className="hero-status glass">
            <div className={`status-light ${statusClass}`} />
            <div>
              <div className="mini-label">PROCESSOR STATUS</div>
              <div className={`status-value ${statusClass}`}>{cpu.status}</div>
            </div>
            <div className="status-divider" />
            <div>
              <div className="mini-label">PROGRAM COUNTER</div>
              <div className="status-value mono">0x{cpu.pc.toString(16).toUpperCase().padStart(2, '0')}</div>
            </div>
          </div>
        </section>

        {notice && (
          <div className="notice glass" role="status">
            <span>âœ¦</span> {notice}
            <button onClick={() => setNotice('')} aria-label="Dismiss notice">Ã—</button>
          </div>
        )}

        {error && (
          <div className="error-banner glass" role="alert">
            <span className="error-symbol">!</span>
            <div><strong>Execution error</strong><p>{error}</p></div>
            <button onClick={() => setError('')} aria-label="Dismiss error">Ã—</button>
          </div>
        )}

        <div className="main-grid">
          <section className="panel editor-panel glass">
            <div className="panel-heading">
              <div className="heading-icon purple">âŒ˜</div>
              <div>
                <h2>Program Editor</h2>
                <p>Write your assembly instructions</p>
              </div>
              <span className="panel-index">01</span>
            </div>

            <div className="editor-toolbar">
              <div className="file-name"><span className="file-dot" /> main.asm</div>
              <span className="language-tag">ASSEMBLY</span>
            </div>

            <div className="code-editor">
              <div className="line-numbers" aria-hidden="true">
                {programText.split('\n').map((_, index) => (
                  <span
                    key={index}
                    className={index === cpu.pc && loaded ? 'active-line-number' : ''}
                  >
                    {String(index + 1).padStart(2, '0')}
                  </span>
                ))}
              </div>
              <textarea
                spellCheck={false}
                aria-label="Assembly program editor"
                value={programText}
                onChange={event => setProgramText(event.target.value)}
                disabled={busy}
              />
            </div>

            <div className="instruction-hint">
              <span>i</span>
              <div>
                <strong>Supported instructions</strong>
                <p>LOAD Â· ADD Â· SUB Â· STORE Â· JMP Â· JZ Â· HALT</p>
              </div>
            </div>

            <div className="editor-actions">
              <button className="button button-primary" onClick={loadProgram} disabled={busy}>
                <span>â†“</span> Load Program
              </button>
              <button className="button button-ghost" onClick={() => setProgramText(INITIAL_PROGRAM)} disabled={busy}>
                Clear / Example
              </button>
            </div>
          </section>

          <div className="right-column">
            <section className="panel execution-panel glass">
              <div className="panel-heading">
                <div className="heading-icon cyan">â–·</div>
                <div>
                  <h2>Execution Control</h2>
                  <p>Control the instruction cycle</p>
                </div>
                <span className="panel-index">02</span>
              </div>

              <div className="current-instruction">
                <div className="mini-label">CURRENT INSTRUCTION</div>
                <div className="instruction-code">{currentInstruction}</div>
                <div className="instruction-meta">
                  <span>PC <b>{cpu.pc}</b></span>
                  <span>OP <b>{cpu.lastOperation ?? 'â€”'}</b></span>
                </div>
              </div>

              <div className="control-buttons">
                <button className="button button-primary" onClick={stepCpu} disabled={busy || !loaded || cpu.status === 'Halted' || cpu.status === 'Error'}>
                  <span>â–¸|</span> Step
                </button>
                <button className="button button-run" onClick={runCpu} disabled={busy || !loaded || cpu.status === 'Halted' || cpu.status === 'Error'}>
                  <span>â–¶</span> Run
                </button>
                <button className="button button-ghost reset-button" onClick={resetCpu} disabled={busy || !loaded}>
                  <span>â†»</span> Reset
                </button>
              </div>

              <div className="execution-footer">
                <span className={`tiny-status ${statusClass}`} />
                {busy ? 'PROCESSING INSTRUCTIONâ€¦' : `${cpu.status.toUpperCase()} Â· ${loaded ? 'PROGRAM LOADED' : 'NO PROGRAM'}`}
                <span className="footer-spacer" />
                <span className="mono">16-BIT</span>
              </div>
            </section>

            <section className="panel flags-panel glass">
              <div className="panel-heading compact-heading">
                <div className="heading-icon gold">âš‘</div>
                <div>
                  <h2>CPU Flags</h2>
                  <p>Arithmetic condition state</p>
                </div>
              </div>

              <div className="flag-row">
                <div className="flag-name">
                  <span className={`flag-indicator ${cpu.zeroFlag ? 'flag-active' : ''}`} />
                  <div><strong>Zero Flag</strong><small>Z Â· Result equals zero</small></div>
                </div>
                <span className={`flag-value ${cpu.zeroFlag ? 'on' : ''}`}>{cpu.zeroFlag ? '1 / SET' : '0 / CLEAR'}</span>
              </div>
            </section>
          </div>
        </div>

        <section className="panel registers-panel glass">
          <div className="panel-heading">
            <div className="heading-icon blue">â–¤</div>
            <div>
              <h2>CPU Registers</h2>
              <p>16-bit general-purpose registers</p>
            </div>
            <span className="panel-index">03</span>
          </div>

          <div className="register-grid">
            {[0, 1].map(index => (
              <div className="register-card" key={index}>
                <div className="register-top">
                  <span className="register-label">GENERAL PURPOSE</span>
                  <span className="register-hex">R{index}</span>
                </div>
                <div className="register-value">{(cpu.registers[index] ?? 0).toString().padStart(5, '0')}</div>
                <div className="register-bottom">
                  <span>REGISTER R{index}</span>
                  <span>0x{(cpu.registers[index] ?? 0).toString(16).toUpperCase().padStart(4, '0')}</span>
                </div>
                <div className="register-bar"><span style={{ width: `${((cpu.registers[index] ?? 0) / 65535) * 100}%` }} /></div>
              </div>
            ))}
            <div className="register-card pc-card">
              <div className="register-top">
                <span className="register-label">INSTRUCTION POINTER</span>
                <span className="register-hex">PC</span>
              </div>
              <div className="register-value">{String(cpu.pc).padStart(5, '0')}</div>
              <div className="register-bottom">
                <span>PROGRAM COUNTER</span>
                <span>0x{cpu.pc.toString(16).toUpperCase().padStart(4, '0')}</span>
              </div>
              <div className="register-bar"><span style={{ width: `${Math.min((cpu.pc / Math.max(programText.split('\n').length, 1)) * 100, 100)}%` }} /></div>
            </div>
          </div>
        </section>

        <section className="panel memory-panel glass">
          <div className="panel-heading memory-heading">
            <div className="heading-icon green">â–¦</div>
            <div>
              <h2>Memory Inspector</h2>
              <p>256 addressable cells Â· 16-bit values</p>
            </div>
            <div className="memory-tools">
              <select
                aria-label="Memory filter"
                value={memoryFilter}
                onChange={event => setMemoryFilter(event.target.value as 'all' | 'nonzero')}
              >
                <option value="all">All cells</option>
                <option value="nonzero">Non-zero only</option>
              </select>
              <span className="memory-count">256 CELLS</span>
            </div>
          </div>

          <div className="memory-range">
            <span>ADDRESS RANGE</span>
            <div className="range-buttons">
              {[0, 32, 64, 96, 128, 160, 192, 224].map(start => (
                <button
                  key={start}
                  className={memoryStart === start ? 'range-active' : ''}
                  onClick={() => setMemoryStart(start)}
                >
                  {start.toString().padStart(3, '0')}
                </button>
              ))}
            </div>
          </div>

          <div className="memory-grid">
            {memoryCells.map(cell => (
              <div className={`memory-cell ${cell.value !== 0 ? 'memory-used' : ''} ${cell.address === 10 && cell.value !== 0 ? 'memory-highlight' : ''}`} key={cell.address}>
                <span className="memory-address">{cell.address.toString().padStart(3, '0')}</span>
                <span className="memory-value">{cell.value.toString().padStart(5, '0')}</span>
              </div>
            ))}
            {memoryCells.length === 0 && (
              <div className="empty-memory">No non-zero values in this range.</div>
            )}
          </div>

          <div className="memory-footer">
            <span><i className="legend-dot used" /> Non-zero data</span>
            <span><i className="legend-dot" /> Empty cell</span>
            <span className="footer-spacer" />
            <span>SHOWING {memoryStart}â€“{Math.min(memoryStart + 31, 255)}</span>
          </div>
        </section>

        <section className="panel history-panel glass">
          <div className="panel-heading">
            <div className="heading-icon purple">â‰‹</div>
            <div>
              <h2>Execution Log</h2>
              <p>Recent simulator events</p>
            </div>
            <button className="clear-log" onClick={() => setHistory([])}>Clear log Ã—</button>
          </div>

          <div className="history-list">
            {history.length === 0 ? (
              <div className="history-empty">
                <span>âŒ</span> Waiting for execution eventsâ€¦
              </div>
            ) : history.map((item, index) => (
              <div className="history-item" key={`${item}-${index}`}>
                <span className="history-dot" />
                <span className="history-text">{item}</span>
              </div>
            ))}
          </div>
        </section>

        <footer className="app-footer">
          <span> NEXUS CPU LAB <span className="footer-dot">Â·</span> EDUCATIONAL SIMULATOR</span>
          <span>BUILT FOR COMPUTER ARCHITECTURE <span className="footer-dot">Â·</span> <span className="footer-online">SYSTEM ONLINE</span></span>
        </footer>
      </div>
    </main>
  )
}

export default App

