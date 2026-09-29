/** A small RFC 4180 CSV parser: quoted fields, escaped quotes, embedded newlines and tabs. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else quoted = false
      } else field += c
      continue
    }
    if (c === '"') quoted = true
    else if (c === ',') {
      row.push(field)
      field = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else field += c
  }
  if (field !== '' || row.length) {
    row.push(field)
    rows.push(row)
  }
  return rows.filter((r) => r.some((f) => f.trim() !== ''))
}

/** Rows as objects keyed by header; header whitespace (Tabroom pads with tabs) collapses to single spaces. */
export function parseTable(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const [head = [], ...body] = parseCsv(text.replace(/^﻿/, ''))
  const headers = head.map((h) => h.replace(/\s+/g, ' ').trim())
  return { headers, rows: body.map((r) => Object.fromEntries(headers.map((h, i) => [h, (r[i] ?? '').trim()]))) }
}
