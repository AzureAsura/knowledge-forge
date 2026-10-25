---
title: Core Web Vitals in Practice: Fixing LCP, INP and CLS on a Real Dashboard
author: raka_m
category: web-frontend
difficulty: intermediate
status: published
age: 9
featured: true
cover: unsplash:1460925895917-afdab827c52f
---

Last quarter our internal dashboard felt slow, but nobody could say *why*. "It's laggy" is not a bug report. So we measured it with the three metrics Google calls **Core Web Vitals**, fixed what they pointed at, and cut p75 load time by almost half. This scroll is the playbook: what each metric means, how to measure it in the lab and in the field, and the concrete fixes that moved the numbers.

![Analytics dashboard with line charts on a laptop](unsplash:1460925895917-afdab827c52f)
*You cannot improve what you cannot see. Measure first, then change one thing at a time.*

## The three metrics

| Metric | Measures | "Good" threshold (p75) |
|---|---|---|
| **LCP** — Largest Contentful Paint | Loading: when the biggest visible element renders | ≤ 2.5 s |
| **INP** — Interaction to Next Paint | Responsiveness: delay between an interaction and the next frame | ≤ 200 ms |
| **CLS** — Cumulative Layout Shift | Visual stability: how much content jumps around | ≤ 0.1 |

Two details people miss. First, the thresholds apply at the **75th percentile of real users**, not your fast laptop on office Wi-Fi. Second, INP replaced FID (First Input Delay) as the responsiveness metric in March 2024; FID only looked at the *first* interaction, INP looks at all of them across the page's life and reports roughly the worst.

## Step 1: measure in two places

**Lab data** (Lighthouse, Chrome DevTools Performance panel) is reproducible and gives you a trace to dig into. **Field data** (real users) tells you whether the problem actually exists for people. You need both.

```bash
# Lab: a repeatable Lighthouse run, mobile profile, 4x CPU slowdown
npx lighthouse https://dashboard.palm.example --preset=perf \
  --form-factor=mobile --throttling.cpuSlowdownMultiplier=4 \
  --output=json --output-path=./lh.json
```

For field data, add the `web-vitals` library and send results to your analytics endpoint:

```ts
import { onLCP, onINP, onCLS } from 'web-vitals'

function send(metric: { name: string; value: number; id: string }) {
  navigator.sendBeacon('/api/vitals', JSON.stringify(metric))
}

onLCP(send)
onINP(send)
onCLS(send)
```

`sendBeacon` survives page unload, which matters because CLS and INP are finalized when the user leaves.

## Step 2: fix LCP (loading)

Open the Performance panel, find the LCP marker, and ask: *what element is it, and what delayed it?* LCP time breaks into four parts: time to first byte, resource load delay, resource load duration, and element render delay. Ours was a hero chart image plus a 900 KB JavaScript bundle blocking render.

**Fixes that worked, in order of payoff:**

1. **Do not lazy-load the LCP image.** `loading="lazy"` on above-the-fold images delays the very thing you are measuring. Use `fetchpriority="high"` on it instead.
2. **Serve the right size.** We were shipping a 2400 px wide cover to a 640 px slot. Using responsive `srcset` and a CDN that resizes (width + `f_auto` format) cut the image from 410 KB to 38 KB.
3. **Split the bundle by route.** The dashboard imported a rich-text editor on every page. Moving it behind `React.lazy` removed 280 KB from the initial load.
4. **Preconnect to critical origins.**

```html
<link rel="preconnect" href="https://res.cloudinary.com" crossorigin />
<img src="/cover-640.webp" fetchpriority="high" width="640" height="360" alt="" />
```

Result: LCP p75 from 4.1 s to 2.2 s.

![Developer working on performance with code on screen](unsplash:1555066931-4365d14bab8c)
*The trace tells you which of the four LCP phases is the bottleneck. Do not guess.*

## Step 3: fix INP (responsiveness)

INP failures almost always mean **long tasks on the main thread**: the browser cannot paint because JavaScript is busy. In DevTools, record an interaction and look for tasks longer than 50 ms.

