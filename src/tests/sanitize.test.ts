// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { sanitizeWikiHtml } from '../research/providers'

describe('Wikipedia sanitizer', () => {
  const html = `
    <section><p onclick="steal()" style="color:red">Text <sup class="reference">[1]</sup><a rel="mw:WikiLink" href="./Harm_principle#Mill">harm</a>
    <a href="https://example.org">out</a><a href="javascript:alert(1)">bad</a></p>
    <script>alert(1)</script><iframe src="https://evil"></iframe>
    <img src="//upload.wikimedia.org/a.png"><img src="https://evil.example/x.png"></section>
    <section><h2>References</h2><p>refs</p></section>`
  const out = sanitizeWikiHtml(html)

  it('removes scripts, frames, handlers and inline styles', () => {
    expect(out).not.toMatch(/<script|<iframe|onclick|style=/)
  })

  it('turns wiki links into in-app links and opens others in a new tab', () => {
    expect(out).toContain('data-wiki="Harm_principle"')
    expect(out).toMatch(/href="https:\/\/example\.org" target="_blank" rel="noopener noreferrer"/)
    expect(out).not.toContain('javascript:')
  })

  it('keeps only Wikimedia images and drops reference sections', () => {
    expect(out).toContain('https://upload.wikimedia.org/a.png')
    expect(out).not.toContain('evil.example')
    expect(out).not.toContain('refs')
    expect(out).not.toContain('[1]')
  })
})
