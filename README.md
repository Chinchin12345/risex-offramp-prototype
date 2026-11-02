# RISEx off-ramp — desktop prototype

Interactive web prototype of the RISEx off-ramp (USDC → VND to a bank account, via Crossmint),
built from Figma section **“3. Design - Off Ramp Flow”** (`101:58405`, entry frame `101:60320`).
Desktop only, happy path only.

Static site, no build step, no network calls: no real sign-in, identity check, wallet signature,
bank lookup or payout.

## Journey shown

First-time bank withdrawal, following the Figma arrows:

01 Trade → 02 Withdraw → 03 Cash out → 04a Sign in → 04b Email code → 05a Verification required →
05b Crossmint step → 05c In progress → 05d Verified → 06b No bank account yet → 07a Add bank account →
07b Checking → 07c Ready → 08 Review → 09a Preparing funds → 09b Confirm in wallet → 10.1 – 10.4 Status →
11 Funds sent → 12 Trade after withdrawal.

Closing the flow keeps the demo session, so a second attempt follows the Figma skip arrows
(03 ⇢ 05a, 03 ⇢ 06, 06 ⇢ 08).

## Run locally

```bash
cd prototypes/offramp-desktop
python3 -m http.server 8766
```

Open http://127.0.0.1:8766/ in Chrome.

## Deploy

Live: https://chinchin12345.github.io/risex-offramp-prototype/ (GitHub Pages, repo `Chinchin12345/risex-offramp-prototype`).

Upload this folder as-is to any static HTTPS host. `index.html` is the entry point.

## Files

| File | Role |
|---|---|
| `index.html` | Trade screen, the withdrawal modal and one `<template>` per step |
| `assets/risex.css` | RISEx tokens and components (copied from the on-ramp prototype, extended) |
| `assets/risex.js` | Step flow, validation, status progression, balances |
| `assets/store.js` | Demo state and the illustrative quote |
| `assets/icons.js`, `assets/icons/` | Icons exported from Figma (`RISEx/Icon/*`) |
| `assets/brand/` | Logo, avatar, chart raster, USDC/BTC, Crossmint wordmark, Google |
| `assets/fonts/` | Geist / Geist Mono (self-hosted, OFL) |

## Demo data (illustrative, not a real quote)

- Available to withdraw 15.09 USDC; default withdrawal 15.00 USDC, minimum 1.00 USDC.
- Processing fee 1% (0.15 USDC), rate 1 USDC = 26,000 VND → 14.85 USDC → 386,100 VND.
- Before: Acct. Equity $23.72, Collat. Margin $23.70, Available 15.09 USDC.
  After one 15.00 USDC withdrawal: $8.72, $8.70, 0.09 USDC.
- Bank account, holder name and email are demo values; any 6-digit code is accepted.
- The wallet confirmation is a demo pane; it does not connect to or sign with a real wallet.

State lives in `localStorage` under its own key `risex-offramp-demo-v1` (1-hour expiry), so it never
touches the on-ramp demo on the same origin. **Restart demo** clears only that key.
