/**
 * Builds the LD rankings data the site reads from public/data/ld/.
 *
 *   npm run rankings                    # clone the public dataset and rebuild
 *   npm run rankings -- --source <dir>  # use a local checkout instead
 *
 * Data: public Tabroom results collected by github.com/shreerammodi/debate-rankings.
 */
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { PERIODS, computeRankings, debaterFile, periodOf, rankList, type RankingsConfig, type RawTournament } from '../../src/rankings/pipeline'
import type { RankingsFile } from '../../src/rankings/types'

const REPO = 'https://github.com/shreerammodi/debate-rankings'
const EVENT = 'hsld'
const OUT = resolve('public/data/ld')

/** Display names for tournament folder slugs; anything missing falls back to a title-cased slug. */
const NAMES: Record<string, string> = {
  'loyola-rr': 'Loyola Round Robin',
  loyola: 'Loyola Invitational',
  ukso: 'UK Season Opener',
  grapevine: 'Grapevine Classic',
  'greenhill-rr': 'Greenhill Round Robin',
  greenhill: 'Greenhill Fall Classic',
  meadows: 'Meadows Invitational',
  'heart-of-texas': 'Heart of Texas Invitational',
  glenbrooks: 'Glenbrooks',
  emory: 'Barkley Forum (Emory)',
  cal: 'Cal Invitational (Berkeley)',
  harvard: 'Harvard National Invitational',
  'harvard-westlake': 'Harvard-Westlake',
  ndca: 'NDCA Championship',
  toc: 'Tournament of Champions',
  isidore: 'Isidore Newman Invitational',
}

function sourceDir(): string {
  const i = process.argv.indexOf('--source')
  if (i > -1 && process.argv[i + 1]) return resolve(process.argv[i + 1])
  const cache = resolve('.cache/debate-rankings')
  if (existsSync(join(cache, '.git'))) {
    execFileSync('git', ['-C', cache, 'pull', '--ff-only', '--quiet'], { stdio: 'inherit' })
  } else {
    mkdirSync(resolve('.cache'), { recursive: true })
    execFileSync('git', ['clone', '--depth', '1', '--quiet', `${REPO}.git`, cache], { stdio: 'inherit' })
  }
  return cache
}

function seasonOf(date: Date) {
  const y = date.getUTCFullYear()
  const start = date.getUTCMonth() >= 6 ? y : y - 1
  return `${start}–${String(start + 1).slice(2)}`
}

const src = sourceDir()
const config = JSON.parse(readFileSync(join(src, `config/${EVENT}-config.json`), 'utf8')) as RankingsConfig
const data = new Map<string, RawTournament>()
for (const slug of config.tournaments) {
  const dir = join(src, 'tournaments', EVENT, slug)
  if (!existsSync(dir)) {
    console.warn(`skip ${slug}: no folder`)
    continue
  }
  const files = readdirSync(dir).filter((f) => f.endsWith('.csv'))
  data.set(slug, {
    slug,
    entries: readFileSync(join(dir, 'entries.csv'), 'utf8'),
    files: files.filter((f) => f !== 'entries.csv').map((name) => ({ name, text: readFileSync(join(dir, name), 'utf8') })),
  })
}

let commit = 'unknown'
let committedAt = new Date().toISOString()
try {
  commit = execFileSync('git', ['-C', src, 'rev-parse', 'HEAD']).toString().trim()
  committedAt = new Date(execFileSync('git', ['-C', src, 'log', '-1', '--format=%cI']).toString().trim()).toISOString()
} catch {
  // A plain folder without git history is fine.
}
const season = seasonOf(new Date(committedAt))
const present = config.tournaments.filter((t) => data.has(t))
const periodBySlug = periodOf(config)
const periods = PERIODS.filter((p) => present.some((t) => periodBySlug[t] === p.slug))
const allPeriods = [{ slug: 'season', label: 'Full season' }, ...periods]

rmSync(OUT, { recursive: true, force: true })
mkdirSync(join(OUT, 'debaters'), { recursive: true })

const base = (period: { slug: string; label: string }, only: string[]) => {
  const result = computeRankings(config, data, { names: NAMES, only })
  const previous = only.length > 1 ? computeRankings(config, data, { names: NAMES, only: only.slice(0, -1) }) : undefined
  const file: RankingsFile = {
    event: 'hsld',
    eventLabel: 'Lincoln–Douglas',
    season,
    period,
    periods: allPeriods,
    generatedAt: new Date().toISOString(),
    source: { repo: REPO, commit, committedAt },
    tournaments: result.tournaments,
    field: result.field,
    debaters: rankList(result, previous),
  }
  writeFileSync(join(OUT, `rankings-${period.slug}.json`), JSON.stringify(file))
  return { result, file }
}

const { result, file } = base(allPeriods[0], present)
for (const p of periods) {
  const only = present.filter((t) => periodBySlug[t] === p.slug)
  if (only.length) base(p, only)
}

for (const d of result.debaters) {
  writeFileSync(join(OUT, 'debaters', `${d.id}.json`), JSON.stringify(debaterFile(d, result.tournaments, season)))
}

console.log(`LD ${season}: ${file.debaters.length} debaters, ${file.tournaments.length} tournaments, ${file.field.rounds} decided rounds`)
console.log(file.debaters.slice(0, 10).map((d) => `${String(d.rank).padStart(3)}. ${d.name} (${d.school}) ${d.score.toFixed(1)}  ${d.wins}-${d.losses}`).join('\n'))
