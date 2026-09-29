import type { ArgLink, ArgNode, Argument } from '../model/types'

let n = 0
const lid = () => `l${++n}`

function chain(nodes: ArgNode[], extra: Omit<ArgLink, 'id'>[] = []): ArgLink[] {
  const core = nodes.filter((x) => !x.target)
  const links: ArgLink[] = []
  for (let i = 0; i < core.length - 1; i++) {
    const a = core[i]
    const b = core[i + 1]
    links.push({ id: lid(), from: a.id, to: b.id, kind: b.type === 'conclusion' || b.type === 'inference' ? 'infers' : 'supports' })
  }
  for (const node of nodes) {
    if (!node.target) continue
    const kind =
      node.type === 'objection' || node.type === 'counter'
        ? 'challenges'
        : node.type === 'rebuttal'
          ? 'rebuts'
          : node.type === 'definition'
            ? 'defines'
            : node.type === 'assumption'
              ? 'assumes'
              : 'grounds'
    links.push({ id: lid(), from: node.id, to: node.target, kind })
  }
  return [...links, ...extra.map((e) => ({ ...e, id: lid() }))]
}

const X = 80
const XR = 420

function seed(a: Omit<Argument, 'kind' | 'links' | 'updatedAt' | 'seeded'> & { extra?: Omit<ArgLink, 'id'>[] }): Argument {
  const { extra, ...rest } = a
  return { ...rest, kind: 'argument', links: chain(a.nodes, extra), updatedAt: Date.UTC(2026, 8, 20), seeded: true }
}

