import { Extension, Mark, mergeAttributes, type Editor } from '@tiptap/react'

export const HIGHLIGHT = '#f2dc55'

/** Paragraph roles: a cite line or card text. */
export const Roles = Extension.create({
  name: 'roles',
  addGlobalAttributes() {
    return [
      {
        types: ['paragraph'],
        attributes: {
          role: {
            default: null,
            parseHTML: (el) => el.getAttribute('data-role'),
            renderHTML: (attrs) => (attrs.role ? { 'data-role': attrs.role } : {}),
          },
        },
      },
    ]
  },
})

/** Verbatim's "emphasis": bold, underlined and boxed. */
export const Emphasis = Mark.create({
  name: 'emphasis',
  parseHTML() {
    return [{ tag: 'span[data-emphasis]' }]
  },
  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { 'data-emphasis': '', class: 'emph' }), 0]
  },
})

export function setRole(editor: Editor, role: 'cite' | 'card' | null) {
  return editor.chain().focus().setParagraph().updateAttributes('paragraph', { role }).run()
}

export function clearFormatting(editor: Editor) {
  return editor.chain().focus().unsetAllMarks().setParagraph().updateAttributes('paragraph', { role: null }).run()
}

/** Join the selected paragraphs into one, keeping their formatting. */
export function condense(editor: Editor) {
  const { state, view } = editor
  const { from, to } = state.selection
  const boundaries: number[] = []
  let prevEnd: number | null = null
  state.doc.forEach((node, offset) => {
    const start = offset
    const end = offset + node.nodeSize
    if (end < from || start > to || node.type.name !== 'paragraph') {
      prevEnd = null
      return
    }
    if (prevEnd !== null && prevEnd === start) boundaries.push(start)
    prevEnd = end
  })
  if (!boundaries.length) return false
  const tr = state.tr
  for (const b of boundaries.reverse()) {
    tr.join(b)
    tr.insertText(' ', b - 1)
  }
  view.dispatch(tr)
  return true
}

/** Verbatim function keys, plus Mod-Alt alternatives for keyboards without F-keys. */
export const VerbatimKeys = Extension.create({
  name: 'verbatimKeys',
  addKeyboardShortcuts() {
    const e = () => this.editor
    const h = (level: 1 | 2 | 3 | 4) => () => e().chain().focus().setHeading({ level }).run()
    return {
      F4: h(1),
      F5: h(2),
      F6: h(3),
      F7: h(4),
      F8: () => setRole(e(), 'cite'),
      F9: () => e().chain().focus().toggleUnderline().run(),
      F10: () => e().chain().focus().toggleMark('emphasis').run(),
      F11: () => e().chain().focus().toggleHighlight({ color: HIGHLIGHT }).run(),
      F12: () => clearFormatting(e()),
      'Mod-Alt-1': h(1),
      'Mod-Alt-2': h(2),
      'Mod-Alt-3': h(3),
      'Mod-Alt-4': h(4),
      'Mod-Alt-5': () => setRole(e(), 'cite'),
      'Mod-Alt-6': () => setRole(e(), 'card'),
      'Mod-Shift-e': () => e().chain().focus().toggleMark('emphasis').run(),
      'Mod-Shift-h': () => e().chain().focus().toggleHighlight({ color: HIGHLIGHT }).run(),
      'Mod-Shift-x': () => clearFormatting(e()),
    }
  },
})
