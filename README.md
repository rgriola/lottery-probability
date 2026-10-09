# Lottery Probability

A focused, client-only web app that analyzes official historical Mega Millions and Powerball drawings and ranks which numbers are statistically most likely to appear next.

This is a clean split from [lottery-madness](https://github.com/rgriola/lottery-madness) — that repo keeps the general-purpose Excel/data-exploration tools; this repo is just the lottery probability UI.

## How it works

```
Fetch (per-game Socrata adapter)
  → Normalize (uniform draw schema, regardless of game)
  → Store (IndexedDB, incremental sync)
  → Analyze (frequency, hot/cold, gap/overdue — per current rules era)
  → Render (ranked table + chart)
```

### Data source

Historical draws come live from New York State's official open data portal (Socrata), which is free, requires no API key, and supports CORS directly from the browser:

- Mega Millions: `https://data.ny.gov/resource/5xaw-6ayf.json`
- Powerball: `https://data.ny.gov/resource/d6yy-54nr.json`

Each game has a different raw schema (e.g. Powerball packs its bonus ball into the same field as the main numbers; Mega Millions splits it out). A per-game adapter in [src/games/registry.ts](src/games/registry.ts) normalizes both into one shared shape (`NormalizedDraw`) so the rest of the app never deals with game-specific quirks.

### Rule-change era filtering

Lottery number pools change over time (e.g. Powerball moved from 59 to 69 main numbers in 2015; Mega Millions' Mega Ball pool shrank from 25 to 24 numbers in 2025). Mixing draws from different rule eras would corrupt the statistics, since numbers that didn't exist under the old rules would be undercounted.

Each pool (main numbers and bonus ball) tracks its own `effectiveSince` date — verified directly against the live dataset, not just secondary sources — and every analysis automatically excludes draws before that date **independently per pool**. For example, Mega Millions main-number stats use data back to 2017-10-31, while its Mega Ball stats only use data since 2025-04-08, since those two pools changed on different dates.

### Probability scoring

For each number in a pool, three transparent signals are computed and combined into one 0–100 score (simple unweighted average — nothing hidden):

- **Frequency %** — how often the number has appeared in draws under the current rules
- **Hot/Cold** — deviation from the frequency a uniform random draw would predict
- **Overdue ratio** — draws since last seen, relative to the number's historical average gap

### Storage

Draw history is cached in the browser via IndexedDB, keyed per game. Re-syncing only fetches draws newer than the last cached date, so updates are incremental rather than re-downloading the full history each time.

## Status

- ✅ Mega Millions — fully wired up (fetch, store, analyze, chart)
- 🚧 Powerball — adapter and rule-era dates are implemented and verified, but not yet enabled in the UI (`enabled: false` in the registry). Flip it on once Mega Millions is validated in production.

## Getting Started

```bash
npm install
npm run dev       # start the Vite dev server
npm run build     # type-check + production build (dist/)
npm run preview   # preview the production build locally
```

## Tech Stack

- [Vite](https://vitejs.dev/) + TypeScript (vanilla DOM, no framework)
- [Chart.js](https://www.chartjs.org/) for charts
- IndexedDB (native browser API) for persistence — no backend required

## Project Structure

```
src/
├── main.ts                 # App shell + wiring
├── types/lottery.ts         # Uniform data model (NormalizedDraw, GameConfig, NumberPool)
├── games/registry.ts        # Per-game config: pools, rule-era dates, Socrata row adapters
├── data/
│   ├── socrataAdapter.ts    # Generic Socrata fetch + per-game normalization
│   ├── db.ts                # IndexedDB wrapper (draws + sync metadata)
│   └── sync.ts               # Incremental sync orchestration
├── stats/
│   ├── eraFilter.ts          # Filters draws to a pool's current-rules era
│   ├── frequency.ts
│   ├── hotCold.ts
│   ├── gapAnalysis.ts
│   └── probabilityScore.ts   # Combines the above into one ranked score
├── charts/renderChart.ts     # Chart.js bar chart of scores
└── ui/renderRankedList.ts    # Ranked table renderer
```

## License

MIT © Rod Griola
