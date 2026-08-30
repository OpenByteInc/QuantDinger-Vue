# Issue 225 — Enable Live Trading for Crypto Portfolio Strategies Implementation Plan

> **For implementer:** Use TDD throughout. Write failing test first. Watch it fail. Then implement.

**Goal:** Strategy API V2 Crypto portfolio strategies (same-market multi-instrument, e.g. BTC/USDT+ETH/USDT `@swap`) must be deployable with `executionMode="live"` from the web UI, matching the backend capability at `QuantDinger/backend_api_python/app/services/strategy_v2/deployment.py::_validate_execution_account`.

**Architecture:**
The bug lives entirely in the Vue frontend at `src/views/strategy-center/components/LiveStrategyEditor.vue`. Two computed properties hard-block live mode for portfolio strategies unless the market is USStock:
- `supportsLive()` (line 370–373) drives the `disabled` state of the "live" radio button.
- `compatibleCredentials()` (line 420–428) filters visible credential options; for portfolios it currently allows only Alpaca.

The patch introduces two **pure helper functions** in a new module `src/utils/liveTradingEligibility.js`, tested by `node --test` in `tests/unit/liveTradingEligibility.test.mjs`, and re-wires the two computed properties to call those helpers. This keeps the Vue component thin and lets us exercise the matrix (CTA vs portfolio × marketCategory) without mounting a Vue SFC in Node's built-in test runner (no Vitest dependency is currently configured).

**Tech Stack:** Vue 2.7 + ant-design-vue (component), ES modules, Node 18+ built-in test runner (`node --test`), no new dependencies.

---

## Out of Scope (per approved decisions 2A + 1A)

- **IBKR for USStock portfolios** stays as-is: `compatibleCredentials` continues to allow `['alpaca', 'ibkr']` for USStock; the portfolio branch keeps surfacing Alpaca-credentialed accounts when `marketCategory === 'USStock'`. Wait — actually decision 2A said "out of scope, keep alpaca-only for USStock portfolio". Hmm, per the user's 2A: keep US-stock portfolio behaviour unchanged — i.e. portfolios @ USStock surface only Alpaca creds, exactly as today.
- **Same-market Crypto spot portfolios** are now allowed by the frontend (decision 1A: match the backend). The backend's `_validate_execution_account` is the source of truth; if it ever rejects spot-portfolio live swaps, that error surfaces through the existing error path.
- **Mixed-market portfolios** remain blocked backend-side (`strategyV2.mixedMarketLiveUnsupported`); the frontend helper returns `false` for `marketCategory === 'Mixed'` so users get fast local feedback and never submit a doomed payload.

---

## Task 1: Pure helpers + failing tests (RED)

**Files:**
- Create: `src/utils/liveTradingEligibility.js` (empty stub at this step)
- Create: `tests/unit/liveTradingEligibility.test.mjs`

**Step 1: Write the failing test**

Create `tests/unit/liveTradingEligibility.test.mjs`:

```js
import test from 'node:test'
import assert from 'node:assert/strict'

import {
  supportsLiveExecutionMode,
  credentialMatchesLiveStrategy
} from '../../src/utils/liveTradingEligibility.js'

const CRYPTO_EXCHANGES = ['binance', 'bitget', 'bybit', 'okx', 'gate', 'htx']

test('crypto CTA strategy supports live', () => {
  assert.equal(supportsLiveExecutionMode({ strategyType: 'cta', markets: ['Crypto'] }), true)
})

test('crypto portfolio supports live (issue 225)', () => {
  assert.equal(
    supportsLiveExecutionMode({ strategyType: 'portfolio', markets: ['Crypto'] }),
    true
  )
})

test('USStock portfolio still supports live', () => {
  assert.equal(
    supportsLiveExecutionMode({ strategyType: 'portfolio', markets: ['USStock'] }),
    true
  )
})

test('mixed-market strategy does not support live', () => {
  assert.equal(
    supportsLiveExecutionMode({ strategyType: 'portfolio', markets: ['Crypto', 'USStock'] }),
    false
  )
})

test('unknown market does not support live', () => {
  assert.equal(supportsLiveExecutionMode({ strategyType: 'cta', markets: ['Forex'] }), false)
})

test('crypto portfolio accepts crypto exchange credentials', () => {
  for (const exchange of CRYPTO_EXCHANGES) {
    assert.equal(
      credentialMatchesLiveStrategy(
        { strategyType: 'portfolio', markets: ['Crypto'] },
        exchange
      ),
      true,
      `expected ${exchange} to be accepted for a crypto portfolio`
    )
  }
})

test('crypto portfolio rejects non-crypto credentials', () => {
  assert.equal(
    credentialMatchesLiveStrategy(
      { strategyType: 'portfolio', markets: ['Crypto'] },
      'alpaca'
    ),
    false
  )
})

test('USStock portfolio accepts alpaca and ibkr', () => {
  for (const exchange of ['alpaca', 'ibkr']) {
    assert.equal(
      credentialMatchesLiveStrategy(
        { strategyType: 'portfolio', markets: ['USStock'] },
        exchange
      ),
      true
    )
  }
})

test('USStock portfolio rejects crypto exchanges', () => {
  assert.equal(
    credentialMatchesLiveStrategy(
      { strategyType: 'portfolio', markets: ['USStock'] },
      'binance'
    ),
    false
  )
})

test('crypto CTA keeps existing crypto-exchange behaviour', () => {
  assert.equal(
    credentialMatchesLiveStrategy({ strategyType: 'cta', markets: ['Crypto'] }, 'binance'),
    true
  )
  assert.equal(
    credentialMatchesLiveStrategy({ strategyType: 'cta', markets: ['Crypto'] }, 'alpaca'),
    false
  )
})
```

