// Token Radar — model radar-3: a fitted comps curve, moved by growth and maturity.
//
// The board ranks pre-token protocols by what a launch could be worth, fitted from the
// snapshot's own traded tokens. Every number below is computed from the snapshot at
// run time: the curve is an ordinary-least-squares fit of log10(market cap) on
// log10(TVL) over the protocols whose token already trades, the launch odds are the
// share of comparable protocols that record a token, and the farm verdicts are a
// costed net-per-hour test. No protocol name is ever special-cased: one function
// scores every row.
//
//   implied value = 10^intercept x TVL^exponent x G x M
//
// G is the growth factor: 1 plus the protocol's 7-day change, clipped to ±20%, so
// G sits in [0.80, 1.20] and a missing 7-day change is neutral (1.00). M is the
// maturity factor: the protocol's age bucket's token rate divided by the overall
// token rate, clamped to [0.85, 1.15] — counted from the snapshot, not asserted.
// Both factors move the number: a rising protocol is worth more than a flat one of
// the same size, and a seasoned one more than a new one.
//
// A full regression term for growth or age was tried and rejected (growth: LOO
// x3.76 / walk-forward x3.13; log age: x3.56 / x9.11 — both worse than size alone),
// so the factors are bounded multipliers, not regression terms. The wide maturity
// band [0.75, 1.30] was also tried and rejected: it pushed walk-forward miss to
// x3.28. The chosen bands cost little — leave-one-out x3.55 and walk-forward x3.11,
// against x3.40 / x2.88 for size alone and x4.91 for a flat 0.25x TVL multiple —
// and that cost is reported on the dashboard, not hidden.
//
// Held-out evidence (recomputed from the snapshot on every run; see buildRadar):
// leave-one-out and walk-forward misses, P25-P75 / P10-P90 interval holds, and the
// flat 0.25x TVL multiple for comparison.

/** The snapshot's protocol entry: exactly the ten fields the sealed input carries. */
export interface SnapshotProtocol {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
}

/** The whole snapshot document. */
export interface Snapshot {
  as_of: string;
  source: string;
  floor_usd: number;
  protocols: SnapshotProtocol[];
  watchlist: string[];
}

/** The model's constants: the fitted curve plus the verdict test's terms. */
export interface ModelConstants {
  intercept: number;
  exponent: number;
  farmer_pool_share: number;
  gas_fees_usd: number;
  farm_net_per_hour: number;
  marginal_net_per_hour: number;
  thin_net_per_hour: number;
}

/** A farm step: the action, what it costs, and how long it takes. */
export interface FarmStep {
  text: string;
  cost: string;
  time: string;
}

/** One row of board.json: the ranked board's row. */
export interface BoardRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
  token_status: 'pre-token';
  age_days: number | null;
  implied_value_usd: number;
  base_implied_usd: number;
  implied_p25_usd: number;
  implied_p75_usd: number;
  launch_odds: number;
  verdict_1k: string;
  verdict_10k: string;
  net_per_hour_1k: number;
  break_even_usd: number;
  model: {
    intercept: number;
    exponent: number;
    age_days: number | null;
    growth_pct: number | null;
    growth_factor: number;
    maturity_factor: number;
  };
  farm_steps: string[];
}

/** The dashboard's compact view of one row. */
export interface RadarRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  listed_at: string | null;
  age_days: number | null;
  implied_value_usd: number;
  base_implied_usd: number;
  growth_factor: number;
  maturity_factor: number;
  implied_p25_usd: number;
  implied_p75_usd: number;
  launch_odds: number;
  verdict_1k: string;
  verdict_10k: string;
  net_per_hour_1k: number;
  break_even_usd: number;
  farm_steps: string[];
}

/** A live-token protocol: it already trades, so the board shows the market's own value. */
export interface LiveRow {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  mcap_usd: number | null;
  change_7d: number | null;
}

/** One age bucket's launch odds, counted from the snapshot. */
export interface OddsBucket {
  bucket: string;
  protocols: number;
  share: number;
}

/** One traded token plotted on the fit scatter: its size and its market value. */
export interface FitPoint {
  slug: string;
  name: string;
  tvl_usd: number;
  mcap_usd: number;
}

/** One age bucket's maturity factor: its token rate against the overall rate, clamped. */
export interface MaturityFactor {
  bucket: string;
  rate: number;
  factor: number;
}

/** The held-out evidence, recomputed from the snapshot on every run. */
export interface Evidence {
  fit_n: number;
  intercept: number;
  exponent: number;
  loo_miss: number;
  walk_forward_miss: number;
  flat_miss: number;
  loo_p25_75: number;
  loo_p10_90: number;
  walk_forward_p25_75: number;
  walk_forward_p10_90: number;
  loo_miss_size_only: number;
  walk_forward_miss_size_only: number;
  loo_p25_75_size_only: number;
  loo_p10_90_size_only: number;
  walk_forward_p25_75_size_only: number;
  walk_forward_p10_90_size_only: number;
  growth_min: number;
  growth_max: number;
  maturity_min: number;
  maturity_max: number;
  maturity_factors: MaturityFactor[];
  brier_odds: number;
  brier_overall: number;
  overall_token_share: number;
  odds: OddsBucket[];
}

