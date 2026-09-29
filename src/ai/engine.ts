import type { Settings, SocraticMode } from '../store'
import { respond, SYSTEM_PROMPTS, type HistoryItem, type SocraticReply } from './socratic'
import { philosopherById } from '../data/philosophers'

/**
 * The AI layer. Two providers share one interface:
 *  - `local`: the PhilosophyOS reasoning engine (rule-based, runs in the browser, no network)
 *  - `anthropic`: Claude, called from the browser with a key the user supplies in Settings
 *
 * The local engine is always available and is the fallback on any provider error.
 */

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** Stream text in word-sized chunks so local replies feel like live reasoning. */
export async function simulateStream(text: string, onDelta: (full: string) => void, signal?: AbortSignal, speed = 1) {
  const parts = text.match(/\S+\s*|\n/g) ?? [text]
  let acc = ''
  await sleep(380 / speed)
  for (let i = 0; i < parts.length; i++) {
    if (signal?.aborted) return
    acc += parts[i]
    if (i % 2 === 0 || i === parts.length - 1) onDelta(acc)
    await sleep((parts[i].includes('\n') ? 26 : 11) / speed)
  }
  onDelta(acc)
}

export interface AskOptions {
  input: string
  mode: SocraticMode
  history: HistoryItem[]
  philosopher: string
  settings: Pick<Settings, 'aiProvider' | 'apiKey' | 'reduceMotion'>
  onDelta: (full: string) => void
  signal?: AbortSignal
}

export interface AskResult extends SocraticReply {
  provider: 'local' | 'anthropic'
  error?: string
}

export async function askSocratic(opts: AskOptions): Promise<AskResult> {
  const local = respond(opts.input, opts.mode, opts.history, opts.philosopher)
  if (opts.settings.aiProvider === 'anthropic' && opts.settings.apiKey.trim()) {
    try {
      const text = await streamFromClaude(opts)
      return { ...local, text, provider: 'anthropic' }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      await simulateStream(local.text, opts.onDelta, opts.signal, opts.settings.reduceMotion ? 20 : 1)
      return { ...local, provider: 'local', error: msg }
    }
  }
  await simulateStream(local.text, opts.onDelta, opts.signal, opts.settings.reduceMotion ? 20 : 1)
  return { ...local, provider: 'local' }
}

async function streamFromClaude(opts: AskOptions): Promise<string> {
  const { default: Anthropic } = await import('@anthropic-ai/sdk')
  const client = new Anthropic({ apiKey: opts.settings.apiKey.trim(), dangerouslyAllowBrowser: true })
  const philosopher = philosopherById[opts.philosopher]
  const system = [
    'You are the reasoning layer of PhilosophyOS, a workspace for philosophy and debate students.',
    'Core principle: amplify the student’s thinking; never replace it. Do not simply hand over answers or write their work for them.',
    'Never fabricate quotations. When quoting, give the work and location; otherwise clearly say you are summarising or interpreting.',
    'Use short paragraphs, **bold** for key terms, and "- " bullets when helpful. Keep replies under 220 words.',
    SYSTEM_PROMPTS[opts.mode],
    opts.mode === 'philosopher' && philosopher ? `The philosopher is ${philosopher.name} (${philosopher.dates}).` : '',
  ]
    .filter(Boolean)
    .join('\n\n')

  const messages = [
    ...opts.history.map((h) => ({ role: h.role === 'user' ? ('user' as const) : ('assistant' as const), content: h.text })),
    { role: 'user' as const, content: opts.input },
  ]
  // The API requires the first message to be from the user.
  while (messages.length && messages[0].role !== 'user') messages.shift()

  const stream = client.beta.messages.stream(
    {
      model: 'claude-opus-5-5',
      max_tokens: 4000,
      system,
      messages,
      output_config: { effort: 'low' },
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
    },
    { signal: opts.signal },
  )
  let acc = ''
  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      acc += event.delta.text
      opts.onDelta(acc)
    }
  }
  const final = await stream.finalMessage()
  if (final.stop_reason === 'refusal') throw new Error('The request was declined by the model.')
  if (!acc.trim()) throw new Error('Empty response')
  return acc
}
