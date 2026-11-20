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
- Screenshots (rendered from the actual `out/dashboard` with Playwright headless Chromium,
  stock Chromium from the Playwright cache — the VM's bundled Chromium refuses to start
  without a Hatch WebGL domain-policy file; the dashboard itself uses no WebGL):
  `1-board.png` 1440×900, 160 KiB; `2-detail.png` 1440×900, 245 KiB (Sentora Curator
  drawer, SKIP at $1k, break-even $23,981); `3-filtered.png` 1440×900, 188 KiB
  (Dexs filter, 20 rows shown) — all PNG, all under the 512 KiB cap, long side 1440,
  short side 900. Visually checked: all three readable, Top 5 visible, drawer and
  filter working.
- `dossier.json`: schema `makefun/dossier/v1`, 3 images, 27,451 bytes of text
  (cap 65,536). Dashboard: 3 files, 27,185 bytes total (cap 400 files / 4 MiB).
- `data.js` carries the full evidence, odds table, ledger, verdict counts and the
  6-step farm plan per row, so the dashboard and board.json agree.

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