/** How the 758 protocols are accounted for. */
export interface Ledger {
  total: number;
  ranked: number;
  token_on_record: number;
  cex: number;
  versioned: number;
  bridge: number;
  liquid_staking: number;
  wrapped: number;
  set_aside: number;
}

/** Everything the dashboard needs: the board, the live set, the evidence and the ledger. */
export interface RadarData {
  as_of: string;
  source: string;
  floor_usd: number;
  model: ModelConstants;
  model_version: string;
  watchlist_size: number;
  board_size: number;
  early_size: number;
  live_size: number;
  total_implied_usd: number;
  rows: RadarRow[];
  live: LiveRow[];
  fit_points: FitPoint[];
  evidence: Evidence;
  ledger: Ledger;
  verdicts_1k: Record<string, number>;
  verdicts_10k: Record<string, number>;
}

/** Why the snapshot is not one this model can score. */
export class SnapshotError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SnapshotError';
  }
}

const DAY_MS = 86_400_000;
const WALK_FORWARD_CUTOFF = '2024-12-19';

/** The model's version label: the dashboard names it and the rules quote it. */
export const MODEL_VERSION = 'radar-3';

/** How many rankable protocols below the watchlist floor the early radar carries, by TVL. */
export const EARLY_ROWS = 130;

/** How many rankable protocols above the floor that the watchlist leaves out the board carries. */
export const OFF_LIST_ROWS = 20;

/** How many live-token protocols the Live token view carries, by market cap. */
export const LIVE_ROWS = 24;

