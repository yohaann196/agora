import type { ArgLink, ArgLinkKind, ArgNode, ArgNodeType, Argument } from '../../model/types'

export const NODE_META: Record<ArgNodeType, { label: string; prefix: string; color: string; hint: string }> = {
  claim: { label: 'Claim', prefix: 'C', color: 'var(--n-claim)', hint: 'The position the argument sets out to defend.' },
  premise: { label: 'Premise', prefix: 'P', color: 'var(--n-premise)', hint: 'A reason offered in support.' },
  inference: { label: 'Inference', prefix: 'I', color: 'var(--n-inference)', hint: 'The step that connects premises to the conclusion.' },
  conclusion: { label: 'Conclusion', prefix: '∴', color: 'var(--n-conclusion)', hint: 'What follows if the premises are true.' },
  objection: { label: 'Objection', prefix: 'O', color: 'var(--n-objection)', hint: 'A reason to doubt a step.' },
  counter: { label: 'Counterargument', prefix: 'CA', color: 'var(--n-counter)', hint: 'An argument for a rival conclusion.' },
  rebuttal: { label: 'Rebuttal', prefix: 'R', color: 'var(--n-rebuttal)', hint: 'A response to an objection or counterargument.' },
  evidence: { label: 'Evidence', prefix: 'E', color: 'var(--n-evidence)', hint: 'Textual, empirical or testimonial support.' },
  definition: { label: 'Definition', prefix: 'D', color: 'var(--n-definition)', hint: 'Fixes the meaning of a key term.' },
  assumption: { label: 'Assumption', prefix: 'A', color: 'var(--n-assumption)', hint: 'Something the argument takes for granted.' },
}

export const LINK_META: Record<ArgLinkKind, { label: string; color: string; dashed?: boolean }> = {
  supports: { label: 'supports', color: 'var(--n-premise)' },
  infers: { label: 'therefore', color: 'var(--n-conclusion)' },
  challenges: { label: 'challenges', color: 'var(--n-objection)', dashed: true },
  rebuts: { label: 'rebuts', color: 'var(--n-rebuttal)', dashed: true },
  defines: { label: 'defines', color: 'var(--n-definition)', dashed: true },
  grounds: { label: 'grounds', color: 'var(--n-evidence)', dashed: true },
  assumes: { label: 'assumed by', color: 'var(--n-assumption)', dashed: true },
}

export const NODE_W = 280
export const ATTACH_X = 360

export function linkKindFor(type: ArgNodeType): ArgLinkKind {
  switch (type) {
    case 'objection':
    case 'counter':
      return 'challenges'
    case 'rebuttal':
      return 'rebuts'
    case 'definition':
      return 'defines'
    case 'assumption':
      return 'assumes'
    case 'evidence':
      return 'grounds'
    case 'conclusion':
    case 'inference':
      return 'infers'
    default:
      return 'supports'
  }
}

/** Core nodes in reading order: follow the chain from nodes with no incoming core link. */
export function coreOrder(arg: Argument): ArgNode[] {
  const core = arg.nodes.filter((n) => !n.target)
  const ids = new Set(core.map((n) => n.id))
  const coreLinks = arg.links.filter((l) => ids.has(l.from) && ids.has(l.to))
  const incoming = new Map<string, number>()
  for (const l of coreLinks) incoming.set(l.to, (incoming.get(l.to) ?? 0) + 1)
  const order: ArgNode[] = []
  const seen = new Set<string>()
  const byY = [...core].sort((a, b) => a.y - b.y)
  const queue = byY.filter((n) => !incoming.get(n.id))
  while (queue.length) {
    const n = queue.shift()!
    if (seen.has(n.id)) continue
    seen.add(n.id)
    order.push(n)
    const next = coreLinks
      .filter((l) => l.from === n.id)
      .map((l) => core.find((c) => c.id === l.to)!)
      .filter(Boolean)
      .sort((a, b) => a.y - b.y)
    for (const m of next) {
      incoming.set(m.id, (incoming.get(m.id) ?? 1) - 1)
      if ((incoming.get(m.id) ?? 0) <= 0) queue.push(m)
    }
  }
  for (const n of byY) if (!seen.has(n.id)) order.push(n)
  return order
}

export function nodeLabel(arg: Argument, node: ArgNode): string {
  const meta = NODE_META[node.type]
  if (node.type === 'premise') {
    const ps = coreOrder(arg).filter((n) => n.type === 'premise')
    return `P${ps.indexOf(node) + 1}`
  }
  const same = arg.nodes.filter((n) => n.type === node.type)
  return same.length > 1 ? `${meta.prefix}${same.indexOf(node) + 1}` : meta.prefix
}

