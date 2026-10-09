import "./style.css";
import { megaMillions, powerball, type GameConfig } from "./games/registry";
import type { NormalizedDraw } from "./types/lottery";
import { loadCachedDraws, syncGame, type SyncResult } from "./data/sync";
import { rankNumbers, type NumberScore } from "./stats/probabilityScore";
import { selectPoolNumbers } from "./stats/eraFilter";
import { calculateSumStats } from "./stats/sumTotal";
import {
  getNextDrawInfo,
  formatCountdown,
  toEasternDateString,
} from "./stats/drawSchedule";
import { formatIsoDate, formatEasternDate } from "./utils/formatDate";
import { renderScoreChart } from "./charts/renderChart";
import { renderRankedTable } from "./ui/renderRankedList";
import { renderRecentDraws } from "./ui/renderRecentDraws";
import { renderColdNumbers } from "./ui/renderColdNumbers";
import { renderDataInsights } from "./ui/renderDataInsights";
import { calculateOddEvenDistribution } from "./stats/oddEven";
import { generateSuggestedCombinations } from "./stats/combinationGenerator";
import { renderSuggestedCombinations } from "./ui/renderSuggestedCombinations";

const TOP_N = 15;
const RECENT_DRAWS_COUNT = 15;
const games: GameConfig[] = [megaMillions, powerball];
let activeGame: GameConfig = megaMillions;
let latestCachedDrawDate: string | null = null;
let countdownTimer: ReturnType<typeof setInterval> | undefined;

