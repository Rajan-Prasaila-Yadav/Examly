# Request waterfalls

Batch detail and test detail pages use `Promise.all` for independent requests. Other pages require runtime waterfall measurement.

## Browser verification — 2026-09-03

PASS: after browser builder mutations, the test detail page made detail, leaderboard, attempts, and analytics requests concurrently (not sequentially). The observed API response timings were approximately 2.06s, 1.79s, 1.57s, and 1.19s respectively. CORS preflights were also present for each cross-origin request; this adds request count but the main XHRs still launched in parallel. No failed browser request was observed for the tested builder actions.
