import { ArrowDown, ArrowUp, Download, Eye, EyeOff, Keyboard, KeyRound, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { PageHeader } from '../../components/ui/primitives'
import { appForCard } from '../../lib/apps'
import { useOS, type Accent } from '../../store'
import './workspace.css'

const ACCENTS: Accent[] = ['blue', 'violet', 'cyan', 'green', 'orange']

export function SettingsPage() {
  const settings = useOS((s) => s.settings)
  const { updateSettings, resetWorkspace, setShortcuts, toast } = useOS.getState()
  const [showKey, setShowKey] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)

  const move = (i: number, d: -1 | 1) => {
    const cards = [...settings.homeCards]
    const j = i + d
    if (j < 0 || j >= cards.length) return
    ;[cards[i], cards[j]] = [cards[j], cards[i]]
    updateSettings({ homeCards: cards })
  }

  const exportData = () => {
    const s = useOS.getState()
    const data = { arguments: s.arguments, essays: s.essays, notes: s.notes, debates: s.debates, reading: s.reading, saved: s.saved, ideaNodes: s.ideaNodes, ideaEdges: s.ideaEdges }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'philosophyos-workspace.json'
    a.click()
    URL.revokeObjectURL(a.href)
    toast({ title: 'Workspace exported', tone: 'success' })
  }

  return (
    <div className="page settings">
      <PageHeader eyebrow="Workspace · Settings" title="Settings" lede="Make the workspace yours. Everything is stored locally in this browser." />

      <section className="set-sec">
        <div className="set-label"><h3>Profile</h3><p>How PhilosophyOS greets you.</p></div>
        <div className="set-body">
          <div className="field" style={{ maxWidth: 320 }}>
            <label htmlFor="name">Display name</label>
            <input id="name" className="input" value={settings.name} onChange={(e) => updateSettings({ name: e.target.value || 'Yohaan' })} />
          </div>
        </div>
      </section>

      <section className="set-sec">
        <div className="set-label"><h3>Appearance</h3><p>Accent, density and motion.</p></div>
        <div className="set-body">
          <div className="field">
            <label>Accent</label>
            <div className="swatches" role="radiogroup" aria-label="Accent colour">
              {ACCENTS.map((a) => (
                <button key={a} role="radio" aria-checked={settings.accent === a} aria-label={a} className={`swatch ${settings.accent === a ? 'on' : ''}`} style={{ ['--sw' as string]: `var(--${a})` }} onClick={() => updateSettings({ accent: a })} />
              ))}
            </div>
          </div>
          <div className="field">
            <label>Density</label>
            <div className="seg" role="group">
              {(['comfortable', 'compact'] as const).map((d) => (
                <button key={d} aria-pressed={settings.density === d} onClick={() => updateSettings({ density: d })}>{d}</button>
              ))}
            </div>
          </div>
          <label className="toggle">
            <input type="checkbox" checked={settings.reduceMotion} onChange={(e) => updateSettings({ reduceMotion: e.target.checked })} />
            <span className="track"><span /></span>
            Reduce motion
          </label>
        </div>
      </section>

      <section className="set-sec">
        <div className="set-label"><h3>Home workspace</h3><p>Reorder or hide the application cards on Home.</p></div>
        <div className="set-body">
          <div className="card-order">
            {settings.homeCards.map((c, i) => {
              const app = appForCard(c)
              const hidden = settings.hiddenCards.includes(c)
              const I = app.icon
              return (
                <div key={c} className={`order-row ${hidden ? 'hidden' : ''}`}>
                  <span className="mono dim" style={{ width: 22 }}>{String(i + 1).padStart(2, '0')}</span>
                  <I size={14} style={{ color: app.accent }} />
                  <span className="t0" style={{ flex: 1 }}>{app.label}</span>
                  <button className="btn icon sm ghost" aria-label="Move up" onClick={() => move(i, -1)} disabled={i === 0}><ArrowUp /></button>
                  <button className="btn icon sm ghost" aria-label="Move down" onClick={() => move(i, 1)} disabled={i === settings.homeCards.length - 1}><ArrowDown /></button>
                  <button className="btn icon sm ghost" aria-label={hidden ? 'Show' : 'Hide'} onClick={() => updateSettings({ hiddenCards: hidden ? settings.hiddenCards.filter((x) => x !== c) : [...settings.hiddenCards, c] })}>
                    {hidden ? <EyeOff /> : <Eye />}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section className="set-sec">
        <div className="set-label"><h3>Reasoning engine</h3><p>Where AI responses come from.</p></div>
        <div className="set-body">
          <div className="engine-options">
            <button className={`engine-opt ${settings.aiProvider === 'local' ? 'on' : ''}`} onClick={() => updateSettings({ aiProvider: 'local' })} aria-pressed={settings.aiProvider === 'local'}>
              <span className="t0">Local reasoning engine</span>
              <span className="dim">Runs entirely in your browser. Rule-based analysis grounded in the PhilosophyOS knowledge base. No network, no account.</span>
            </button>
            <button className={`engine-opt ${settings.aiProvider === 'anthropic' ? 'on' : ''}`} onClick={() => updateSettings({ aiProvider: 'anthropic' })} aria-pressed={settings.aiProvider === 'anthropic'}>
              <span className="t0">Claude</span>
              <span className="dim">Socratic AI calls Claude directly from your browser using your own API key. Falls back to the local engine on any error.</span>
            </button>
          </div>
          {settings.aiProvider === 'anthropic' && (
            <div className="field" style={{ maxWidth: 460 }}>
              <label htmlFor="key"><KeyRound size={11} style={{ display: 'inline', verticalAlign: -1 }} /> Anthropic API key</label>
              <div className="hstack">
                <input id="key" className="input mono" type={showKey ? 'text' : 'password'} value={settings.apiKey} onChange={(e) => updateSettings({ apiKey: e.target.value })} placeholder="sk-ant-…" autoComplete="off" />
                <button className="btn icon" aria-label={showKey ? 'Hide key' : 'Show key'} onClick={() => setShowKey((s) => !s)}>{showKey ? <EyeOff /> : <Eye />}</button>
              </div>
              <p className="dim" style={{ fontSize: 'var(--fs-11)', lineHeight: 1.5 }}>Stored only in this browser’s local storage and sent only to api.anthropic.com. Anyone with access to this browser profile can read it — use a key you can revoke.</p>
            </div>
          )}
          <p className="principle-line">Whatever the engine, PhilosophyOS is built on one principle: <em>AI should amplify philosophical thinking, not replace it.</em></p>
        </div>
      </section>

      <section className="set-sec">
        <div className="set-label"><h3>Keyboard</h3><p>PhilosophyOS is fully keyboard-driven.</p></div>
        <div className="set-body">
          <button className="btn" style={{ justifySelf: 'start' }} onClick={() => setShortcuts(true)}><Keyboard /> View shortcuts <span className="kbd">?</span></button>
        </div>
      </section>

      <section className="set-sec">
        <div className="set-label"><h3>Data</h3><p>Export or reset your workspace.</p></div>
        <div className="set-body">
          <div className="hstack">
            <button className="btn" onClick={exportData}><Download /> Export as JSON</button>
            {confirmReset ? (
              <>
                <button className="btn danger" onClick={() => { resetWorkspace(); setConfirmReset(false); toast({ title: 'Workspace reset to defaults' }) }}>Confirm reset</button>
                <button className="btn ghost" onClick={() => setConfirmReset(false)}>Cancel</button>
              </>
            ) : (
              <button className="btn ghost" onClick={() => setConfirmReset(true)}><RotateCcw /> Reset workspace</button>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
