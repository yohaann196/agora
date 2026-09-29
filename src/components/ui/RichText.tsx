import { Fragment, type ReactNode } from 'react'
import { EntityLink } from './EntityLink'

/**
 * Minimal markup renderer for AI output and notes:
 * paragraphs, **bold**, *italic*, "- " bullets, "> " quotations, and [[entity-id]] links.
 */
export function RichText({ text, className = '' }: { text: string; className?: string }) {
  const blocks = text.replace(/\r/g, '').split(/\n{2,}/)
  return (
    <div className={`rich ${className}`}>
      {blocks.map((block, i) => {
        const lines = block.split('\n')
        if (lines.every((l) => l.startsWith('> '))) {
          return (
            <blockquote key={i}>
              {lines.map((l, j) => (
                <p key={j}>{inline(l.slice(2))}</p>
              ))}
            </blockquote>
          )
        }
        if (lines.some((l) => l.startsWith('- '))) {
          const head = lines.filter((l) => !l.startsWith('- '))
          return (
            <Fragment key={i}>
              {head.length > 0 && <p>{inline(head.join(' '))}</p>}
              <ul>
                {lines
                  .filter((l) => l.startsWith('- '))
                  .map((l, j) => (
                    <li key={j}>{inline(l.slice(2))}</li>
                  ))}
              </ul>
            </Fragment>
          )
        }
        return (
          <p key={i}>
            {lines.map((l, j) => (
              <Fragment key={j}>
                {j > 0 && <br />}
                {inline(l)}
              </Fragment>
            ))}
          </p>
        )
      })}
    </div>
  )
}

const TOKEN = /(\[\[[a-z0-9-]+\]\]|\*\*[^*]+\*\*|\*[^*\s][^*]*\*)/g

export function inline(s: string): ReactNode[] {
  const out: ReactNode[] = []
  let last = 0
  let m: RegExpExecArray | null
  let k = 0
  TOKEN.lastIndex = 0
  while ((m = TOKEN.exec(s))) {
    if (m.index > last) out.push(s.slice(last, m.index))
    const t = m[0]
    if (t.startsWith('[[')) out.push(<EntityLink key={k++} id={t.slice(2, -2)} />)
    else if (t.startsWith('**')) out.push(<strong key={k++}>{inline(t.slice(2, -2))}</strong>)
    else out.push(<em key={k++}>{inline(t.slice(1, -1))}</em>)
    last = m.index + t.length
  }
  if (last < s.length) out.push(s.slice(last))
  return out
}
