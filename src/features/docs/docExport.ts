import type { DocJSON } from '../../model/types'

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/**
 * Render a doc as HTML with inline styles so it pastes into Word or Google Docs
 * with Verbatim-like formatting intact.
 */
function inline(n: DocJSON, inCard: boolean): string {
  if (n.type === 'hardBreak') return '<br>'
  if (n.type !== 'text') return (n.content ?? []).map((c) => inline(c, inCard)).join('')
  let t = esc(n.text ?? '')
  const marks = (n.marks ?? []).map((m) => m.type)
  const size = inCard ? (marks.includes('underline') || marks.includes('emphasis') ? '11pt' : '8pt') : undefined
  const styles: string[] = []
  if (size) styles.push(`font-size:${size}`)
  if (marks.includes('bold')) t = `<b>${t}</b>`
  if (marks.includes('italic')) t = `<i>${t}</i>`
  if (marks.includes('underline') || marks.includes('emphasis')) t = `<u>${t}</u>`
  if (marks.includes('emphasis')) {
    t = `<b>${t}</b>`
    styles.push('border:1px solid #000')
  }
  const hl = n.marks?.find((m) => m.type === 'highlight')
  if (hl) styles.push(`background:${String(hl.attrs?.color ?? '#f2dc55')}`)
  return styles.length ? `<span style="${styles.join(';')}">${t}</span>` : t
}

export function docToHtml(doc: DocJSON, title: string): string {
  const body = (doc.content ?? [])
    .map((n) => {
      if (n.type === 'heading') {
        const level = Number(n.attrs?.level ?? 1)
        const style = level === 1 ? 'font-size:26pt;border:2px solid #000;padding:4px' : level === 2 ? 'font-size:22pt;text-decoration:underline double' : level === 3 ? 'font-size:16pt;text-decoration:underline' : 'font-size:13pt'
        return `<h${level} style="font-family:Calibri,Arial,sans-serif;font-weight:bold;${style}">${inline(n, false)}</h${level}>`
      }
      if (n.type === 'paragraph') {
        const role = n.attrs?.role
        if (role === 'cite') return `<p style="font-family:Calibri,Arial,sans-serif;font-size:8pt">${inline(n, false).replace(/<b>/, '<b style="font-size:13pt">')}</p>`
        return `<p style="font-family:Calibri,Arial,sans-serif;font-size:${role === 'card' ? '8pt' : '11pt'}">${inline(n, role === 'card')}</p>`
      }
      if (n.type === 'bulletList' || n.type === 'orderedList') {
        const tag = n.type === 'bulletList' ? 'ul' : 'ol'
        return `<${tag}>${(n.content ?? []).map((li) => `<li>${inline(li, false)}</li>`).join('')}</${tag}>`
      }
      if (n.type === 'blockquote') return `<blockquote>${inline(n, false)}</blockquote>`
      return inline(n, false)
    })
    .join('\n')
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title></head><body>${body}</body></html>`
}

export async function copyRich(html: string, plain: string) {
  if ('ClipboardItem' in window) {
    await navigator.clipboard.write([new ClipboardItem({ 'text/html': new Blob([html], { type: 'text/html' }), 'text/plain': new Blob([plain], { type: 'text/plain' }) })])
  } else {
    await navigator.clipboard.writeText(plain)
  }
}

export function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
