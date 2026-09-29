import { motion, useReducedMotion, useScroll, useTransform, type Variants } from 'framer-motion'
import { ArrowRight, BrainCircuit, FileText, Globe, Scissors, TableProperties } from 'lucide-react'
import { useEffect, type MouseEvent, type ReactNode } from 'react'
import { Link } from 'react-router'
import { AgoraMark } from '../components/ui/AgoraMark'
import './landing.css'

/* ------------------------------------------------------------------ */
/*  Ink illustration: Athens at noon, a man with a lamp.               */
/* ------------------------------------------------------------------ */

function InkDefs() {
  return (
    <defs>
      <filter id="ink-rough" x="-5%" y="-5%" width="110%" height="110%">
        <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="7" result="n" />
        <feDisplacementMap in="SourceGraphic" in2="n" scale="3.2" xChannelSelector="R" yChannelSelector="G" />
      </filter>
      <pattern id="hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(-38)">
        <line x1="0" y1="0" x2="0" y2="7" stroke="#171614" strokeWidth="1.6" />
      </pattern>
      <pattern id="hatch-fine" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(52)">
        <line x1="0" y1="0" x2="0" y2="5" stroke="#171614" strokeWidth="0.9" />
      </pattern>
      <pattern id="dots" width="7" height="7" patternUnits="userSpaceOnUse">
        <circle cx="3.5" cy="3.5" r="1.1" fill="#f8f7f3" opacity="0.28" />
      </pattern>
      <radialGradient id="lamp-glow">
        <stop offset="0" stopColor="#f2dc55" stopOpacity="0.95" />
        <stop offset="0.45" stopColor="#f2dc55" stopOpacity="0.45" />
        <stop offset="1" stopColor="#f2dc55" stopOpacity="0" />
      </radialGradient>
    </defs>
  )
}

function Column({ x, top = 170, bottom = 560, w = 64 }: { x: number; top?: number; bottom?: number; w?: number }) {
  const flutes = [0.2, 0.4, 0.6, 0.8].map((f) => x + w * f)
  return (
    <g>
      <rect x={x - 10} y={top - 8} width={w + 20} height={12} fill="#f8f7f3" stroke="#171614" strokeWidth="3" />
      <path d={`M${x - 4} ${top + 4} h${w + 8} v14 h${-w - 8} z`} fill="#f8f7f3" stroke="#171614" strokeWidth="3" />
      <circle cx={x - 2} cy={top + 16} r="9" fill="#f8f7f3" stroke="#171614" strokeWidth="3" />
      <circle cx={x + w + 2} cy={top + 16} r="9" fill="#f8f7f3" stroke="#171614" strokeWidth="3" />
      <circle cx={x - 2} cy={top + 16} r="3" fill="#171614" />
      <circle cx={x + w + 2} cy={top + 16} r="3" fill="#171614" />
      <rect x={x} y={top + 22} width={w} height={bottom - top - 40} fill="#f8f7f3" stroke="#171614" strokeWidth="3" />
      <rect x={x + w * 0.62} y={top + 22} width={w * 0.38} height={bottom - top - 40} fill="url(#hatch)" />
      {flutes.map((fx) => (
        <line key={fx} x1={fx} y1={top + 28} x2={fx} y2={bottom - 24} stroke="#171614" strokeWidth="1.4" />
      ))}
      <rect x={x - 8} y={bottom - 18} width={w + 16} height={10} fill="#f8f7f3" stroke="#171614" strokeWidth="3" />
      <rect x={x - 14} y={bottom - 8} width={w + 28} height={10} fill="#f8f7f3" stroke="#171614" strokeWidth="3" />
    </g>
  )
}

function Cloud({ d }: { d: string }) {
  return (
    <g>
      <path d={d} fill="#f8f7f3" stroke="#171614" strokeWidth="3.5" strokeLinejoin="round" />
    </g>
  )
}

