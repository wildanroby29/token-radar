# Token Radar (token-radar-01) — Clean Rebuild Report

Clean rebuild for Tem, built from the starter in `~/workspace/token-radar/entry-clean/`
(a fresh directory; the earlier draft in `~/workspace/token-radar/entry/` was left
untouched and used only as the specification). Target: top 5.
**Not submitted.** No GitHub repo, no Solana keypair, no make.fun command was run.
Deadline: 2026-12-14 10:00 UTC (17:00 WIB).

## Files changed vs the starter

| File | Change |
|---|---|
| `lib/model.ts` | Rewritten: fitted-comps model (radar-2), tightened rankable rule, 190-row board, launch odds by age counted from the snapshot, costed farm verdicts, ledger strip, held-out evidence computed at run time |
| `dashboard/app.js` | Rewritten: KPI strip, ledger strip, evidence + odds tables, top-5 spotlight, model sandbox (exponent + scale sliders), sortable/filterable table (category, chain, search), detail drawer with $1k/$10k toggle, live-token view, methodology footer, deep links (`#detail=<slug>`, `#category=<name>`) |
| `dashboard/app.css` | Rewritten: dark navy (`#081426`) + lime (`#b8f135`), high contrast, larger type (16px base, 34px H1) |
| `dashboard/index.html` | Rewritten: static skeleton for the sections above (was an empty `<main>`) |
| `screenshots/` | 3 new real screenshots rendered from `out/dashboard` with headless Chromium (Playwright) |
| `main.ts`, `LICENSE`, `vendor/makefun-board.ts` | Unchanged. `vendor/makefun-board.ts` is byte-identical to the starter (sha256 `9ca51b6e5cd84fe46cb0efa61e2ea99365a1fb0e21f2b75e6007f977f0dc326e`) |

## Model: radar-2, fitted comps

Fitted from the snapshot itself — the 128 protocols whose token already trades
(market cap > 0, TVL > 0). The fit is recomputed from the snapshot on every run;
the numbers below are what the run produced:

```
log10(market cap) = 3.0247 + 0.5223 * log10(TVL)
implied value     = 10^3.0247 * TVL^0.5223
```

Growth and age are shown per row as context only; they do not move the number.
Adding 7-day growth, age, or chain count each made both held-out tests worse in
the earlier analysis, so the curve is size alone.

### Term tests, 2026-11-20 (maximization round — no term survived)

Candidates were tested with the same discipline: a term is kept only if it lowers
**both** the leave-one-out miss and the walk-forward miss (fit before 2024-12-19,
test after; 63 train / 32 test). All terms use the snapshot's own fields only.

| Term | Leave-one-out | Walk-forward | Verdict |
|---|---|---|---|
| **Size only (kept)** | **×3.40** | **×2.88** | **kept** |
| + per-category intercepts (Dexs 11, Lending 15 traded; smaller categories fall back to the global intercept) | ×3.68 | ×2.75 | rejected — LOO worse |
| + sibling indicator (shares a first-word name stem with another protocol that records a token; 8 of 128 traded, 19 of 342 pre-token) | ×3.30 | ×3.16 | rejected — WF worse |
| + log age (log10 days since listed_at; missing listed_at imputed with the training median; 33 of 128 traded have no listed_at) | ×3.42 | ×9.15 | rejected — WF collapses |
| + category + sibling | ×3.57 | ×2.72 | rejected — LOO worse |
| + category + log age | ×3.63 | ×10.70 | rejected |
| + sibling + log age | ×3.29 | ×9.96 | rejected |
| + all three | ×3.53 | ×9.91 | rejected |

Why log age breaks walk-forward: its slope fit on the pre-cutoff tokens is +1.53
(vs −0.15 on the full set), and the post-cutoff test tokens' log-age range
(1.90–2.84) lies entirely below the training range (2.87–3.27), so the term
extrapolates catastrophically. The sibling indicator is too sparse to estimate
(2 positives in walk-forward train, 1 in test). The model stays the size-only
curve; the board, top 5 and total implied value are unchanged.

### Dashboard additions, 2026-11-20