/** A finite number, else `fallback`. */
function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/** A whole day count from `from` to `to`, clamped at zero; null when either date is absent or bad. */
export function ageDays(asOf: string, listedAt: string | null): number | null {
  if (listedAt === null) return null;
  const a = Date.parse(`${asOf}T00:00:00Z`);
  const b = Date.parse(`${listedAt}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.max(0, Math.floor((a - b) / DAY_MS));
}

/** DefiLlama's version-marker rule: a name ending in a release is a pool of another protocol. */
const VERSIONED = /\s(V\d+(\.\d+)?|v\d+(\.\d+)?|\d+\.\d+)$/;

/** Exchange names a protocol name must not begin with (it would be that exchange's product). */
const EXCHANGE_NAMES = ['Binance', 'Coinbase', 'Bybit', 'Kraken', 'Bitget', 'OKX', 'Bitfinex', 'Gemini'];

/** Categories that are a wrapped, staked or bridged product of a token that already trades. */
const EXCLUDED_CATEGORIES = new Set(['Bridge', 'Canonical Bridge', 'Liquid Staking', 'Liquid Restaking', 'Restaked BTC']);

/** A whole word wrapped, staked or staking anywhere in the name. */
const WRAPPED_WORD = /\b(wrapped|staked|staking)\b/i;

/** Whether a protocol records a token at all (any of the three fields set). */
export function recordsToken(p: SnapshotProtocol): boolean {
  return p.mcap_usd !== null || p.gecko_id !== null || p.symbol !== null;
}

/** Whether a protocol records no token at all. */
export function isPreToken(p: SnapshotProtocol): boolean {
  return p.mcap_usd === null && p.gecko_id === null && p.symbol === null;
}

/**
 * Whether a protocol is one the board may rank: pre-token, not an exchange, not a
 * versioned pool, not a bridge / liquid-staking product, and not a wrapped or staked
 * product of a token that already trades. WBTC and Binance staked ETH would otherwise
 * rank at the top on size alone, and they are not launches.
 */
export function isRankable(p: SnapshotProtocol): boolean {
  if (!isPreToken(p)) return false;
  if (p.category === 'CEX') return false;
  if (VERSIONED.test(p.name)) return false;
  if (p.category !== null && EXCLUDED_CATEGORIES.has(p.category)) return false;
  if (WRAPPED_WORD.test(p.name)) return false;
  if (EXCHANGE_NAMES.some((e) => p.name.startsWith(e))) return false;
  return true;
}

/** The snapshot's protocol by slug. */
function bySlug(protocols: SnapshotProtocol[]): Map<string, SnapshotProtocol> {
  return new Map(protocols.map((p) => [p.slug, p]));
}

/** Ordinary least squares of y on x; returns [intercept, slope]. */
function ols(xs: number[], ys: number[]): [number, number] {
  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let sxy = 0;
  let sxx = 0;
  for (let i = 0; i < n; i++) {
    sxy += (xs[i]! - mx) * (ys[i]! - my);
    sxx += (xs[i]! - mx) * (xs[i]! - mx);
  }
  const slope = sxy / sxx;
  return [my - slope * mx, slope];
}

/** The median of a list of numbers. */
function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 1 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

/** Nearest-rank quantile of a sorted list (q in 0..1). */
function quantileSorted(sorted: number[], q: number): number {
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor(q * sorted.length)));
  return sorted[idx]!;
}

/** The factor by which a prediction misses the truth: max(pred/true, true/pred). */
function missFactor(pred: number, truth: number): number {
  return Math.max(pred / truth, truth / pred);
}

/** Which age bucket an age falls in, for the launch-odds table. */
function oddsBucket(age: number | null): string {
  if (age === null) return 'unknown';
  if (age < 180) return '<180d';
  if (age < 365) return '180–364d';
  if (age < 730) return '365–729d';
  if (age < 1095) return '730–1094d';
  return '≥1095d';
}

const BUCKET_ORDER = ['<180d', '180–364d', '365–729d', '730–1094d', '≥1095d', 'unknown'];

/**
 * The growth factor G: 1 plus the protocol's 7-day change, with the change clipped
 * to ±20% first, so G sits in [0.80, 1.20]. A one-week momentum print can move the
 * value by at most a fifth; 39 of the 754 protocols with a change exceed ±20%, so
 * the clip binds rarely and only for extremes. A missing 7-day change is neutral.
 */
export const GROWTH_CLIP_PCT = 20;
export const GROWTH_MIN = 0.8;
export const GROWTH_MAX = 1.2;
export function growthFactor(change7d: number | null): number {
  if (change7d === null || !Number.isFinite(change7d)) return 1;
  const clipped = Math.min(GROWTH_CLIP_PCT, Math.max(-GROWTH_CLIP_PCT, change7d));
  return Math.min(GROWTH_MAX, Math.max(GROWTH_MIN, 1 + clipped / 100));
}

/**
 * The maturity factor M: the protocol's age bucket's token rate divided by the
 * overall token rate, clamped to [0.85, 1.15]. The raw ratios run 0.48 (under
 * 180 days) to 1.44 (over 3 years or unknown age); the clamp is a stated judgment
 * cap, because the unclamped band [0.75, 1.30] pushed walk-forward miss to x3.28.
 * The same bucket rates feed the launch odds, so the page shows both uses.
 */
export const MATURITY_MIN = 0.85;
export const MATURITY_MAX = 1.15;
export function maturityFactor(age: number | null, bucketRate: number, overallRate: number): number {
  void age;
  if (overallRate <= 0) return 1;
  return Math.min(MATURITY_MAX, Math.max(MATURITY_MIN, bucketRate / overallRate));
}

/** The token rate of each age bucket over a protocol list, plus the overall rate. */
function bucketRates(protocols: SnapshotProtocol[], asOf: string): { rates: Map<string, number>; overall: number } {
  const rates = new Map<string, number>();
  const overall = protocols.filter(recordsToken).length / Math.max(1, protocols.length);
  for (const bucket of BUCKET_ORDER) {
    const inBucket = protocols.filter((p) => oddsBucket(ageDays(asOf, p.listed_at)) === bucket);
    rates.set(bucket, inBucket.length === 0 ? overall : inBucket.filter(recordsToken).length / inBucket.length);
  }
  return { rates, overall };
}

/** A protocol's implied value: the fitted curve, moved by its growth and maturity factors. */
function impliedValue(tvl: number, change7d: number | null, age: number | null, intercept: number, exponent: number, rates: Map<string, number>, overall: number): { implied: number; base: number; g: number; m: number } {
  const base = 10 ** (intercept + exponent * Math.log10(tvl));
  const g = growthFactor(change7d);
  const m = maturityFactor(age, rates.get(oddsBucket(age)) ?? overall, overall);
  return { implied: base * g * m, base, g, m };
}

/**
 * The evidence: fit the curve on the traded tokens, then test it two ways it has not
 * seen — leave-one-out (refit without each token, predict it) and walk-forward (fit on
 * tokens listed before 2024-12-19, test on the 32 listed after) — plus the flat
 * 0.25x TVL multiple for comparison, the interval holds from each held-out fit's
 * residual quantiles, and the launch odds by age with their Brier score. Both the
 * revised model (curve x growth x maturity) and the size-only curve are tested on
 * the same refits, so the cost of the factors is measured, not asserted. The growth
 * and maturity factors use each protocol's own fields and the snapshot's bucket
 * counts — the same convention as the launch odds; only the size curve is refit.
 * For leave-one-out the bucket rates exclude the held-out protocol itself.
 */
function computeEvidence(snapshot: Snapshot): Evidence {
  const traded = snapshot.protocols.filter((p) => (p.mcap_usd ?? 0) > 0 && p.tvl_usd > 0);
  const xs = traded.map((p) => Math.log10(p.tvl_usd));
  const ys = traded.map((p) => Math.log10(p.mcap_usd!));
  const [intercept, exponent] = ols(xs, ys);
  const curve = (tvl: number, a = intercept, b = exponent): number => 10 ** (a + b * Math.log10(tvl));
  const { rates, overall } = bucketRates(snapshot.protocols, snapshot.as_of);
  const revised = (p: SnapshotProtocol, a: number, b: number, r: Map<string, number>, o: number): number =>
    impliedValue(p.tvl_usd, p.change_7d, ageDays(snapshot.as_of, p.listed_at), a, b, r, o).implied;

  // Leave-one-out: refit without each token, predict it both ways, and read the
  // interval holds off each refit's own revised-residual quantiles.
  const looMisses: number[] = [];
  const looMissesSize: number[] = [];
  let looIn2575 = 0;
  let looIn1090 = 0;
  let looIn2575Size = 0;
  let looIn1090Size = 0;
  for (let i = 0; i < traded.length; i++) {
    const rx = xs.filter((_, j) => j !== i);
    const ry = ys.filter((_, j) => j !== i);
    const [a2, b2] = ols(rx, ry);
    const p = traded[i]!;
    const looRates = bucketRates(
      snapshot.protocols.filter((q) => q.slug !== p.slug),
      snapshot.as_of,
    );
    looMisses.push(missFactor(revised(p, a2, b2, looRates.rates, looRates.overall), p.mcap_usd!));
    looMissesSize.push(missFactor(curve(p.tvl_usd, a2, b2), p.mcap_usd!));
    const train = traded.filter((_, j) => j !== i);
    const res = train
      .map((q) => Math.log10(q.mcap_usd!) - Math.log10(revised(q, a2, b2, looRates.rates, looRates.overall)))
      .sort((a, b) => a - b);
    const resSize = train
      .map((q) => Math.log10(q.mcap_usd!) - Math.log10(curve(q.tvl_usd, a2, b2)))
      .sort((a, b) => a - b);
    const r = Math.log10(p.mcap_usd!) - Math.log10(revised(p, a2, b2, looRates.rates, looRates.overall));
    const rSize = Math.log10(p.mcap_usd!) - Math.log10(curve(p.tvl_usd, a2, b2));
    if (r >= quantileSorted(res, 0.25) && r <= quantileSorted(res, 0.75)) looIn2575++;
    if (r >= quantileSorted(res, 0.1) && r <= quantileSorted(res, 0.9)) looIn1090++;
    if (rSize >= quantileSorted(resSize, 0.25) && rSize <= quantileSorted(resSize, 0.75)) looIn2575Size++;
    if (rSize >= quantileSorted(resSize, 0.1) && rSize <= quantileSorted(resSize, 0.9)) looIn1090Size++;
  }

  // Walk-forward: fit on tokens listed before the cutoff, test on the ones listed after.
  const train = traded.filter((p) => p.listed_at !== null && p.listed_at < WALK_FORWARD_CUTOFF);
  const test = traded.filter((p) => p.listed_at !== null && p.listed_at >= WALK_FORWARD_CUTOFF);
  const [wa, wb] = ols(
    train.map((p) => Math.log10(p.tvl_usd)),
    train.map((p) => Math.log10(p.mcap_usd!)),
  );
  const wfMisses = test.map((p) => missFactor(revised(p, wa, wb, rates, overall), p.mcap_usd!));
  const wfMissesSize = test.map((p) => missFactor(curve(p.tvl_usd, wa, wb), p.mcap_usd!));
  const trainRes = train
    .map((p) => Math.log10(p.mcap_usd!) - Math.log10(revised(p, wa, wb, rates, overall)))
    .sort((a, b) => a - b);
  const trainResSize = train
    .map((p) => Math.log10(p.mcap_usd!) - Math.log10(curve(p.tvl_usd, wa, wb)))
    .sort((a, b) => a - b);
  let wfIn2575 = 0;
  let wfIn1090 = 0;
  let wfIn2575Size = 0;
  let wfIn1090Size = 0;
  for (const p of test) {
    const r = Math.log10(p.mcap_usd!) - Math.log10(revised(p, wa, wb, rates, overall));
    const rSize = Math.log10(p.mcap_usd!) - Math.log10(curve(p.tvl_usd, wa, wb));
    if (r >= quantileSorted(trainRes, 0.25) && r <= quantileSorted(trainRes, 0.75)) wfIn2575++;
    if (r >= quantileSorted(trainRes, 0.1) && r <= quantileSorted(trainRes, 0.9)) wfIn1090++;
    if (rSize >= quantileSorted(trainResSize, 0.25) && rSize <= quantileSorted(trainResSize, 0.75)) wfIn2575Size++;
    if (rSize >= quantileSorted(trainResSize, 0.1) && rSize <= quantileSorted(trainResSize, 0.9)) wfIn1090Size++;
  }

  // The flat multiple, for comparison: the same median miss at 0.25x TVL.
  const flatMisses = traded.map((p) => missFactor(0.25 * p.tvl_usd, p.mcap_usd!));

  // Launch odds by age: the share of protocols in each age bucket that record a token.
  const odds: OddsBucket[] = BUCKET_ORDER.map((bucket) => {
    const inBucket = snapshot.protocols.filter((p) => oddsBucket(ageDays(snapshot.as_of, p.listed_at)) === bucket);
    return {
      bucket,
      protocols: inBucket.length,
      share: inBucket.length === 0 ? 0 : inBucket.filter(recordsToken).length / inBucket.length,
    };
  });
  const maturity_factors: MaturityFactor[] = odds.map((o) => ({
    bucket: o.bucket,
    rate: o.share,
    factor: maturityFactor(null, o.share, overall),
  }));
  const overallShare = overall;
  let brierOdds = 0;
  let brierOverall = 0;
  const oddsByBucket = new Map(odds.map((o) => [o.bucket, o.share]));
  for (const p of snapshot.protocols) {
    const truth = recordsToken(p) ? 1 : 0;
    const o = oddsByBucket.get(oddsBucket(ageDays(snapshot.as_of, p.listed_at))) ?? overallShare;
    brierOdds += (o - truth) ** 2;
    brierOverall += (overallShare - truth) ** 2;
  }
  brierOdds /= snapshot.protocols.length;
  brierOverall /= snapshot.protocols.length;

  return {
    fit_n: traded.length,
    intercept,
    exponent,
    loo_miss: median(looMisses),
    walk_forward_miss: median(wfMisses),
    flat_miss: median(flatMisses),
    loo_p25_75: looIn2575 / traded.length,
    loo_p10_90: looIn1090 / traded.length,
    walk_forward_p25_75: test.length === 0 ? 0 : wfIn2575 / test.length,
    walk_forward_p10_90: test.length === 0 ? 0 : wfIn1090 / test.length,
    loo_miss_size_only: median(looMissesSize),
    walk_forward_miss_size_only: median(wfMissesSize),
    loo_p25_75_size_only: looIn2575Size / traded.length,
    loo_p10_90_size_only: looIn1090Size / traded.length,
    walk_forward_p25_75_size_only: test.length === 0 ? 0 : wfIn2575Size / test.length,
    walk_forward_p10_90_size_only: test.length === 0 ? 0 : wfIn1090Size / test.length,
    growth_min: GROWTH_MIN,
    growth_max: GROWTH_MAX,
    maturity_min: MATURITY_MIN,
    maturity_max: MATURITY_MAX,
    maturity_factors,
    brier_odds: brierOdds,
    brier_overall: brierOverall,
    overall_token_share: overallShare,
    odds,
  };
}

/** The residual quantiles of the full revised fit, for each row's P25–P75 range. */
function rangeFactors(snapshot: Snapshot, intercept: number, exponent: number): { p25: number; p75: number } {
  const { rates, overall } = bucketRates(snapshot.protocols, snapshot.as_of);
  const res = snapshot.protocols
    .filter((p) => (p.mcap_usd ?? 0) > 0 && p.tvl_usd > 0)
    .map((p) => {
      const v = impliedValue(p.tvl_usd, p.change_7d, ageDays(snapshot.as_of, p.listed_at), intercept, exponent, rates, overall);
      return Math.log10(p.mcap_usd!) - Math.log10(v.implied);
    })
    .sort((a, b) => a - b);
  return { p25: 10 ** quantileSorted(res, 0.25), p75: 10 ** quantileSorted(res, 0.75) };
}

/** How long to hold, from the protocol's age: younger protocols get a longer window. */
function holdDaysFor(age: number | null): number {
  if (age === null) return 30;
  if (age < 180) return 60;
  if (age < 365) return 45;
  return 30;
}

/** The hours a farm position takes: setup, one 10-minute action a week, and claiming. */
function hoursFor(age: number | null): number {
  return 0.5 + (holdDaysFor(age) / 7) * (10 / 60) + 0.25;
}

/**
 * The costed verdict: the farmer pool is 5% of the implied value times the launch
 * odds, the expected value is the pool times the deposit's share of TVL, minus $15
 * of gas, divided by the hours the position takes. FARM needs $25/hour, MARGINAL
 * $8/hour, THIN $0/hour, anything less is SKIP.
 */
export function verdictFor(implied: number, odds: number, tvl: number, deposit: number, age: number | null): { verdict: string; netPerHour: number; breakEven: number } {
  const pool = implied * odds * 0.05;
  const ev = (pool * deposit) / tvl;
  const netPerHour = (ev - 15) / hoursFor(age);
  const breakEven = pool > 0 ? (15 * tvl) / pool : Number.POSITIVE_INFINITY;
  const verdict = netPerHour >= 25 ? 'FARM' : netPerHour >= 8 ? 'MARGINAL' : netPerHour >= 0 ? 'THIN' : 'SKIP';
  return { verdict, netPerHour, breakEven };
}

/** The first chain a protocol names, or a neutral phrase. */
function chainOf(p: SnapshotProtocol): string {
  return p.chains.length > 0 ? p.chains[0]! : 'its main chain';
}

/** How much capital one farm position needs, from the protocol's own TVL. */
function capitalFor(p: SnapshotProtocol): number {
  if (p.tvl_usd >= 5_000_000_000) return 250;
  if (p.tvl_usd >= 1_000_000_000) return 150;
  if (p.tvl_usd >= 100_000_000) return 100;
  return 50;
}

/** The category's one action, in words a farmer can follow. */
function actionFor(p: SnapshotProtocol, capital: number, chain: string): string {
  const c = (p.category ?? '').toLowerCase();
  const name = p.name;
  if (c.includes('lend') || c.includes('cdp') || c.includes('collateral')) return `Lend $${capital} of USDC into ${name} on ${chain} and leave the position open.`;
  if (c.includes('dex') || c.includes('yield') || c.includes('leveraged farm')) return `Add $${capital} of liquidity to ${name}'s main pool on ${chain} and leave it there.`;
  if (c.includes('bridge')) return `Bridge $${capital} of USDC to ${chain} with ${name} and use the bridged funds in its app.`;
  if (c.includes('staking') || c.includes('restak')) return `Stake $${capital} of the chain's staking asset through ${name} and keep the receipt token.`;
  if (c.includes('perpetual') || c.includes('derivative')) return `Deposit $${capital} of USDC as margin on ${name} and open one small hedged position.`;
  if (c.includes('prediction')) return `Fund ${name} with $${capital} and take one position in a market.`;
  if (c.includes('curator') || c.includes('allocator')) return `Put $${capital} into a ${name} vault on ${chain} and hold the vault shares.`;
  if (c.includes('stable')) return `Mint or deposit $${capital} of the stable asset through ${name} on ${chain}.`;
  if (c.includes('rwa')) return `Mint $${capital} of ${name}'s yield-bearing asset on ${chain} and hold it.`;
  if (c.includes('insurance')) return `Buy $${capital} of cover from ${name} on ${chain} and keep the policy active.`;
  return `Deposit $${capital} of USDC into ${name} on ${chain} and keep the position open.`;
}

/**
 * A protocol's farm plan: six steps, each an action with a cost and a time. The plan
 * is derived from the protocol's own record (category, chains, TVL, age), never from
 * a hand-written list of names.
 */
export function farmSteps(p: SnapshotProtocol, age: number | null): FarmStep[] {
  const chain = chainOf(p);
  const capital = capitalFor(p);
  const hold = holdDaysFor(age);
  const action = actionFor(p, capital, chain);
  return [
    {
      text: `Open a fresh wallet that holds only the funds you plan to farm, and keep its seed phrase offline.`,
      cost: 'under $3 of gas for the first transaction',
      time: '5 minutes',
    },
    {
      text: action,
      cost: `$${capital} of capital and about $${capital >= 150 ? 8 : 4} of gas`,
      time: '15 minutes to set up',
    },
    {
      text: `Do one qualifying action each week, such as a deposit, a borrow, a swap or a vote.`,
      cost: 'about $2 of gas a week',
      time: '10 minutes a week',
    },
    {
      text: `Hold the position for at least ${hold} days so the activity is counted in more than one snapshot.`,
      cost: `the $${capital} stays in the position`,
      time: `${hold} days`,
    },
    {
      text: `Before you withdraw, open the protocol's own points or rewards page and claim only from the link it publishes.`,
      cost: 'no fee to check, and never pay to claim',
      time: '10 minutes',
    },
    {
      text: `Write the wallet, the dates and every transaction in a farm log so you can repeat the position or unwind it.`,
      cost: 'nothing but the log',
      time: '5 minutes',
    },
  ];
}

/** A step as one string: its action, then its cost and time, within the gate's 20..600 characters. */
export function stepText(step: FarmStep): string {
  let s = `${step.text} Cost: ${step.cost}. Time: ${step.time}.`;
  if (s.length > 600) s = `${s.slice(0, 596)}...`;
  if (s.length < 20) s = `${s} Hold the position and check the protocol's own page.`;
  return s;
}

/** How the snapshot's 758 protocols are accounted for, in exclusion priority order. */
function buildLedger(snapshot: Snapshot, rankedCount: number, rankableCount: number): Ledger {
  let tokenOnRecord = 0;
  let cex = 0;
  let versioned = 0;
  let bridge = 0;
  let liquidStaking = 0;
  let wrapped = 0;
  for (const p of snapshot.protocols) {
    if (!isPreToken(p)) {
      tokenOnRecord++;
    } else if (p.category === 'CEX') {
      cex++;
    } else if (VERSIONED.test(p.name)) {
      versioned++;
    } else if (p.category !== null && (p.category === 'Bridge' || p.category === 'Canonical Bridge')) {
      bridge++;
    } else if (p.category !== null && EXCLUDED_CATEGORIES.has(p.category)) {
      liquidStaking++;
    } else if (WRAPPED_WORD.test(p.name) || EXCHANGE_NAMES.some((e) => p.name.startsWith(e))) {
      wrapped++;
    }
  }
  return {
    total: snapshot.protocols.length,
    ranked: rankedCount,
    token_on_record: tokenOnRecord,
    cex,
    versioned,
    bridge,
    liquid_staking: liquidStaking,
    wrapped,
    set_aside: rankableCount - rankedCount,
  };
}

/** The protocols the board ranks, strongest first, with ranks 1..n. */
export function buildBoard(snapshot: Snapshot, evidence: Evidence, ranges: { p25: number; p75: number }): BoardRow[] {
  const index = bySlug(snapshot.protocols);
  const oddsByBucket = new Map(evidence.odds.map((o) => [o.bucket, o.share]));
  const chosen = new Map<string, SnapshotProtocol>();
  // The watchlist is the floor: every slug, even one the snapshot no longer carries.
  for (const slug of snapshot.watchlist) {
    const p = index.get(slug);
    if (p !== undefined) chosen.set(slug, p);
  }
  const rankable = snapshot.protocols.filter(isRankable);
  // The early radar: the strongest rankable protocols below the floor, by TVL.
  const below = rankable
    .filter((p) => !chosen.has(p.slug) && p.tvl_usd < snapshot.floor_usd)
    .sort((a, b) => b.tvl_usd - a.tvl_usd || (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0))
    .slice(0, EARLY_ROWS);
  for (const p of below) chosen.set(p.slug, p);
  // The off-list radar: rankable protocols above the floor the watchlist leaves out.
  const above = rankable
    .filter((p) => !chosen.has(p.slug) && p.tvl_usd >= snapshot.floor_usd)
    .sort((a, b) => b.tvl_usd - a.tvl_usd || (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0))
    .slice(0, OFF_LIST_ROWS);
  for (const p of above) chosen.set(p.slug, p);

  const round4 = (n: number): number => Math.round(n * 1e4) / 1e4;
  const { rates, overall } = bucketRates(snapshot.protocols, snapshot.as_of);
  const scored = [...chosen.values()].map((p) => {
    const age = ageDays(snapshot.as_of, p.listed_at);
    const v = impliedValue(p.tvl_usd, p.change_7d, age, evidence.intercept, evidence.exponent, rates, overall);
    const implied = Math.max(1, Math.round(v.implied));
    const odds = oddsByBucket.get(oddsBucket(age)) ?? evidence.overall_token_share;
    const v1 = verdictFor(implied, odds, p.tvl_usd, 1000, age);
    const v10 = verdictFor(implied, odds, p.tvl_usd, 10000, age);
    return { p, age, implied, base: Math.max(1, Math.round(v.base)), g: v.g, m: v.m, odds, v1, v10 };
  });
  scored.sort((a, b) => b.implied - a.implied || (a.p.slug < b.p.slug ? -1 : a.p.slug > b.p.slug ? 1 : 0));
  return scored.map((s, i) => ({
    rank: i + 1,
    slug: s.p.slug,
    name: s.p.name,
    category: s.p.category,
    chains: s.p.chains,
    tvl_usd: s.p.tvl_usd,
    change_7d: s.p.change_7d,
    mcap_usd: s.p.mcap_usd,
    listed_at: s.p.listed_at,
    gecko_id: s.p.gecko_id,
    symbol: s.p.symbol,
    token_status: 'pre-token' as const,
    age_days: s.age,
    implied_value_usd: s.implied,
    base_implied_usd: s.base,
    implied_p25_usd: Math.max(1, Math.round(s.implied * ranges.p25)),
    implied_p75_usd: Math.max(1, Math.round(s.implied * ranges.p75)),
    launch_odds: round4(s.odds),
    verdict_1k: s.v1.verdict,
    verdict_10k: s.v10.verdict,
    net_per_hour_1k: round4(s.v1.netPerHour),
    break_even_usd: Number.isFinite(s.v1.breakEven) ? Math.round(s.v1.breakEven) : -1,
    model: {
      intercept: round4(evidence.intercept),
      exponent: round4(evidence.exponent),
      age_days: s.age,
      growth_pct: s.p.change_7d,
      growth_factor: round4(s.g),
      maturity_factor: round4(s.m),
    },
    farm_steps: farmSteps(s.p, s.age).map(stepText),
  }));
}

/** The live-token protocols, by market cap, for the dashboard's Live token view. */
export function liveRows(snapshot: Snapshot): LiveRow[] {
  return snapshot.protocols
    .filter((p) => !isPreToken(p) && p.category !== 'CEX')
    .sort((a, b) => (b.mcap_usd ?? 0) - (a.mcap_usd ?? 0) || b.tvl_usd - a.tvl_usd)
    .slice(0, LIVE_ROWS)
    .map((p) => ({
      slug: p.slug,
      name: p.name,
      category: p.category,
      chains: p.chains,
      tvl_usd: p.tvl_usd,
      mcap_usd: p.mcap_usd,
      change_7d: p.change_7d,
    }));
}

/** A board row's compact form for data.js. */
export function radarRow(row: BoardRow): RadarRow {
  return {
    rank: row.rank,
    slug: row.slug,
    name: row.name,
    category: row.category,
    chains: row.chains,
    tvl_usd: row.tvl_usd,
    change_7d: row.change_7d,
    listed_at: row.listed_at,
    age_days: row.age_days,
    implied_value_usd: row.implied_value_usd,
    base_implied_usd: row.base_implied_usd,
    growth_factor: row.model.growth_factor,
    maturity_factor: row.model.maturity_factor,
    implied_p25_usd: row.implied_p25_usd,
    implied_p75_usd: row.implied_p75_usd,
    launch_odds: row.launch_odds,
    verdict_1k: row.verdict_1k,
    verdict_10k: row.verdict_10k,
    net_per_hour_1k: row.net_per_hour_1k,
    break_even_usd: row.break_even_usd,
    farm_steps: row.farm_steps,
  };
}

/** Everything the dashboard renders, from the snapshot. */
export function buildRadar(snapshot: Snapshot): { board: BoardRow[]; radar: RadarData } {
  const evidence = computeEvidence(snapshot);
  const ranges = rangeFactors(snapshot, evidence.intercept, evidence.exponent);
  const board = buildBoard(snapshot, evidence, ranges);
  const live = liveRows(snapshot);
  const early = board.filter((r) => !snapshot.watchlist.includes(r.slug)).length;
  const rankableCount = snapshot.protocols.filter(isRankable).length;
  const verdicts_1k: Record<string, number> = { FARM: 0, MARGINAL: 0, THIN: 0, SKIP: 0 };
  const verdicts_10k: Record<string, number> = { FARM: 0, MARGINAL: 0, THIN: 0, SKIP: 0 };
  for (const r of board) {
    verdicts_1k[r.verdict_1k] = (verdicts_1k[r.verdict_1k] ?? 0) + 1;
    verdicts_10k[r.verdict_10k] = (verdicts_10k[r.verdict_10k] ?? 0) + 1;
  }
  const model: ModelConstants = {
    intercept: Math.round(evidence.intercept * 1e6) / 1e6,
    exponent: Math.round(evidence.exponent * 1e6) / 1e6,
    farmer_pool_share: 0.05,
    gas_fees_usd: 15,
    farm_net_per_hour: 25,
    marginal_net_per_hour: 8,
    thin_net_per_hour: 0,
  };
  const radar: RadarData = {
    as_of: snapshot.as_of,
    source: snapshot.source,
    floor_usd: snapshot.floor_usd,
    model,
    model_version: MODEL_VERSION,
    watchlist_size: snapshot.watchlist.length,
    board_size: board.length,
    early_size: early,
    live_size: live.length,
    total_implied_usd: board.reduce((a, r) => a + r.implied_value_usd, 0),
    rows: board.map(radarRow),
    live,
    fit_points: snapshot.protocols
      .filter((p) => (p.mcap_usd ?? 0) > 0 && p.tvl_usd > 0)
      .sort((a, b) => a.tvl_usd - b.tvl_usd)
      .map((p) => ({ slug: p.slug, name: p.name, tvl_usd: p.tvl_usd, mcap_usd: p.mcap_usd! })),
    evidence,
    ledger: buildLedger(snapshot, board.length, rankableCount),
    verdicts_1k,
    verdicts_10k,
  };
  return { board, radar };
}

/** The snapshot out of a file's text, refused unless it is the shape the model scores. */
export function parseSnapshot(text: string): Snapshot {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new SnapshotError('snapshot.json is not JSON');
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw new SnapshotError('snapshot.json is not a JSON object');
  const o = raw as Record<string, unknown>;
  if (typeof o.as_of !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(o.as_of)) throw new SnapshotError('snapshot.json has no as_of date');
  if (typeof o.source !== 'string') throw new SnapshotError('snapshot.json has no source');
  if (typeof o.floor_usd !== 'number' || !Number.isSafeInteger(o.floor_usd) || o.floor_usd <= 0) throw new SnapshotError('snapshot.json has no floor_usd');
  if (!Array.isArray(o.protocols)) throw new SnapshotError('snapshot.json has no protocols array');
  if (!Array.isArray(o.watchlist) || o.watchlist.some((s) => typeof s !== 'string')) throw new SnapshotError('snapshot.json has no watchlist of slugs');
  const protocols = o.protocols.map((v, i) => {
    if (typeof v !== 'object' || v === null || Array.isArray(v)) throw new SnapshotError(`snapshot.json's protocol ${i} is not an object`);
    const p = v as Record<string, unknown>;
    if (typeof p.slug !== 'string' || typeof p.name !== 'string' || typeof p.tvl_usd !== 'number' || !Number.isFinite(p.tvl_usd)) {
      throw new SnapshotError(`snapshot.json's protocol ${i} lacks a slug, a name or a TVL`);
    }
    return {
      slug: p.slug,
      name: p.name,
      category: typeof p.category === 'string' ? p.category : null,
      chains: Array.isArray(p.chains) ? p.chains.filter((c): c is string => typeof c === 'string') : [],
      tvl_usd: p.tvl_usd,
      change_7d: typeof p.change_7d === 'number' && Number.isFinite(p.change_7d) ? p.change_7d : null,
      mcap_usd: typeof p.mcap_usd === 'number' && Number.isFinite(p.mcap_usd) ? p.mcap_usd : null,
      listed_at: typeof p.listed_at === 'string' ? p.listed_at : null,
      gecko_id: typeof p.gecko_id === 'string' ? p.gecko_id : null,
      symbol: typeof p.symbol === 'string' ? p.symbol : null,
    };
  });
  return {
    as_of: o.as_of,
    source: o.source,
    floor_usd: o.floor_usd,
    protocols,
    watchlist: o.watchlist as string[],
  };
}

/** Why a board is not one the gate will take, or null: coverage, ranks, order, one shared implied value, and farm steps. */
export function boardIssue(board: BoardRow[], snapshot: Snapshot): string | null {
  const slugs = new Set(board.map((r) => r.slug));
  const missing = snapshot.watchlist.filter((s) => !slugs.has(s));
  if (missing.length > 0) return `the board misses ${missing.length} watchlist slug${missing.length === 1 ? '' : 's'}: ${missing.slice(0, 5).join(', ')}`;
  const ranks = board.map((r) => r.rank).sort((a, b) => a - b);
  for (let i = 0; i < ranks.length; i++) if (ranks[i] !== i + 1) return `rank ${i + 1} is ${ranks[i]}`;
  for (let i = 1; i < board.length; i++) if (board[i]!.implied_value_usd > board[i - 1]!.implied_value_usd) return `row ${i + 1} outranks row ${i} on implied value`;
  if (board.length >= 2 && board[0]!.implied_value_usd === board[board.length - 1]!.implied_value_usd) {
    return `all ${board.length} rows share the same implied value $${board[0]!.implied_value_usd}: a board that ranks nothing by value is not a ranking`;
  }
  for (const r of board) {
    const steps = r.farm_steps;
    if (steps.length < 3 || steps.length > 12) return `${r.slug} has ${steps.length} farm steps`;
    for (const s of steps) if (s.length < 20 || s.length > 600) return `${r.slug} has a farm step of ${s.length} characters`;
    if (!Number.isSafeInteger(r.implied_value_usd) || r.implied_value_usd <= 0) return `${r.slug} has implied value ${r.implied_value_usd}`;
  }
  return null;
}

/** A compact data.js: the dashboard's whole dataset as one script, no fetch and no network. */
export function dataScript(radar: RadarData): string {
  return `window.RADAR=${JSON.stringify(radar)};\n`;
}