function AthensScene() {
  const reduce = useReducedMotion()
  const { scrollY } = useScroll()
  const drift = useTransform(scrollY, [0, 800], [0, reduce ? 0 : -90])
  const drift2 = useTransform(scrollY, [0, 800], [0, reduce ? 0 : 60])
  return (
    <svg className="athens" viewBox="0 0 1200 620" preserveAspectRatio="xMidYMax slice" role="img" aria-label="Ink drawing: a hooded man carrying a lit lamp across the Athenian agora at noon, between marble columns.">
      <InkDefs />
      {/* sky */}
      <rect width="1200" height="620" fill="#171614" />
      <rect width="1200" height="620" fill="url(#dots)" />
      <g stroke="#f8f7f3" strokeWidth="1.2" opacity="0.18">
        {Array.from({ length: 30 }, (_, i) => (
          <line key={i} x1={i * 46 - 200} y1="0" x2={i * 46 + 40} y2="300" />
        ))}
      </g>
      <g filter="url(#ink-rough)">
        <motion.g style={{ x: drift }}>
          <Cloud d="M560 180c-14-50 34-86 78-66 14-46 84-60 116-16 30-34 104-20 110 34 50-6 78 40 58 76-6 12-20 18-34 18H596c-30 0-48-20-36-46z" />
          <Cloud d="M980 110c-8-34 26-58 56-44 12-30 60-36 80-6 26-10 56 10 50 40 26 4 36 34 16 48H1004c-26 0-40-18-24-38z" />
        </motion.g>
        <motion.g style={{ x: drift2 }}>
          <Cloud d="M120 120c-10-36 26-62 58-48 10-32 62-40 84-10 24-14 64 2 62 34 34 0 50 34 28 54-4 4-12 6-20 6H146c-24 0-38-16-26-36z" />
        </motion.g>

        {/* distant stoa */}
        <g>
          <rect x="360" y="420" width="840" height="14" fill="#f8f7f3" stroke="#171614" strokeWidth="3" />
          {Array.from({ length: 15 }, (_, i) => (
            <rect key={i} x={380 + i * 54} y="434" width="16" height="96" fill="#f8f7f3" stroke="#171614" strokeWidth="2.5" />
          ))}
          <path d="M360 420 L780 360 L1200 420 Z" fill="#f8f7f3" stroke="#171614" strokeWidth="3" />
          <path d="M420 412 L780 370 L1140 412 Z" fill="url(#hatch-fine)" opacity="0.55" />
        </g>

        {/* ground */}
        <path d="M0 530 C200 520 420 526 600 522 C820 518 1000 526 1200 520 V620 H0 Z" fill="#e7d9bb" stroke="#171614" strokeWidth="3.5" />
        <path d="M0 560 C300 556 600 566 1200 552 V620 H0 Z" fill="url(#hatch)" opacity="0.35" />
        {[90, 260, 480, 700, 930, 1110].map((x, i) => (
          <path key={x} d={`M${x} ${548 + (i % 2) * 22} h${38 + (i % 3) * 10}`} stroke="#171614" strokeWidth="2.5" strokeLinecap="round" />
        ))}

        {/* foreground colonnade */}
        <rect x="20" y="140" width="330" height="24" fill="#f8f7f3" stroke="#171614" strokeWidth="3.5" />
        <rect x="20" y="140" width="330" height="24" fill="url(#hatch-fine)" opacity="0.4" />
        <Column x={60} />
        <Column x={220} />

        {/* lamp glow */}
        <circle cx="650" cy="286" r="120" fill="url(#lamp-glow)" />

        {/* the man */}
        <g>
          <path d="M700 560 C704 470 716 400 730 344 C738 300 746 272 764 256 C784 244 806 250 818 266 C836 296 842 344 850 404 C860 472 866 520 878 560 Z" fill="#a8864f" stroke="#171614" strokeWidth="3.5" strokeLinejoin="round" />
          <path d="M800 262 C826 300 838 350 846 410 C856 476 862 524 876 560 L820 560 C826 480 822 380 800 262 Z" fill="url(#hatch)" opacity="0.8" />
          <path d="M728 470 C760 480 800 478 840 470 M720 520 C770 530 820 528 868 520" stroke="#171614" strokeWidth="2" fill="none" />
          <path d="M760 300 C756 380 752 460 748 556 M792 300 C796 380 800 470 806 556" stroke="#171614" strokeWidth="1.8" fill="none" />
          {/* hood */}
          <path d="M744 282 C736 238 758 204 792 204 C824 206 840 236 832 280 C822 262 806 252 788 252 C768 252 752 264 744 282 Z" fill="#a8864f" stroke="#171614" strokeWidth="3.5" strokeLinejoin="round" />
          <path d="M756 276 C760 258 774 250 790 250 C808 250 820 260 824 276 C816 290 800 296 788 296 C772 296 762 290 756 276 Z" fill="#171614" />
          <path d="M796 208 C818 214 832 240 830 270" stroke="#171614" strokeWidth="1.5" fill="url(#hatch-fine)" opacity="0.7" />
          {/* arm and staff */}
          <path d="M744 330 C724 330 704 322 690 306 L680 316 C694 336 716 350 746 352 Z" fill="#a8864f" stroke="#171614" strokeWidth="3" strokeLinejoin="round" />
          <circle cx="684" cy="310" r="8" fill="#e7d9bb" stroke="#171614" strokeWidth="2.5" />
          <line x1="676" y1="236" x2="706" y2="560" stroke="#171614" strokeWidth="5" strokeLinecap="round" />
          {/* lamp */}
          <path d="M676 236 C664 236 656 244 652 252" stroke="#171614" strokeWidth="3" fill="none" />
          <path d="M634 256 h36 l-6 12 h-24 z" fill="#171614" />
          <rect x="632" y="268" width="40" height="38" fill="#f2dc55" stroke="#171614" strokeWidth="3" />
          <line x1="652" y1="268" x2="652" y2="306" stroke="#171614" strokeWidth="2" />
          <path d="M646 296 C644 286 652 280 652 274 C656 282 660 286 658 296 Z" fill="#8e1f1a" />
          <path d="M630 306 h44 l-6 10 h-32 z" fill="#171614" />
        </g>

        {/* light rays */}
        <g stroke="#171614" strokeWidth="2" strokeLinecap="round">
          {[-150, -115, -75, -40, 200, 160, 120].map((a) => {
            const r1 = 34
            const r2 = 56
            const rad = (a * Math.PI) / 180
            return <line key={a} x1={652 + Math.cos(rad) * r1} y1={287 + Math.sin(rad) * r1} x2={652 + Math.cos(rad) * r2} y2={287 + Math.sin(rad) * r2} />
          })}
        </g>
      </g>
    </svg>
  )
}