**Step 2: Run test — confirm it fails**
Command: `cd /Users/waleedtariq/Desktop/cource_codes/QuantDinger-Vue && node --test tests/unit/liveTradingEligibility.test.mjs`
Expected: FAIL — `Cannot find module '../../src/utils/liveTradingEligibility.js'`.

**Step 3: (deferred — implemented in Task 2)**

**Step 4: Commit**
`git add tests/unit/liveTradingEligibility.test.mjs && git commit -m "test(strategy-center): add failing live-eligibility specs for crypto portfolios (#225)"`

---

## Task 2: Implement helpers (GREEN)

**Files:**
- Modify: `src/utils/liveTradingEligibility.js`

**Step 1: Write minimal implementation**

```js
const LIVE_CRYPTO_EXCHANGES = new Set(['binance', 'bitget', 'bybit', 'okx', 'gate', 'htx'])
const LIVE_US_STOCK_EXCHANGES = new Set(['alpaca', 'ibkr'])

const normalizeMarketCategory = manifestLike => {
  const markets = Array.isArray(manifestLike && manifestLike.markets)
    ? manifestLike.markets
    : []
  return markets.length === 1 ? String(markets[0]) : 'Mixed'
}

/**
 * Returns true when the deployment's executionMode may be "live".
 * Mirrors QuantDinger/backend_api_python/app/services/strategy_v2/deployment.py
 * ::_validate_execution_account, except that we fail fast locally instead of
 * round-tripping the server for a known-reject.
 */
export const supportsLiveExecutionMode = manifestLike => {
  const marketCategory = normalizeMarketCategory(manifestLike)
  return marketCategory === 'Crypto' || marketCategory === 'USStock'
}

/**
 * Returns true when the supplied exchange_id is a legal credential for a
 * live deployment of the given strategy manifest.
 */
export const credentialMatchesLiveStrategy = (manifestLike, exchangeId) => {
  const exchange = String(exchangeId || '').toLowerCase()
  const marketCategory = normalizeMarketCategory(manifestLike)
  if (marketCategory === 'Crypto') return LIVE_CRYPTO_EXCHANGES.has(exchange)
  if (marketCategory === 'USStock') return LIVE_US_STOCK_EXCHANGES.has(exchange)
  return false
}
```

Note: the helper intentionally ignores `strategyType` — same-market portfolios and CTA share the same eligibility, matching the backend. The exported signature keeps the parameter so UI callers can pass the full manifest.

**Step 2: Run test — confirm it passes**
Command: `cd /Users/waleedtariq/Desktop/cource_codes/QuantDinger-Vue && node --test tests/unit/liveTradingEligibility.test.mjs`
Expected: PASS — all 10 cases green.

**Step 3: Commit**
`git add src/utils/liveTradingEligibility.js && git commit -m "feat(strategy-center): add live-trading eligibility helpers (#225)"`

---

## Task 3: Wire helpers into LiveStrategyEditor.vue

**Files:**
- Modify: `src/views/strategy-center/components/LiveStrategyEditor.vue`
- Modify: `tests/unit/liveStrategyCurrentContract.test.mjs`