/** Auto-layout: core chain down the left, attachments stacked to the right of their targets. */
export function tidy(arg: Argument, heights: Record<string, number>): Record<string, { x: number; y: number }> {
  const pos: Record<string, { x: number; y: number }> = {}
  const order = coreOrder(arg)
  let y = 40
  const GAP = 72
  const col = (depth: number) => 80 + depth * ATTACH_X
  const placeAttachments = (targetId: string, depth: number, startY: number): number => {
    let yy = startY
    for (const a of arg.nodes.filter((n) => n.target === targetId)) {
      pos[a.id] = { x: col(depth), y: yy }
      const h = heights[a.id] ?? 110
      const below = placeAttachments(a.id, depth + 1, yy)
      yy = Math.max(yy + h + 24, below)
    }
    return yy
  }
  for (const n of order) {
    pos[n.id] = { x: col(0), y }
    const h = heights[n.id] ?? 110
    const attachEnd = placeAttachments(n.id, 1, y)
    y = Math.max(y + h + GAP, attachEnd + 20)
  }
  return pos
}

export function standardForm(arg: Argument): string {
  const lines: string[] = [arg.title, '']
  const order = coreOrder(arg)
  for (const n of order) {
    const lab = nodeLabel(arg, n)
    lines.push(`${lab.padEnd(3)} ${n.text || '[empty]'}`)
    for (const a of arg.nodes.filter((x) => x.target === n.id)) {
      lines.push(`      ${NODE_META[a.type].label}: ${a.text}`)
      for (const r of arg.nodes.filter((x) => x.target === a.id)) lines.push(`        ${NODE_META[r.type].label}: ${r.text}`)
    }
  }
  return lines.join('\n')
}

export function insertCore(arg: Argument, type: ArgNodeType): { nodes: ArgNode[]; links: ArgLink[]; newId: string } {
  const order = coreOrder(arg)
  const newId = `n-${Math.random().toString(36).slice(2, 8)}`
  const idx =
    type === 'claim'
      ? 0
      : type === 'conclusion'
        ? order.length
        : type === 'inference'
          ? (() => {
              const c = order.findIndex((n) => n.type === 'conclusion')
              return c === -1 ? order.length : c
            })()
          : (() => {
              const i = order.findIndex((n) => n.type === 'inference' || n.type === 'conclusion')
              return i === -1 ? order.length : i
            })()
  const prev = order[idx - 1]
  const next = order[idx]
  const y = next ? next.y : prev ? prev.y + 170 : 40
  const x = next?.x ?? prev?.x ?? 80
  const shifted = arg.nodes.map((n) => {
    if (!next) return n
    // Shift the rest of the chain (and anything attached to it) down to make room.
    const chainAfter = order.slice(idx).map((o) => o.id)
    const isAfter = chainAfter.includes(n.id) || (n.target && chainAfter.includes(rootOf(arg, n.id)))
    return isAfter ? { ...n, y: n.y + 160 } : n
  })
  const node: ArgNode = { id: newId, type, text: '', x, y }
  let links = [...arg.links]
  if (prev && next) {
    const existing = links.find((l) => l.from === prev.id && l.to === next.id)
    if (existing) links = links.filter((l) => l !== existing)
    links.push({ id: `l-${newId}-a`, from: prev.id, to: newId, kind: linkKindFor(type) })
    links.push({ id: `l-${newId}-b`, from: newId, to: next.id, kind: linkKindFor(next.type) })
  } else if (prev) {
    links.push({ id: `l-${newId}-a`, from: prev.id, to: newId, kind: linkKindFor(type) })
  } else if (next) {
    links.push({ id: `l-${newId}-b`, from: newId, to: next.id, kind: linkKindFor(next.type) })
  }
  return { nodes: [...shifted, node], links, newId }
}

function rootOf(arg: Argument, id: string): string {
  let cur = arg.nodes.find((n) => n.id === id)
  const guard = new Set<string>()
  while (cur?.target && !guard.has(cur.id)) {
    guard.add(cur.id)
    cur = arg.nodes.find((n) => n.id === cur!.target)
  }
  return cur?.id ?? id
}

export function attachmentPosition(arg: Argument, targetId: string, heights: Record<string, number>) {
  const t = arg.nodes.find((n) => n.id === targetId)!
  const siblings = arg.nodes.filter((n) => n.target === targetId)
  const y = siblings.length ? Math.max(...siblings.map((s) => s.y + (heights[s.id] ?? 110) + 20)) : t.y
  return { x: t.x + ATTACH_X, y }
}