const app = document.querySelector<HTMLDivElement>("#app")!;
app.innerHTML = `
  <header class="app-header">
    <h1 class="subtitle">Lottery Probability</h1>
    <p class="subtitle">Which numbers are statistically most likely to appear next?</p>
  </header>

  <section class="controls">
    <div class="controls-header">
      <div class="game-heading">
        <h2 id="game-title" class="game-title"></h2>
        <p id="sync-status" class="sync-status"></p>
      </div>
      <div class="next-draw" id="next-draw">
        <p class="next-draw-label" id="next-draw-label"></p>
        <p class="next-draw-countdown" id="next-draw-countdown"></p>
      </div>
    </div>
    <div class="controls-actions">
      <label for="game-select" class="sr-only">Game</label>
      <select id="game-select">
        ${games
          .map(
            (g) =>
              `<option value="${g.id}" ${g.enabled ? "" : "disabled"}>${g.name}${
                g.enabled ? "" : " (coming soon)"
              }</option>`,
          )
          .join("")}
      </select>
      <button id="sync-btn">Sync Latest Data</button>
    </div>
  </section>

  <section id="results" class="results hidden">
    <div class="results-row">
    <article class="pool-section results-row-grow">
      <div class="pool-section-header">
        <h2>Last ${RECENT_DRAWS_COUNT} Draws</h2>
        <button
          id="legend-toggle"
          type="button"
          class="legend-toggle"
          aria-expanded="false"
          aria-controls="draw-legend-panel"
          title="Show/hide color legend"
        >
          <span class="legend-toggle-track">
            <span class="legend-toggle-label legend-toggle-label-on">I</span>
            <span class="legend-toggle-label legend-toggle-label-off">O</span>
            <span class="legend-toggle-thumb"></span>
          </span>
          Legend
        </button>
      </div>
      <div id="draw-legend-panel" class="draw-legend-panel hidden">
        <ul class="draw-legend">
          <li><span class="legend-swatch legend-ball legend-ball-default"></span>No repeat</li>
          <li><span class="legend-swatch legend-ball draw-ball-repeat-1"></span>Repeats once in last ${RECENT_DRAWS_COUNT}</li>
          <li><span class="legend-swatch legend-ball draw-ball-repeat-2"></span>Repeats twice</li>
          <li><span class="legend-swatch legend-ball draw-ball-repeat-3"></span>Repeats 3+ times</li>
          <li><span class="legend-swatch legend-ball draw-ball-bonus"></span>Bonus ball (no repeat)</li>
          <li><span class="legend-swatch legend-ball draw-ball-bonus draw-ball-bonus-repeat-3"></span>Bonus ball, repeats 3+ times</li>
          <li><span class="legend-swatch legend-total"><span class="legend-z legend-z-high">+\u03c3</span></span>Total above era average</li>
          <li><span class="legend-swatch legend-total"><span class="legend-z legend-z-low">-\u03c3</span></span>Total below era average</li>
        </ul>
      </div>
      <div id="recent-draws"></div>
    </article>

    <aside class="pool-section results-row-side">
      <h2>Missing Main</h2>
     <!-- <p class="pool-meta">No appearance in the last ${RECENT_DRAWS_COUNT} draws.</p> -->
      <div id="cold-numbers"></div>
    </aside>
    </div>

    <article class="pool-section">
      <h2 id="main-pool-title"></h2>
      <p id="main-pool-meta" class="pool-meta"></p>
      <div class="chart-wrapper"><canvas id="main-pool-chart"></canvas></div>
      <div id="main-pool-table" class="ranked-table-scroll"></div>
    </article>

    <div class="results-row">
    <article class="pool-section results-row-grow">
      <h2 id="bonus-pool-title"></h2>
      <p id="bonus-pool-meta" class="pool-meta"></p>
      <div class="chart-wrapper"><canvas id="bonus-pool-chart"></canvas></div>
      <div id="bonus-pool-table" class="ranked-table-scroll"></div>
    </article>

    <aside class="pool-section results-row-side">
      <h2>Missing Mega</h2>
      <div id="cold-numbers-bonus"></div>
    </aside>
    </div>

    <article class="pool-section">
      <h2>Suggested Combinations</h2>
      <p id="suggested-combos-meta" class="pool-meta"></p>
      <div id="suggested-combos"></div>
    </article>

    <article class="pool-section">
      <h2>Data Insights</h2>
      <div class="insights-grid">
        <div class="insights-row">
          <div class="insight-card insights-row-grow">
            <h3>Odd / Even Split</h3>
            <p id="odd-even-meta" class="pool-meta"></p>
            <div class="chart-wrapper chart-wrapper-small"><canvas id="odd-even-chart"></canvas></div>
          </div>
          <div class="insight-card insights-row-grow">
            <h3>Ball Total (Sum)</h3>
            <p id="sum-total-meta" class="pool-meta"></p>
            <div class="chart-wrapper chart-wrapper-small"><canvas id="sum-total-chart"></canvas></div>
          </div>
        </div>
        <div class="insights-row">
          <div class="insight-card insights-row-grow">
            <h3>Top Pairs</h3>
            <p id="top-pairs-meta" class="pool-meta"></p>
            <table class="top-pairs-table">
              <thead>
                <tr><th>#</th><th>Pair</th><th>Count</th></tr>
              </thead>
              <tbody id="top-pairs-body"></tbody>
            </table>
          </div>
          <div class="insight-card insights-row-fixed">
            <h3>Pair Network</h3>
            <p id="pair-network-meta" class="pool-meta"></p>
            <div class="heatmap-wrapper">
              <canvas id="pair-network-chart"></canvas>
            </div>
          </div>
        </div>
        <div class="insight-card insight-card--wide">
          <h3>Pair Bubble Chart</h3>
          <p id="pair-bubble-meta" class="pool-meta"></p>
          <div class="chart-wrapper chart-wrapper-large"><canvas id="pair-bubble-chart"></canvas></div>
        </div>
        <div class="insight-card insight-card--wide">
          <h3>Number Pair Heatmap</h3>
          <p id="pair-heatmap-meta" class="pool-meta"></p>
          <div class="heatmap-wrapper">
            <canvas id="pair-heatmap-chart"></canvas>
          </div>
        </div>
      </div>
    </article>
  </section>

  <div id="pair-heatmap-tooltip" class="heatmap-tooltip"></div>

  <section id="empty-state" class="empty-state">
    <p>No data cached yet for ${activeGame.name}. Click "Sync latest data" to fetch the official draw history.</p>
  </section>
`;

