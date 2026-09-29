/**
 * Glicko-2, as specified in Mark Glickman, "Example of the Glicko-2 system"
 * (Boston University, 2012). Ratings are kept on the familiar Glicko scale
 * (1500 / 350) and converted internally.
 */

export interface Rating {
  /** Rating, Glicko scale. */
  r: number
  /** Rating deviation (uncertainty), Glicko scale. */
  rd: number
  /** Volatility. */
  vol: number
}

export interface Game {
  opponent: Rating
  /** 1 win, 0 loss, 0.5 draw. */
  score: number
  /** How much the game counts (default 1). A weight of w scales its information, like w copies of it in one period. */
  weight?: number
}

export const START: Rating = { r: 1500, rd: 350, vol: 0.06 }
export const TAU = 0.5
const SCALE = 173.7178
const EPSILON = 0.000001

const g = (phi: number) => 1 / Math.sqrt(1 + (3 * phi * phi) / (Math.PI * Math.PI))
const expected = (mu: number, muJ: number, phiJ: number) => 1 / (1 + Math.exp(-g(phiJ) * (mu - muJ)))

/** Update one player for one rating period against a list of games. */
export function update(player: Rating, games: Game[], tau = TAU): Rating {
  const mu = (player.r - 1500) / SCALE
  const phi = player.rd / SCALE
  const sigma = player.vol

  // A period with no games only widens the deviation.
  if (!games.length) {
    const phiStar = Math.sqrt(phi * phi + sigma * sigma)
    return { r: player.r, rd: phiStar * SCALE, vol: sigma }
  }

  const opp = games.map((gm) => ({ mu: (gm.opponent.r - 1500) / SCALE, phi: gm.opponent.rd / SCALE, s: gm.score, w: gm.weight ?? 1 }))

  let vInv = 0
  let sum = 0
  for (const o of opp) {
    const gj = g(o.phi)
    const e = expected(mu, o.mu, o.phi)
    vInv += o.w * gj * gj * e * (1 - e)
    sum += o.w * gj * (o.s - e)
  }
  const v = 1 / vInv
  const delta = v * sum

  // New volatility by the Illinois algorithm (step 5).
  const a = Math.log(sigma * sigma)
  const f = (x: number) => {
    const ex = Math.exp(x)
    const d = phi * phi + v + ex
    return (ex * (delta * delta - phi * phi - v - ex)) / (2 * d * d) - (x - a) / (tau * tau)
  }
  let A = a
  let B: number
  if (delta * delta > phi * phi + v) {
    B = Math.log(delta * delta - phi * phi - v)
  } else {
    let k = 1
    while (f(a - k * tau) < 0) k++
    B = a - k * tau
  }
  let fA = f(A)
  let fB = f(B)
  while (Math.abs(B - A) > EPSILON) {
    const C = A + ((A - B) * fA) / (fB - fA)
    const fC = f(C)
    if (fC * fB <= 0) {
      A = B
      fA = fB
    } else {
      fA = fA / 2
    }
    B = C
    fB = fC
  }
  const sigmaNew = Math.exp(A / 2)

  const phiStar = Math.sqrt(phi * phi + sigmaNew * sigmaNew)
  const phiNew = 1 / Math.sqrt(1 / (phiStar * phiStar) + 1 / v)
  const muNew = mu + phiNew * phiNew * sum

  return { r: muNew * SCALE + 1500, rd: phiNew * SCALE, vol: sigmaNew }
}

/** Probability that `a` beats `b`, using both players' uncertainty. */
export function winProbability(a: Pick<Rating, 'r' | 'rd'>, b: Pick<Rating, 'r' | 'rd'>): number {
  const phi = Math.sqrt(a.rd * a.rd + b.rd * b.rd) / SCALE
  return expected((a.r - 1500) / SCALE, (b.r - 1500) / SCALE, phi)
}

/** The ranking score: rating less two deviations, so thinly-sampled debaters don't float to the top. */
export const conservative = (x: Pick<Rating, 'r' | 'rd'>) => x.r - 2 * x.rd