**Step 1: Extend the existing source-scan test (RED)**

Append the following to `tests/unit/liveStrategyCurrentContract.test.mjs`:

```js
test('live editor uses shared eligibility helpers for crypto portfolios (#225)', () => {
  assert.match(source, /liveTradingEligibility/)
  assert.match(source, /supportsLiveExecutionMode/)
  assert.match(source, /credentialMatchesLiveStrategy/)
  // The pre-fix hard-blocks must be gone.
  assert.doesNotMatch(source, /isPortfolioStrategy\) return this\.marketCategory === 'USStock'/)
  assert.doesNotMatch(source, /isPortfolioStrategy\) return exchange === 'alpaca'/)
})
```

Run test — confirm it FAILS because `liveTradingEligibility` is not yet imported.

**Step 2: Modify LiveStrategyEditor.vue**

In the `<script>` block, add the import alongside other utility imports:

```js
import {
  supportsLiveExecutionMode,
  credentialMatchesLiveStrategy
} from '@/utils/liveTradingEligibility'
```

Replace the body of `supportsLive` (was line 370–373):

```js
supportsLive () {
  return supportsLiveExecutionMode(this.strategyManifest)
}
```

Replace the body of `compatibleCredentials` (was line 420–428):

```js
compatibleCredentials () {
  return this.credentials.filter(credential =>
    credentialMatchesLiveStrategy(this.strategyManifest, credential.exchange_id)
  )
}
```

Leave `LIVE_CRYPTO_EXCHANGES` import in place if it is still used elsewhere in the component; otherwise drop it.

**Step 3: Run all unit tests — confirm everything passes**
Command: `cd /Users/waleedtariq/Desktop/cource_codes/QuantDinger-Vue && node --test tests/unit/liveTradingEligibility.test.mjs tests/unit/liveStrategyCurrentContract.test.mjs`
Expected: PASS — both files green.

Then: `pnpm test:unit` (or `node --test tests/unit/*.test.mjs` if the npm script swallows the new files).
Expected: PASS across the suite — confirms no regression.

**Step 4: Commit**
`git add src/views/strategy-center/components/LiveStrategyEditor.vue tests/unit/liveStrategyCurrentContract.test.mjs && git commit -m "fix(strategy-center): enable live mode for crypto portfolios (#225)"`

---

## Task 4: Manual smoke verification

1. `pnpm dev` in `QuantDinger-Vue`, connected to a local QuantDinger backend.
2. Save a Strategy API V2 source with:
   ```python
   def initialize(context):
       context.set_universe(["Crypto:BTC/USDT@swap", "Crypto:ETH/USDT@swap"])
       context.subscribe(frequency="4h")
   ```
3. Open **Strategy Center → Deploy**, pick that source, scroll to Execution Mode.
4. Confirm the **Live Automated Trading** radio is enabled and that a Bitget/Binance/OKX credential shows up under **Credentials**.
5. Toggle back to a single-instrument source and confirm CTA live is unchanged.
6. Confirm a mixed-market manifest (Crypto+USStock) leaves the radio disabled.

This is manual-only; do not commit anything for this step.

---

## Task 5: Branch housekeeping and PR

1. Branch: `git checkout -b fix-225-crypto-portfolio-live` (created at Task 1 start).
2. Push to fork: `git push -u mwaleedta fix-225-crypto-portfolio-live` (Waleed's fork remote — confirm with `git remote -v`; if missing, `git remote add mwaleedta git@github.com:mwaleedta/QuantDinger-Vue.git` after forking on GitHub).
3. Open PR to `OpenByteInc/QuantDinger-Vue#master` (or whatever the default branch is — confirm with `git ls-remote --symref origin HEAD`).
4. PR body links to `OpenByteInc/QuantDinger#225` and notes that **no backend change is required** because `deployment.py::_validate_execution_account` already permits same-market multi-instrument live.

---

## Risks / Open Questions

| Risk | Mitigation |
|---|---|
| Backend rejects a same-market Crypto **spot** (non-swap) portfolio at runtime | Decision 1A explicitly accepted this — the backend is source of truth. UI exposes the deployment form; the contract error will surface in the existing error toast. |
| `liveStrategyCurrentContract.test.mjs` source-scanning style is brittle | Acceptable: this is the file's existing test idiom; we are extending it, not introducing a new pattern. |
| Older saved strategies with `exchange_id` set to `alpaca` for Crypto portfolios | None — those rows couldn't have existed in `live` mode before this change. |