const gameTitle = document.querySelector<HTMLHeadingElement>("#game-title")!;
const gameSelect = document.querySelector<HTMLSelectElement>("#game-select")!;
const syncBtn = document.querySelector<HTMLButtonElement>("#sync-btn")!;
const syncStatus =
  document.querySelector<HTMLParagraphElement>("#sync-status")!;
const resultsSection = document.querySelector<HTMLElement>("#results")!;
const emptyState = document.querySelector<HTMLElement>("#empty-state")!;
const nextDrawLabel =
  document.querySelector<HTMLParagraphElement>("#next-draw-label")!;
const nextDrawCountdown = document.querySelector<HTMLParagraphElement>(
  "#next-draw-countdown",
)!;
const legendToggle =
  document.querySelector<HTMLButtonElement>("#legend-toggle")!;
const legendPanel = document.querySelector<HTMLElement>("#draw-legend-panel")!;

function updateCountdown(): void {
  const { nextDraw, lastScheduledDraw } = getNextDrawInfo(
    activeGame.drawSchedule,
  );
  const lastScheduledDateStr = toEasternDateString(lastScheduledDraw);
  const isSynced =
    latestCachedDrawDate !== null &&
    latestCachedDrawDate >= lastScheduledDateStr;

  if (isSynced) {
    nextDrawLabel.textContent = `Next Draw: ${formatEasternDate(nextDraw)}`;
    nextDrawCountdown.textContent = formatCountdown(
      nextDraw.getTime() - Date.now(),
    );
    nextDrawCountdown.classList.remove("next-draw-countdown--overdue");
  } else {
    nextDrawLabel.textContent = `Draw pending sync (${formatEasternDate(lastScheduledDraw)})`;
    nextDrawCountdown.textContent = `+${formatCountdown(Date.now() - lastScheduledDraw.getTime())}`;
    nextDrawCountdown.classList.add("next-draw-countdown--overdue");
  }
}

function startCountdown(): void {
  if (countdownTimer) clearInterval(countdownTimer);
  updateCountdown();
  countdownTimer = setInterval(updateCountdown, 1000);
}

function formatSyncStatus(result: SyncResult, draws: NormalizedDraw[]): string {
  if (draws.length === 0) return "No data cached yet.";
  const latest = draws[draws.length - 1]?.drawDate;
  const newPart =
    result.newDrawCount > 0 ? ` (+${result.newDrawCount} new)` : "";
  return `${draws.length} draws cached${newPart} • latest: ${latest ? formatIsoDate(latest) : "n/a"}`;
}

function renderPool(
  game: GameConfig,
  field: "mainNumbers" | "bonusNumber",
  draws: NormalizedDraw[],
  titleEl: HTMLElement,
  metaEl: HTMLElement,
  canvas: HTMLCanvasElement,
  tableEl: HTMLElement,
): NumberScore[] {
  const pool = field === "mainNumbers" ? game.mainPool : game.bonusPool;
  const label = field === "mainNumbers" ? "Main Numbers" : game.bonusName;
  const eraDraws = selectPoolNumbers(draws, pool, field);

  titleEl.textContent = `${label} (${pool.min}-${pool.max})`;
  metaEl.textContent = `Using ${eraDraws.length} draws under current rules (since ${formatIsoDate(pool.effectiveSince)}). Excludes earlier draw formats.`;

  const scores = rankNumbers(draws, pool, field);
  renderScoreChart(canvas, scores, TOP_N);
  // Both pools now show their complete ranked list (scrollable), rather
  // than trimming to the top N.
  renderRankedTable(tableEl, scores, scores.length);
  return scores;
}

