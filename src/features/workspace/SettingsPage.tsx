import { Download, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { PageHeader } from '../../components/ui/primitives'
import { useOS } from '../../store'
import { download } from '../docs/docExport'
import './workspace.css'

const SOURCES = [
  ['wikipedia', 'Wikipedia', 'Encyclopedia articles, read inside Debate Utils'],
  ['openalex', 'OpenAlex', 'Scholarly papers and abstracts'],
  ['openlibrary', 'Open Library', 'Books and editions'],
  ['agora', 'Framework library', 'Verified public-domain philosophy passages; works offline'],
] as const

export function SettingsPage() {
  const settings = useOS((s) => s.settings)
  const { updateSettings, resetWorkspace, toast } = useOS.getState()
  const [confirmReset, setConfirmReset] = useState(false)

  const exportData = () => {
    const s = useOS.getState()
    const data = { exportedAt: new Date().toISOString(), docs: s.docs, flows: s.flows, sources: s.sources, following: s.following }
    download('debate-utils-workspace.json', JSON.stringify(data, null, 2), 'application/json')
    toast({ title: 'Workspace exported', tone: 'success' })
  }

  return (
    <div className="page settings">
      <PageHeader eyebrow="You" title="Settings" lede="Everything you make in Debate Utils is saved in this browser, on this device." />

      <section className="set-sec">
        <div className="set-label"><h3>Profile</h3><p>Used to greet you on the dashboard.</p></div>
        <div className="set-body">
          <div className="field" style={{ maxWidth: 320 }}>
            <label htmlFor="name">Your name</label>
            <input id="name" className="input" value={settings.name} placeholder="e.g. Jordan" onChange={(e) => updateSettings({ name: e.target.value })} />
          </div>
        </div>
      </section>

      <section className="set-sec">
        <div className="set-label"><h3>Evidence sources</h3><p>Where Evidence searches. Each is a free, open API called straight from your browser.</p></div>
        <div className="set-body">
          <div className="research-toggles">
            {SOURCES.map(([k, label, hint]) => (
              <label key={k} className="research-toggle">
                <input type="checkbox" checked={settings.research[k]} onChange={(e) => updateSettings({ research: { ...settings.research, [k]: e.target.checked } })} />
                <span><b>{label}</b><small>{hint}</small></span>
              </label>
            ))}
          </div>
          <div className="field" style={{ maxWidth: 380 }}>
            <label htmlFor="contact">Contact email for OpenAlex (optional)</label>
            <input id="contact" className="input" type="email" placeholder="you@school.edu" value={settings.research.contactEmail} onChange={(e) => updateSettings({ research: { ...settings.research, contactEmail: e.target.value.trim() } })} />
            <span className="dim" style={{ fontSize: 'var(--fs-11)' }}>OpenAlex answers faster when requests include an email. It’s sent only to OpenAlex.</span>
          </div>
        </div>
      </section>

      <section className="set-sec">
        <div className="set-label"><h3>Motion</h3><p>Reduce animation across Debate Utils.</p></div>
        <div className="set-body">
          <label className="research-toggle" style={{ maxWidth: 360 }}>
            <input type="checkbox" checked={settings.reduceMotion} onChange={(e) => updateSettings({ reduceMotion: e.target.checked })} />
            <span><b>Reduce motion</b><small>Also follows your system setting.</small></span>
          </label>
        </div>
      </section>

      <section className="set-sec">
        <div className="set-label"><h3>Your data</h3><p>Export a backup, or start again from the sample vaults.</p></div>
        <div className="set-body hstack" style={{ flexWrap: 'wrap' }}>
          <button className="btn" onClick={exportData}><Download /> Export workspace (.json)</button>
          {confirmReset ? (
            <>
              <span className="dim">This deletes your docs, flows and sources.</span>
              <button className="btn danger" onClick={() => { resetWorkspace(); setConfirmReset(false); toast({ title: 'Workspace reset' }) }}>Reset everything</button>
              <button className="btn ghost" onClick={() => setConfirmReset(false)}>Cancel</button>
            </>
          ) : (
            <button className="btn ghost danger" onClick={() => setConfirmReset(true)}><RotateCcw /> Reset workspace</button>
          )}
        </div>
      </section>
    </div>
  )
}
