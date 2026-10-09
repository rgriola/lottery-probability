import './style.css';
import { megaMillions, powerball, type GameConfig } from './games/registry';
import type { NormalizedDraw } from './types/lottery';
import { loadCachedDraws, syncGame, type SyncResult } from './data/sync';
import { rankNumbers } from './stats/probabilityScore';
import { selectPoolNumbers } from './stats/eraFilter';
import { renderScoreChart } from './charts/renderChart';
import { renderRankedTable } from './ui/renderRankedList';

const TOP_N = 15;
const games: GameConfig[] = [megaMillions, powerball];
let activeGame: GameConfig = megaMillions;

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
  <header class="app-header">
    <h1>Lottery Probability</h1>
    <p class="subtitle">Which numbers are statistically most likely to appear next?</p>
  </header>

  <section class="controls">
    <label for="game-select">Game</label>
    <select id="game-select">
      ${games
        .map(
          (g) =>
            `<option value="${g.id}" ${g.enabled ? '' : 'disabled'}>${g.name}${
              g.enabled ? '' : ' (coming soon)'
            }</option>`
        )
        .join('')}
    </select>
    <button id="sync-btn">Sync latest data</button>
    <span id="sync-status" class="sync-status"></span>
  </section>

  <section id="results" class="results hidden">
    <article class="pool-section">
      <h2 id="main-pool-title"></h2>
      <p id="main-pool-meta" class="pool-meta"></p>
      <div class="chart-wrapper"><canvas id="main-pool-chart"></canvas></div>
      <div id="main-pool-table"></div>
    </article>

    <article class="pool-section">
      <h2 id="bonus-pool-title"></h2>
      <p id="bonus-pool-meta" class="pool-meta"></p>
      <div class="chart-wrapper"><canvas id="bonus-pool-chart"></canvas></div>
      <div id="bonus-pool-table"></div>
    </article>
  </section>

  <section id="empty-state" class="empty-state">
    <p>No data cached yet for ${activeGame.name}. Click "Sync latest data" to fetch the official draw history.</p>
  </section>
`;

const gameSelect = document.querySelector<HTMLSelectElement>('#game-select')!;
const syncBtn = document.querySelector<HTMLButtonElement>('#sync-btn')!;
const syncStatus = document.querySelector<HTMLSpanElement>('#sync-status')!;
const resultsSection = document.querySelector<HTMLElement>('#results')!;
const emptyState = document.querySelector<HTMLElement>('#empty-state')!;

function formatSyncStatus(result: SyncResult, draws: NormalizedDraw[]): string {
  if (draws.length === 0) return 'No data cached yet.';
  const latest = draws[draws.length - 1]?.drawDate ?? 'n/a';
  const newPart = result.newDrawCount > 0 ? ` (+${result.newDrawCount} new)` : '';
  return `${draws.length} draws cached${newPart} • latest: ${latest}`;
}

function renderPool(
  game: GameConfig,
  field: 'mainNumbers' | 'bonusNumber',
  draws: NormalizedDraw[],
  titleEl: HTMLElement,
  metaEl: HTMLElement,
  canvas: HTMLCanvasElement,
  tableEl: HTMLElement
): void {
  const pool = field === 'mainNumbers' ? game.mainPool : game.bonusPool;
  const label = field === 'mainNumbers' ? 'Main Numbers' : game.bonusName;
  const eraDraws = selectPoolNumbers(draws, pool, field);

  titleEl.textContent = `${label} (${pool.min}-${pool.max})`;
  metaEl.textContent = `Using ${eraDraws.length} draws under current rules (since ${pool.effectiveSince}). Excludes earlier draw formats.`;

  const scores = rankNumbers(draws, pool, field);
  renderScoreChart(canvas, scores, TOP_N);
  renderRankedTable(tableEl, scores, TOP_N);
}

function renderResults(draws: NormalizedDraw[]): void {
  if (draws.length === 0) {
    resultsSection.classList.add('hidden');
    emptyState.classList.remove('hidden');
    return;
  }

  resultsSection.classList.remove('hidden');
  emptyState.classList.add('hidden');

  renderPool(
    activeGame,
    'mainNumbers',
    draws,
    document.querySelector('#main-pool-title')!,
    document.querySelector('#main-pool-meta')!,
    document.querySelector('#main-pool-chart')!,
    document.querySelector('#main-pool-table')!
  );

  renderPool(
    activeGame,
    'bonusNumber',
    draws,
    document.querySelector('#bonus-pool-title')!,
    document.querySelector('#bonus-pool-meta')!,
    document.querySelector('#bonus-pool-chart')!,
    document.querySelector('#bonus-pool-table')!
  );
}

async function loadAndRender(): Promise<void> {
  syncStatus.textContent = 'Loading cached data…';
  const result = await loadCachedDraws(activeGame);
  syncStatus.textContent = formatSyncStatus(result, result.draws);
  renderResults(result.draws);
}

gameSelect.addEventListener('change', () => {
  const selected = games.find((g) => g.id === gameSelect.value);
  if (selected && selected.enabled) {
    activeGame = selected;
    void loadAndRender();
  }
});

syncBtn.addEventListener('click', async () => {
  syncBtn.disabled = true;
  syncStatus.textContent = 'Syncing with data.ny.gov…';
  try {
    const result = await syncGame(activeGame);
    syncStatus.textContent = formatSyncStatus(result, result.draws);
    renderResults(result.draws);
  } catch (err) {
    syncStatus.textContent = `Sync failed: ${err instanceof Error ? err.message : String(err)}`;
  } finally {
    syncBtn.disabled = false;
  }
});

void loadAndRender();
