import { useEffect, useState } from 'react'
import { loadCards, type LibraryCard } from '../../data/cards'
import type { DocJSON } from '../../model/types'
import { appendNodes } from '../../research/docModel'
import { useOS } from '../../store'
import { cardToNodes } from './cards'

let cache: Promise<LibraryCard[]> | null = null

/** The card library, loaded once per session. */
export function useLibrary(): LibraryCard[] | null {
  const [cards, setCards] = useState<LibraryCard[] | null>(null)
  useEffect(() => {
    let live = true
    cache ??= loadCards()
    cache.then((c) => live && setCards(c))
    return () => {
      live = false
    }
  }, [])
  return cards
}

/** Append a library card to the end of a doc. */
export function sendCardToDoc(card: LibraryCard, docId: string) {
  const s = useOS.getState()
  const doc = s.docs.find((d) => d.id === docId)
  if (!doc) return false
  s.updateDoc(docId, { content: appendNodes(doc.content as DocJSON, cardToNodes(card)) })
  return true
}