/* ------------------------------------------------------------------ */

const panelIn: Variants = {
  hidden: { opacity: 0, y: 46, rotate: -1.2 },
  shown: { opacity: 1, y: 0, rotate: 0, transition: { type: 'spring', stiffness: 110, damping: 18 } },
}

function Panel({ children, className = '', delay = 0, label }: { children: ReactNode; className?: string; delay?: number; label?: string }) {
  const reduce = useReducedMotion()
  return (
    <motion.section
      className={`lp-panel ${className}`}
      aria-label={label}
      variants={panelIn}
      initial={reduce ? false : 'hidden'}
      whileInView="shown"
      viewport={{ once: true, amount: 0.2 }}
      transition={{ delay }}
    >
      {children}
    </motion.section>
  )
}

function Sfx({ children, className = '' }: { children: ReactNode; className?: string }) {
  const reduce = useReducedMotion()
  return (
    <motion.span
      className={`sfx ${className}`}
      aria-hidden
      initial={reduce ? false : { scale: 0.2, rotate: -30, opacity: 0 }}
      whileInView={{ scale: 1, rotate: -8, opacity: 1 }}
      viewport={{ once: true, amount: 0.8 }}
      transition={{ type: 'spring', stiffness: 380, damping: 12, delay: 0.25 }}
    >
      {children}
    </motion.span>
  )
}