function renderResults(draws: NormalizedDraw[]): void {
  latestCachedDrawDate =
    draws.length > 0 ? draws[draws.length - 1].drawDate : null;
  startCountdown();

  if (draws.length === 0) {
    resultsSection.classList.add("hidden");
    emptyState.classList.remove("hidden");
    return;
  }

  resultsSection.classList.remove("hidden");
  emptyState.classList.add("hidden");

  const eraMainNumbers = selectPoolNumbers(
    draws,
    activeGame.mainPool,
    "mainNumbers",
  );
  const sumStats = calculateSumStats(eraMainNumbers);

  renderRecentDraws(
    document.querySelector("#recent-draws")!,
    activeGame,
    draws,
    RECENT_DRAWS_COUNT,
    sumStats,
  );

  renderColdNumbers(
    document.querySelector("#cold-numbers")!,
    activeGame.mainPool,
    "mainNumbers",
    draws,
    RECENT_DRAWS_COUNT,
  );

  renderColdNumbers(
    document.querySelector("#cold-numbers-bonus")!,
    activeGame.bonusPool,
    "bonusNumber",
    draws,
    RECENT_DRAWS_COUNT,
  );

  const mainScores = renderPool(
    activeGame,
    "mainNumbers",
    draws,
    document.querySelector("#main-pool-title")!,
    document.querySelector("#main-pool-meta")!,
    document.querySelector("#main-pool-chart")!,
    document.querySelector("#main-pool-table")!,
  );

  const bonusScores = renderPool(
    activeGame,
    "bonusNumber",
    draws,
    document.querySelector("#bonus-pool-title")!,
    document.querySelector("#bonus-pool-meta")!,
    document.querySelector("#bonus-pool-chart")!,
    document.querySelector("#bonus-pool-table")!,
  );

  const oddEvenGroups = calculateOddEvenDistribution(
    eraMainNumbers,
    activeGame.mainPool.count,
  );
  const suggestedCombos = generateSuggestedCombinations(
    mainScores,
    bonusScores,
    oddEvenGroups,
    sumStats,
    activeGame.mainPool.count,
  );
  renderSuggestedCombinations(
    document.querySelector("#suggested-combos")!,
    suggestedCombos,
  );
  const allowedSplitsLabel = [...oddEvenGroups]
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, 2)
    .map((g) => `${g.oddCount}/${g.evenCount}`)
    .join(" or ");
  const sumMin = Math.round(sumStats.mean - sumStats.stdDev);
  const sumMax = Math.round(sumStats.mean + sumStats.stdDev);
  document.querySelector("#suggested-combos-meta")!.textContent =
    `Candidates drawn from the top-scoring numbers, keeping only combos with an ${allowedSplitsLabel} odd/even split and a sum between ${sumMin}-${sumMax} (the historically common range). A statistical heuristic, not a prediction - every combination remains equally random in an actual draw.`;

  renderDataInsights(
    document.querySelector("#odd-even-chart")!,
    document.querySelector("#odd-even-meta")!,
    document.querySelector("#sum-total-chart")!,
    document.querySelector("#sum-total-meta")!,
    document.querySelector("#top-pairs-body")!,
    document.querySelector("#top-pairs-meta")!,
    document.querySelector("#pair-network-chart")!,
    document.querySelector("#pair-network-meta")!,
    document.querySelector("#pair-bubble-chart")!,
    document.querySelector("#pair-bubble-meta")!,
    document.querySelector("#pair-heatmap-chart")!,
    document.querySelector("#pair-heatmap-meta")!,
    document.querySelector("#pair-heatmap-tooltip")!,
    eraMainNumbers,
    activeGame.mainPool.count,
    activeGame.mainPool,
  );
}

async function loadAndRender(): Promise<void> {
  gameTitle.textContent = activeGame.name;
  syncStatus.textContent = "Loading cached data…";
  const result = await loadCachedDraws(activeGame);
  syncStatus.textContent = formatSyncStatus(result, result.draws);
  renderResults(result.draws);
}

gameSelect.addEventListener("change", () => {
  const selected = games.find((g) => g.id === gameSelect.value);
  if (selected && selected.enabled) {
    activeGame = selected;
    void loadAndRender();
  }
});

legendToggle.addEventListener("click", () => {
  const isOpen = legendToggle.getAttribute("aria-expanded") === "true";
  legendToggle.setAttribute("aria-expanded", String(!isOpen));
  legendPanel.classList.toggle("hidden", isOpen);
  legendToggle.classList.toggle("legend-toggle--on", !isOpen);
});

syncBtn.addEventListener("click", async () => {
  syncBtn.disabled = true;
  syncStatus.textContent = "Syncing with data.ny.gov…";
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