- **Fit scatter** (evidence section): a static SVG of the 128 traded tokens,
  log10 TVL vs log10 market cap, with the fitted curve line and the equation in
  the caption. No network, no library. The 128 points ride in `data.js`
  (`fit_points`, added to `RadarData` in `lib/model.ts`); `main.ts` itself is
  untouched. One fix during visual checking: the last x-axis tick label was
  clipped at the SVG edge, so end ticks are now end-anchored.
- **Verdict toggle** (above the board table): $1,000 / $10,000 buttons that
  switch the Verdict column and its header label between the per-row
  `verdict_1k` and `verdict_10k` already computed. Default stays $1,000.
  Verified live: Polymarket International flips SKIP → MARGINAL, header becomes
  "Verdict ($10,000)", 190 rows still shown. The detail drawer keeps its own
  $1k/$10k toggle, unchanged.
- Evidence note and methodology footer now name the new term tests and their
  numbers. Base type and layout unchanged; nothing was densified.

### Held-out evidence (128 traded tokens, recomputed in the model)

| Model | Leave-one-out miss | Walk-forward miss | P25–P75 holds | P10–P90 holds |
|---|---|---|---|---|
| **log-log size only (kept)** | **×3.40** | **×2.88** | **50% LOO / 53% WF** | **80% LOO / 75% WF** |
| Flat 0.25× TVL | ×4.91 | — | — | — |

Walk-forward = fit on tokens listed before 2024-12-19 (63 tokens), test on the 32
listed after. Miss = median factor between predicted and true market cap. Interval
holds use the nearest-rank quantiles of each held-out fit's own residuals, so the
percentages differ by a point or two from other quantile conventions — the misses
(×3.40 / ×2.88) are the stable headline figures.

### Launch odds by age (share of protocols that record a token, counted from the snapshot)

| Age bucket | Protocols | Share with a token |
|---|---|---|
| <180d | 87 | 26% |
| 180–364d | 73 | 40% |
| 365–729d | 183 | 38% |
| 730–1094d | 139 | 55% |
| ≥1095d | 163 | 79% |
| Age unknown | 113 | 79% |

"Records a token" = market cap, CoinGecko id or symbol is set (416 of 758, 55%
overall). Leave-one-out Brier score 0.21, vs 0.25 for the overall rate alone.

### Farm verdicts

Farmer pool = implied value × launch odds × 5%. Expected value = pool × deposit / TVL.
Fees $15 of gas; hours = 0.5 setup + one 10-minute action a week over the hold window
(60 days if age < 180, 45 if < 365, else 30) + 0.25 claiming.
FARM needs net $25/hour, MARGINAL $8/hour, THIN $0/hour, else SKIP.
At a $1,000 deposit: **180 SKIP, 10 THIN, 0 MARGINAL, 0 FARM** — the board says so
honestly. At $10,000 the same rows re-price: 8 SKIP, 29 THIN, 51 MARGINAL, 102 FARM
(toggle in the detail drawer).

## Board

- **190 rows**: 40 watchlist (40/40 covered) + 130 strongest rankable below the $50M
  floor + 20 strongest rankable above the floor that the watchlist leaves out.