export const seedArguments: Argument[] = [
  seed({
    id: 'arg-sacrifice',
    title: 'The utilitarian case for sacrifice',
    author: 'you',
    tradition: 'utilitarianism',
    summary: 'If greater happiness is what matters morally, sacrificing one person can sometimes be justified.',
    concepts: ['greatest-happiness', 'consequentialism', 'happiness', 'rights'],
    philosophers: ['mill', 'rawls', 'kant'],
    nodes: [
      { id: 's1', type: 'claim', text: 'Greater happiness is morally valuable.', x: X, y: 40 },
      { id: 's2', type: 'premise', text: 'Moral actions should maximize happiness.', x: X, y: 200 },
      { id: 's3', type: 'inference', text: 'If sacrificing one person produces more total happiness than any alternative, that act maximizes happiness.', x: X, y: 360 },
      { id: 's4', type: 'conclusion', text: 'Therefore, sacrificing one person can sometimes be morally justified.', x: X, y: 540 },
      { id: 's5', type: 'objection', text: 'This treats the person sacrificed merely as a means to others’ happiness.', x: XR, y: 470, target: 's4', refs: ['kant', 'categorical-imperative'] },
      { id: 's6', type: 'definition', text: 'Happiness: pleasure and the absence of pain (Mill, Utilitarianism ch. 2).', x: XR, y: 40, target: 's1', refs: ['mill', 'happiness'] },
    ],
  }),
  seed({
    id: 'arg-lying-promise',
    title: 'Why a lying promise cannot be universalized',
    author: 'kant',
    tradition: 'kantianism',
    summary: 'Kant’s own example from the Groundwork: the maxim of the lying promise defeats itself when universalized.',
    concepts: ['universalizability', 'categorical-imperative', 'lying'],
    philosophers: ['kant'],
    nodes: [
      { id: 'k1', type: 'claim', text: 'Making a lying promise to get money is morally impermissible.', x: X, y: 40 },
      { id: 'k2', type: 'premise', text: 'An action is permissible only if its maxim can be willed as a universal law.', x: X, y: 190, refs: ['categorical-imperative'] },
      { id: 'k3', type: 'premise', text: 'If everyone made lying promises when in need, no one would believe promises, and promising would become impossible.', x: X, y: 340 },
      { id: 'k4', type: 'inference', text: 'So the maxim “make false promises when in need” cannot be consistently universalized.', x: X, y: 500 },
      { id: 'k5', type: 'conclusion', text: 'Therefore, the lying promise violates the categorical imperative.', x: X, y: 650 },
      { id: 'k6', type: 'evidence', text: 'Groundwork II, 4:422 — Kant’s second example.', x: XR, y: 340, target: 'k3', refs: ['groundwork'] },
      { id: 'k7', type: 'objection', text: 'Maxims can be described more narrowly (“lie when a murderer asks…”) so that they universalize without contradiction.', x: XR, y: 520, target: 'k4' },
      { id: 'k8', type: 'rebuttal', text: 'Kant’s test concerns the agent’s actual maxim, not any description one can invent after the fact.', x: XR + 40, y: 700, target: 'k7' },
    ],
  }),
  seed({
    id: 'arg-veil',
    title: 'The argument from the original position',
    author: 'rawls',
    tradition: 'social-contract',
    summary: 'Rational parties behind a veil of ignorance would choose principles that protect the least advantaged.',
    concepts: ['original-position', 'veil-of-ignorance', 'difference-principle', 'fairness'],
    philosophers: ['rawls', 'mill'],
    nodes: [
      { id: 'r1', type: 'claim', text: 'A just society arranges inequalities to benefit the least advantaged.', x: X, y: 40 },
      { id: 'r2', type: 'premise', text: 'Just principles are those that free and equal persons would choose under fair conditions.', x: X, y: 190 },
      { id: 'r3', type: 'premise', text: 'Behind a veil of ignorance, no one knows whether they will be among the least advantaged.', x: X, y: 340 },
      { id: 'r4', type: 'inference', text: 'Under such uncertainty, rational parties would secure the best worst-case outcome.', x: X, y: 490 },
      { id: 'r5', type: 'conclusion', text: 'Therefore, they would choose the difference principle.', x: X, y: 640 },
      { id: 'r6', type: 'objection', text: 'Why assume extreme risk-aversion? Parties might gamble on higher average welfare (Harsanyi).', x: XR, y: 490, target: 'r4' },
      { id: 'r7', type: 'assumption', text: 'Hypothetical agreement has moral authority over actual persons.', x: XR, y: 190, target: 'r2' },
    ],
  }),
  seed({
    id: 'arg-cogito',
    title: 'The cogito',
    author: 'descartes',
    tradition: 'rationalism',
    summary: 'Even radical doubt establishes the existence of the one who doubts.',
    concepts: ['cogito', 'methodological-doubt'],
    philosophers: ['descartes'],
    nodes: [
      { id: 'd1', type: 'claim', text: 'I can be certain that I exist.', x: X, y: 40 },
      { id: 'd2', type: 'premise', text: 'I am doubting (and doubting is a form of thinking).', x: X, y: 190 },
      { id: 'd3', type: 'premise', text: 'Whatever thinks must exist.', x: X, y: 330 },
      { id: 'd4', type: 'conclusion', text: 'Therefore, I exist — at least as a thinking thing.', x: X, y: 470 },
      { id: 'd5', type: 'objection', text: 'The premise “I am thinking” already presupposes an “I”. Perhaps only “there is thinking” is certain (Lichtenberg).', x: XR, y: 190, target: 'd2' },
    ],
  }),
  seed({
    id: 'arg-harm',
    title: 'Against paternalism',
    author: 'mill',
    tradition: 'liberalism',
    summary: 'Mill’s harm principle rules out coercing adults for their own good.',
    concepts: ['harm-principle', 'liberty', 'autonomy'],
    philosophers: ['mill'],
    nodes: [
      { id: 'm1', type: 'claim', text: 'The state should not prohibit self-regarding risky conduct by adults.', x: X, y: 40 },
      { id: 'm2', type: 'premise', text: 'Power may be exercised over someone against their will only to prevent harm to others.', x: X, y: 190, refs: ['harm-principle'] },
      { id: 'm3', type: 'premise', text: 'Self-regarding risky conduct harms, if anyone, only the consenting agent.', x: X, y: 340 },
      { id: 'm4', type: 'conclusion', text: 'Therefore, such conduct may not be prohibited.', x: X, y: 490 },
      { id: 'm5', type: 'counter', text: 'Almost no conduct is purely self-regarding: dependants, public health systems and communities bear costs.', x: XR, y: 340, target: 'm3' },
    ],
  }),
  seed({
    id: 'arg-bad-faith',
    title: 'No excuses: existential responsibility',
    author: 'sartre',
    tradition: 'existentialism',
    summary: 'If there is no fixed human nature, we cannot shift responsibility for our choices onto it.',
    concepts: ['existence-precedes-essence', 'moral-responsibility', 'bad-faith'],
    philosophers: ['sartre', 'beauvoir'],
    nodes: [
      { id: 'b1', type: 'claim', text: 'We are fully responsible for what we make of ourselves.', x: X, y: 40 },
      { id: 'b2', type: 'premise', text: 'There is no human nature given prior to our existence and choices.', x: X, y: 190 },
      { id: 'b3', type: 'premise', text: 'If nothing prior determines what we are, our choices alone define us.', x: X, y: 340 },
      { id: 'b4', type: 'conclusion', text: 'Therefore, appealing to “nature” or “circumstance” as an excuse is bad faith.', x: X, y: 490 },
      { id: 'b5', type: 'objection', text: 'Situations constrain freedom unequally; oppression limits what choices are genuinely available (Beauvoir).', x: XR, y: 340, target: 'b3', refs: ['beauvoir', 'situated-freedom'] },
    ],
  }),
]