function Cap({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <p className={`caption lp-cap ${className}`}>{children}</p>
}

/* ------------------------------------------------------------------ */

/** In-page jumps; plain #hash links would be read as routes under the hash router used on GitHub Pages. */
const jump = (id: string) => (e: MouseEvent) => {
  e.preventDefault()
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

export function Landing() {
  useEffect(() => {
    document.title = 'Agora — Research & Debate'
  }, [])

  return (
    <div className="landing">
      <header className="lp-nav">
        <nav className="lp-nav-box" aria-label="Site">
          <a href="#research" onClick={jump('research')} className="lp-nav-link">Research</a>
          <Link to="/app" className="lp-nav-mark" aria-label="Agora — open the app">
            <AgoraMark size={46} />
            <span>Agora</span>
          </Link>
          <a href="#round" onClick={jump('round')} className="lp-nav-link">Debate</a>
        </nav>
        <Link to="/app" className="btn primary lp-nav-cta">Enter <ArrowRight /></Link>
      </header>

      <main className="lp-book">
        {/* 1 — Athens */}
        <Panel className="lp-hero" label="Athens, fourth century BC">
          <AthensScene />
          <Cap className="lp-cap-tl">Athens, the fourth century <span className="spot">BC</span>.<br />Noon in the agora — the marketplace, the court, the place where arguments happen.</Cap>
          <figure className="caption lp-cap lp-quote">
            <blockquote>He lit a lamp in broad daylight and said, as he went about, “I am looking for a <mark className="ox">man</mark>.”</blockquote>
            <figcaption>Diogenes Laërtius, <em>Lives of Eminent Philosophers</em> VI.41, on Diogenes of Sinope · trans. R. D. Hicks</figcaption>
          </figure>
        </Panel>

        <div className="lp-title-row">
          <Panel className="lp-title" delay={0.05} label="Agora">
            <h1 className="lp-wordmark">Agora</h1>
            <p className="lp-tag">A research browser and speech-doc studio for <span className="ox-box">debaters</span> and philosophy students.</p>
            <div className="lp-ctas">
              <Link to="/app" className="btn primary lg">Enter the Agora <ArrowRight /></Link>
              <a href="#research" onClick={jump('research')} className="btn lg">Read the comic</a>
            </div>
          </Panel>
          <Panel className="lp-later" delay={0.12} label="Twenty-four centuries later">
            <Cap>Twenty-four centuries later, the marketplace never <span className="spot">closes</span>.</Cap>
            <div className="tab-pile" aria-hidden>
              {['Wikipedia', 'OpenAlex', 'Open Library', 'Your file', 'Speech doc', 'Flow'].map((t, i) => (
                <span key={t} style={{ ['--i' as string]: i }}>{t}</span>
              ))}
            </div>
            <Cap className="lp-cap-sm">Forty tabs. Three documents. One timer on somebody’s phone. The evidence you needed is always in the tab you closed.</Cap>
          </Panel>
        </div>

        {/* 2 — Research */}
        <div className="lp-chapter" id="research">
          <span className="lp-chapter-no">I.</span>
          <h2 className="lp-chapter-title">Find it. <span>Cut it.</span></h2>
        </div>

        <div className="lp-grid two">
          <Panel label="Find it: the research browser">
            <Cap className="lp-cap-top">Search encyclopedias, <span className="spot">papers</span> and books in one browser.</Cap>
            <div className="mock-browser">
              <div className="mb-tabs"><span className="on"><Globe size={11} /> Civil disobedience</span><span><Globe size={11} /> Harm principle</span><span>+</span></div>
              <div className="mb-address"><Globe size={12} /> agora:search?q=civil disobedience</div>
              <div className="mb-results">
                <div className="mb-group"><b>Encyclopedia</b><span>Civil disobedience</span><span>Letter from Birmingham Jail</span></div>
                <div className="mb-group"><b>Papers</b><span>The justification of civil disobedience</span><span>Democratic legitimacy and dissent</span></div>
                <div className="mb-group"><b>Books</b><span>On Liberty — Mill</span><span>A Theory of Justice — Rawls</span></div>
              </div>
            </div>
            <Cap className="lp-cap-sm">Wikipedia, OpenAlex and Open Library, read inside the app. Any other site opens beside it, and you can still clip from it.</Cap>
          </Panel>

          <Panel delay={0.1} className="lp-cut" label="Cut it: evidence with the citation attached">
            <Cap className="lp-cap-top">Select a line. Write a tag. <span className="spot">Snip.</span></Cap>
            <div className="cut-demo">
              <p className="cd-source serif">
                The object of this Essay is to assert one very simple principle… <span className="cd-sel">That the only purpose for which power can be rightfully exercised over any member of a civilised community, against his will, is to prevent harm to others.</span>
              </p>
              <div className="cd-snipline" aria-hidden>
                <Scissors className="cd-scissors" />
                <Sfx className="sfx-snip">Snip!</Sfx>
              </div>
              <div className="cd-card">
                <div className="cd-tag">Only harm to others justifies coercion — paternalism fails.</div>
                <div className="cd-cite"><b>Mill 59</b> — John Stuart Mill, <em>On Liberty</em>, 1859, ch. 1</div>
                <p className="cd-body"><u>the only purpose for which power can be <mark>rightfully exercised</mark></u> over any member of a civilised community, against his will, <u>is to <mark>prevent harm to others</mark></u>.</p>
              </div>
            </div>
            <Cap className="lp-cap-sm">Author, date, title and URL are filled in for you. The card goes straight into the doc you’re cutting into.</Cap>
          </Panel>
        </div>

        {/* 3 — Docs */}
        <div className="lp-chapter">
          <span className="lp-chapter-no">II.</span>
          <h2 className="lp-chapter-title">File it. <span>Read it.</span></h2>
        </div>

        <div className="lp-grid wide-left">
          <Panel className="lp-doc" label="Speech docs">
            <div className="doc-mock">
              <div className="dm-ribbon">
                {[['Pocket', 'F4'], ['Hat', 'F5'], ['Block', 'F6'], ['Tag', 'F7'], ['Cite', 'F8'], ['Underline', 'F9'], ['Emphasis', 'F10'], ['Highlight', 'F11']].map(([l, k]) => (
                  <span key={l}><b>{l}</b><small>{k}</small></span>
                ))}
              </div>
              <div className="dm-sheet">
                <div className="dm-h1">1AC</div>
                <div className="dm-h2">Framework</div>
                <div className="dm-h3">Value: Justice</div>
                <div className="dm-h4">Justice is the measure institutions answer to — laws included.</div>
                <p className="dm-cite"><b>Rawls 71</b> — John Rawls, <em>A Theory of Justice</em>, 1971, §1</p>
                <p className="dm-card"><u><mark>Justice is the first virtue of social institutions</mark></u>, as truth is of systems of thought.</p>
              </div>
            </div>
          </Panel>
          <Panel delay={0.1} className="lp-doc-caps" label="How speech docs work">
            <Cap>Pockets, hats, blocks and tags — the way debaters already <span className="spot">organize</span>.</Cap>
            <Cap className="lp-cap-sm">Function keys work as they do in Verbatim. Read time counts only what you highlighted. Send a block to your speech in one click.</Cap>
            <Cap className="lp-cap-sm">Copy the doc into Word or Google Docs with its formatting intact.</Cap>
            <Link to="/app/docs" className="btn"><FileText /> Open Speech Docs</Link>
          </Panel>
        </div>

        {/* 4 — The round */}
        <div className="lp-chapter" id="round">
          <span className="lp-chapter-no">III.</span>
          <h2 className="lp-chapter-title">The round.</h2>
        </div>

        <div className="lp-grid wide-right">
          <Panel className="lp-timer" label="Round timer">
            <div className="tm-face">
              <span className="tm-speech"><i>Aff</i> 1AR</span>
              <span className="tm-digits">3:47</span>
              <Sfx className="sfx-tick">Tick</Sfx>
            </div>
            <div className="tm-prep"><span className="aff">Aff prep <b>2:10</b></span><span className="neg">Neg prep <b>4:00</b></span></div>
            <Cap className="lp-cap-sm">Speech and prep clocks for Policy, LD and PF. They keep running while you work in other apps.</Cap>
          </Panel>
          <Panel delay={0.1} className="lp-flow" label="Flow">
            <div className="flow-mock">
              {[
                ['AC', 'aff', ['V: Justice', 'C1: Dissent keeps law answerable', 'C2: Rights precede statute']],
                ['NC', 'neg', ['V: Order', 'Rule of law collapses', 'Turn: C1 invites vigilantism']],
                ['1AR', 'aff', ['Extend C1 — dropped', 'No link: civil = public + nonviolent', 'Turn outweighs']],
                ['NR', 'neg', ['Collapse to order', '', 'Vigilantism > dissent']],
              ].map(([label, side, cells]) => (
                <div key={label as string} className={`fm-col ${side}`}>
                  <b>{label}</b>
                  {(cells as string[]).map((c, i) => (
                    <span key={i} className={c.includes('dropped') ? 'extend' : label === 'NR' && !c ? 'dropped' : ''}>{c}</span>
                  ))}
                </div>
              ))}
            </div>
            <Cap className="lp-cap-sm">Flow in aff and neg ink. Mark what was dropped and what was extended. Pull your tags from a speech doc onto the flow.</Cap>
          </Panel>
        </div>

        {/* 5 — The question */}
        <div className="lp-chapter">
          <span className="lp-chapter-no">IV.</span>
          <h2 className="lp-chapter-title">The question.</h2>
        </div>

        <Panel className="lp-socratic" label="Socratic Coach">
          <div className="soc-scene">
            <p className="soc-you caption">You: “Civil disobedience is justified whenever a law is unjust.”</p>
            <p className="soc-balloon">Who decides that a law is unjust — and would you accept the same test from someone who <span className="spot">disagrees</span> with you?</p>
            <span className="soc-label mono">Socratic Coach · example exchange</span>
          </div>
          <Cap className="lp-cap-sm">The coach asks before it tells. It finds your hidden premises and flags jumps from facts to values, but it never tells you who won.</Cap>
        </Panel>

        {/* 6 — Enter */}
        <Panel className="lp-enter" label="Enter the Agora">
          <AgoraMark size={96} className="lp-enter-mark" />
          <h2 className="lp-enter-title">Enter the<br /><span>Agora.</span></h2>
          <ul className="lp-facts">
            <li><Globe /> Research browser with automatic citations</li>
            <li><FileText /> Verbatim-style speech docs</li>
            <li><TableProperties /> Flows and timers for Policy, LD and PF</li>
            <li><BrainCircuit /> A Socratic coach, plus a library of verified texts</li>
          </ul>
          <Link to="/app" className="btn lg lp-enter-btn">Open the app <ArrowRight /></Link>
          <p className="lp-fine">Free. No account. Your docs, flows and sources stay in this browser.</p>
        </Panel>
      </main>

      <footer className="lp-foot">
        <span className="lp-foot-brand"><AgoraMark size={20} /> Agora</span>
        <span>Quotations come from verified translations and are cited. Summaries and interpretations are labelled as such.</span>
      </footer>
    </div>
  )
}
