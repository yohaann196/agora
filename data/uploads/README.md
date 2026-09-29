# Uploaded tournaments

Local tournaments (and any circuit tournament the source datasets are missing) go here. Every folder is rated in the same Glicko-2 pool as the national circuit on the next build.

```
data/uploads/<season>/<tournament-slug>/
  tournament.json        name, dates, place, level
  entries.csv            Tabroom "Entries" export
  <round files>.csv      one Tabroom round-results export per round
```

- `<season>` is like `2026-27`.
- `<tournament-slug>` is lowercase with dashes, e.g. `stephen-stewart`.

## tournament.json

```json
{
  "name": "Stephen Stewart Memorial Invitational",
  "start": "2026-09-25",
  "end": "2026-09-28",
  "city": "Milpitas",
  "state": "CA",
  "level": "local"
}
```

`level` is `local` (the default) or `circuit`. Circuit rounds count double a local round. `tabroomId` is optional.

## Entries

This is the file Tabroom exports from a division's entry list. It needs these columns:

- `Institution` (or `School`)
- `Location` (e.g. `CA/US`)
- `Entry` (the debater's name)
- `Code` (the code used in the round results)

Any extra columns are ignored.

## Rounds

Export each round's results from Tabroom as CSV. The prelim and elim formats are the same ones the source datasets use:

- **Prelims:** `Aff,Neg,Judge,Win,Aff Points,Neg Points`
  - `Result` works in place of `Win`.
  - `AffPoints` / `NegPoints` work too.
- **Elims (panels):** `Aff,Neg,Judges,Votes,Win`, where `Win` is e.g. `2-1 AFF`.

There are two ways to lay out the round files:

- **Flat.** Every round file sits next to `entries.csv`. Name them so they sort in order: `01-round-1.csv`, …, `07-quarterfinals.csv`, or Tabroom's `Tabroom-<id>.csv` (ids increase through the tournament). A file whose name contains *quarter*, *semi*, *final*, *octa*, *double* or *triple* is treated as an elim. So is a panel file with no points column.
- **Split.** Use `Prelims/` and `Elims/` subfolders, like the skumar-ml dataset.

Only include the varsity/open LD division. Byes, split decisions and "advances" rows are skipped automatically.

If an upload has the same name as a tournament in a source dataset, the upload replaces it.