Our culprit: typing in the search box re-rendered a 2,000-row table synchronously on every keystroke.

```tsx
// Before: every keystroke blocks painting
const [query, setQuery] = useState('')
const rows = useMemo(() => filterRows(all, query), [all, query])

// After: keep input urgent, make the heavy list interruptible
const [query, setQuery] = useState('')
const deferredQuery = useDeferredValue(query)
const rows = useMemo(() => filterRows(all, deferredQuery), [all, deferredQuery])
```

`useDeferredValue` lets React paint the input first and render the list in a lower-priority pass. Other tools in the same family:

- **Virtualize long lists** (`@tanstack/react-virtual`): render only visible rows. 2,000 DOM rows became ~30.
- **Break up long tasks** with `scheduler.yield()` or `setTimeout(0)` between chunks of work.
- **Move heavy computation** off the main thread into a Web Worker.
- **Avoid layout thrash**: read layout (`offsetHeight`) and write styles in separate batches.

Result: INP p75 from 480 ms to 140 ms.

## Step 4: fix CLS (stability)

Layout shifts come from content that changes size after the first paint. The usual suspects, and the fixes:

| Cause | Fix |
|---|---|
| Images without dimensions | Always set `width` and `height` (or CSS `aspect-ratio`) |
| Web fonts swapping | `font-display: optional` or preload the font, match fallback metrics |
| Late-injected banners / ads | Reserve space with a fixed `min-height` |
| Skeleton ≠ final size | Make the skeleton the same height as the content |
| Animations moving layout | Animate `transform`, not `top`/`height` |

The dashboard's "welcome banner" appeared after the user query resolved and pushed every card down. Reserving its height with a skeleton took CLS from 0.27 to 0.02.

## Step 5: stop regressions

A one-off fix decays. We added a performance budget to CI using Lighthouse CI:

```json
{
  "ci": {
    "assert": {
      "assertions": {
        "largest-contentful-paint": ["error", { "maxNumericValue": 2500 }],
        "cumulative-layout-shift": ["error", { "maxNumericValue": 0.1 }],
        "total-blocking-time": ["warn", { "maxNumericValue": 300 }]
      }
    }
  }
}
```

Lab TBT (Total Blocking Time) is the best lab proxy for INP, since INP itself needs real interactions.

## A quick triage table

| Symptom | Check first |
|---|---|
| Blank screen for seconds | TTFB, render-blocking JS/CSS, bundle size |
| Hero image appears late | Is it lazy-loaded? Is it oversized? Priority hint? |
| Clicks feel "sticky" | Long tasks, expensive renders, huge lists |
| Page jumps while reading | Missing image sizes, late banners, font swap |

## Takeaways

- Measure with field data at p75; lab data is for debugging.
- Each metric has a small set of well-known causes. Find which one is yours before optimizing.
- Prefer removing work (less JS, smaller images, fewer DOM nodes) over making work faster.
- Put a budget in CI, or the numbers will drift back.

Further reading: web.dev's *Web Vitals* guides, the `web-vitals` library README, and the Chrome DevTools Performance panel documentation.

<!--comments-->
sari_dewi: Nice write-up. One backend note: a slow TTFB is invisible in the frontend profile. Make sure the API behind the dashboard returns cacheable responses; we shaved 300 ms by adding ETags on the list endpoints.
raka_m: Good point, Sari. LCP phase one is literally "time to first byte", so the server is half of the story.
rizkymaul: The useDeferredValue example made INP click for me. I always thought debouncing was the only option, but this keeps the input responsive without delaying the filter.
raka_m: Debounce still has a place when the work is a network call. For pure client-side rendering cost, deferring is nicer because it never drops keystrokes.
salsa_nur: From the design side: reserving the banner height was something we asked for in the spec but never got. Seeing the CLS drop from 0.27 to 0.02 is a good argument to show the team.
kevin_h: Adding this to the Definition of Done for the next sprint. A CI budget is the only way this stays fixed. Thanks Raka.