- Rankable is tightened vs the starter: pre-token, not a CEX, not a versioned pool name,
  not a Bridge / Liquid Staking / wrapped or staked product of a token that already
  trades (WBTC, Binance staked ETH and the bridges would otherwise rank #1–#5 on size alone).
- Total implied value: **$2,243,851,082**. Live-token view: top 24 by market cap, set aside.
- Ledger strip accounts for all **758** protocols: ranked 190, token on record 416,
  CEX 42, versioned name 11, bridge 43, liquid staking / restaking 43, wrapped / staked
  product 5, set aside (rankable, not selected) 8.

### Top 10 rows

| Rank | Protocol | TVL | Implied value | Launch odds | Verdict ($1k) |
|---|---|---|---|---|---|
| 1 | Sentora Curator | $2,757,585,593 | $90,185,322 | 38% | SKIP |
| 2 | Steakhouse Financial | $2,753,981,495 | $90,123,744 | 38% | SKIP |
| 3 | Gauntlet | $1,577,685,462 | $67,372,395 | 38% | SKIP |
| 4 | Veda | $1,563,415,482 | $67,053,449 | 38% | SKIP |
| 5 | USDD | $1,055,793,606 | $54,623,215 | 38% | SKIP |
| 6 | Nonce Capital | $513,783,671 | $37,498,445 | 26% | SKIP |
| 7 | Upshift | $499,083,733 | $36,934,236 | 38% | SKIP |
| 8 | Bittensor dTAO | $376,026,255 | $31,857,657 | 26% | SKIP |
| 9 | Polymarket International | $320,193,439 | $29,292,517 | 79% | SKIP |
| 10 | OnRe | $308,882,355 | $28,747,445 | 38% | SKIP |

## Gate verification (run 2026-11-20)

```
$ MAKEFUN_OUTPUT_DIR=out node main.ts --input ../token-radar-01-kit/input/snapshot.json
token radar: 758 protocols, 40 on the watchlist, 190 rows scored (150 early, 24 live set aside)
token radar: wrote out/board.json, out/data.js, out/dashboard (3 files), out/screenshots (3 images) and out/dossier.json
exit 0
```

- `board.json`: 190 rows, ranks 1..190, sorted by implied value descending, 40/40
  watchlist, 6 farm steps per row, every step 20–600 chars. `boardIssue` returns null (exit 0).
  Total implied value **$2,243,851,082** (unchanged — the model did not change).
  Verdicts at $1,000: 180 SKIP / 10 THIN / 0 MARGINAL / 0 FARM; at $10,000:
  8 SKIP / 29 THIN / 51 MARGINAL / 102 FARM.
- Screenshots (re-rendered 2026-11-20 from the actual `out/dashboard` with Playwright
  headless Chromium, stock Chromium from the Playwright cache — the VM's bundled
  Chromium refuses to start without a Hatch WebGL domain-policy file; the dashboard
  itself uses no WebGL):
  `1-board.png` 1440×900, 146 KiB (Top 5 spotlight, sandbox, filters, the new
  $1,000/$10,000 toggle, table head); `2-detail.png` 1440×900, 245 KiB (Sentora
  Curator drawer, SKIP at $1k, break-even $23,981); `3-filtered.png` 1440×900, 188 KiB
  (Dexs filter, 20 rows shown) — all PNG, all under the 512 KiB cap, long side 1440,
  short side 900. Visually checked: all three readable, Top 5 visible, drawer and
  filter working, toggle visible. The scatter was checked in a separate render:
  128 dots, fitted curve line, axes labelled $1M–$100B (TVL) and $10K–$10B
  (market cap), equation in the caption. Toggle interaction verified live in the
  browser (SKIP → MARGINAL on Polymarket International).
- `dossier.json`: schema `makefun/dossier/v1`, 3 images, 32,673 bytes of text
  (cap 65,536). Dashboard: 3 files, 32,306 bytes total (cap 400 files / 4 MiB).
  `data.js` 271,528 bytes (now carries the 128 fit points).
- `vendor/makefun-board.ts` sha256 still
  `9ca51b6e5cd84fe46cb0efa61e2ea99365a1fb0e21f2b75e6007f977f0dc326e` (unchanged).
- `main.ts` untouched (authored header comment intact).

## What remains before a real submit (NOT done)

1. A public GitHub repository owned by Tem, created after the competition opened, with
   this entry as its content (main.ts at root, OSI-approved licence).
2. A Solana wallet / keypair for the make.fun account, to sign in and to claim USDC if it places.
3. Bundle the transcripts of this rebuild session with the kit's CLI
   (`node cli/makefun.mjs bundle`) and attach the usage rows (`bundle --muse-usage`);
   this rebuild was done inside a recorded Muse app session, which the competition's
   requirements list as a recorded harness — but the bundle must be produced and checked
   before submitting.
4. Run the kit's `check` (not submit) from the repo to confirm the gate passes on make.fun's side.
5. Submit before 2026-12-14 10:00 UTC. At most 5 submissions a day, 10 in all; the last
   submission before the deadline is the final entry.
