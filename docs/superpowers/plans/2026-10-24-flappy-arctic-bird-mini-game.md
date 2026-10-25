# Trong Khang v2 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Home page becomes a 2-column English page: rewritten About (real CV facts), plus a playable Flappy-style arctic bird canvas game with localStorage best score.

**Architecture:** One new browser script `js/flappy.js` (UMD: pure game state machine exported for Node tests + canvas UI bootstrap that runs only in a browser). Layout/markup changes live in `index.html` (page-specific inline CSS already lives there). Copy sweep touches the public HTML pages.

**Tech Stack:** HTML5 Canvas, vanilla JS (no deps), CSS grid, localStorage, Node built-in test runner (`node --test`, Node 24), existing Python unittest suite.

## Global Constraints

- No new dependencies, no build step, no frameworks.
- Python 3 stdlib + Node stdlib only.
- Site copy is English; README stays Vietnamese.
- Existing 7 Python tests must keep passing.
- Game must not hijack Space key: keyboard input is bound to the canvas element only (canvas is focusable, focus on pointer down).
- localStorage key: `flappyArcticBirdBestScore`.
- Do not delete unrelated code; minimal diffs.

---

### Task 1: Game module + core tests

**Files:**
- Create: `js/flappy.js` (UMD module: core state machine + browser UI)
- Create: `tests/test_flappy_core.js` (Node built-in test runner, CommonJS)

**Interfaces:**
- Produces: `FlappyCore.createState()`, `FlappyCore.step(state, flap)`, `FlappyCore.reset(state)`, constants `W`, `H`.
- Browser bootstrap: on DOMContentLoaded, if `#game-panel canvas` exists, run the game (no-op otherwise).

- [ ] **Step 1: Write failing core tests** in `tests/test_flappy_core.js`

```js
const test = require('node:test');
const assert = require('node:assert');
const { createState, step, reset, W, H } = require('../js/flappy.js');

test('flap starts the game and moves bird up', () => {
  const s = createState();
  assert.strictEqual(s.started, false);
  step(s, true);
  assert.strictEqual(s.started, true);
  assert.ok(s.bird.vy < 0);
});

test('gravity pulls the bird down and ground ends the game', () => {
  const s = createState();
  step(s, true);
  const firstY = s.bird.y;
  for (let i = 0; i < 10; i++) step(s, false);
  assert.ok(s.bird.y > firstY);
  for (let i = 0; i < 600 && !s.over; i++) step(s, false);
  assert.strictEqual(s.over, true);
});

test('score increments once per passed pipe and best is kept on death', () => {
  const s = createState();
  s.started = true;
  s.pipes.push({ x: 60, gapY: s.bird.y, passed: false });
  step(s, true);
  assert.strictEqual(s.score, 1);
  step(s, true);
  assert.strictEqual(s.score, 1);
  s.over = true;
  reset(s);
  assert.strictEqual(s.score, 0);
  assert.ok(s.best >= 1);
});

test('pipe collision ends the game', () => {
  const s = createState();
  s.started = true;
  s.pipes.push({ x: 90, gapY: 400, passed: false });
  step(s, false);
  assert.strictEqual(s.over, true);
});
```

- [ ] **Step 2: Run tests, expect failure**

Run: `node --test tests/test_flappy_core.js`
Expected: FAIL — cannot find module `../js/flappy.js`.

- [ ] **Step 3: Implement core** in `js/flappy.js`

Constants: `W=360, H=480, BIRD_X=90, BIRD_R=11, GRAVITY=0.35, FLAP=-5.2, PIPE_W=52, PIPE_GAP=128, PIPE_SPEED=2.2, SPAWN_EVERY=96`.

`createState()` → `{bird:{y:H/2,vy:0}, pipes:[], score:0, best:<from nothing, 0 here>, over:false, started:false, frame:0}`.
`step(state, flap)`:
- if `state.over` return state.
- if `flap && !state.started` → `started = true`.
- if `started`: `vy += GRAVITY; if (flap) vy = FLAP; y += vy`.
- spawn pipe every `SPAWN_EVERY` frames when started: `{x: W, gapY: 70 + Math.random()*(H-140-PIPE_GAP), passed:false}`.
- move pipes `x -= PIPE_SPEED`, drop `x < -PIPE_W`.
- score when `pipe.x + PIPE_W < BIRD_X - BIRD_R` and `!pipe.passed` → `passed=true; score++`.
- collision: `y + BIRD_R > H || y - BIRD_R < 0` or bird rect overlaps pipe column `(BIRD_X+BIRD_R > p.x && BIRD_X-BIRD_R < p.x+PIPE_W)` minus the gap `[gapY, gapY+PIPE_GAP]`.
- on collision: `over=true; best = Math.max(best, score)`.
- `frame++`, return state.

`reset(state)` → keep `best`, zero score, clear pipes, `over=false`, `started=false`, bird centered.

- [ ] **Step 4: Run tests, expect pass**

Run: `node --test tests/test_flappy_core.js`
Expected: all 4 pass.

- [ ] **Step 5: Add browser UI** (same file, guarded by `typeof document !== 'undefined'`)

- Find `#game-panel canvas`; return if absent.
- DPR-aware sizing (canvas CSS width 100%, logical W×H), draw: transparent background, ground strip, white bird circle + eye + orange beak, icy pipes rounded rects, big score top-center, "press SPACE or tap" hint before start, "game over — score X · best Y · press SPACE" overlay.
- Input: `pointerdown` → focus canvas, flap; `keydown` Space on canvas only (`preventDefault`); canvas `tabindex="0"`.
- RAF loop; pause on `document.hidden`; resume cleanly.
- Best score: `localStorage.getItem/setItem('flappyArcticBirdBestScore')`, parsed as int (fallback 0), stored on game over.

- [ ] **Step 6: Commit**

```bash
git add js/flappy.js tests/test_flappy_core.js
git commit -m "feat: arctic flappy game module with node core tests"
```

---

### Task 2: Home page — English About + 2-column layout

**Files:**
- Modify: `index.html` (body start, inline styles, container markup, script tag)

- [ ] **Step 1: Fix `$1` leak** — line 119 begins `$1<link rel="stylesheet" href="/static/nav.css">`; remove the literal `$1`.

- [ ] **Step 2: Replace About content** — keep the lowercase first-person voice and section order (intro → goal → now → before → beliefs → likes → dislike → CTA → credit), English, facts from CV: 12th grader in HCMC; goal licence maths/CS or CPGE in France → engineering degree or PhD in modelling/scientific computing/AI for physical systems; now: mentoring at BioTuring, STEM workshops at ICHC, AI-DermDiag (85.2% HAM10000, PyTorch+Grad-CAM), real-time fact-checking agent (Hack Fiesta Miami winner), C++ tick-level backtesting engine; before: phonon-assisted thermal rectification research, Icebreaker of Knowledge expedition (Vietnam rep, 22+ countries), YIMO 2026 1st prize (20/20), VnExpress Science Initiative finalist. No email/phone on page. GitHub link → `https://github.com/kswisse`.

- [ ] **Step 3: Add game panel markup + grid CSS** — wrap existing paragraphs in `.about-col`, add:

```html
<aside class="game-panel" id="game-panel">
  <canvas id="flappy" width="360" height="480" tabindex="0" aria-label="Flappy arctic bird mini-game"></canvas>
</aside>
```

Inline CSS: `.home-grid{display:grid;grid-template-columns:minmax(0,1fr) 380px;gap:3rem;align-items:start}` at `min-width:1024px`; `.container` max-width becomes 1060px on desktop; `.game-panel{position:sticky;top:96px;border:1px solid rgba(255,255,255,.14);border-radius:12px;background:rgba(10,14,21,.55);padding:10px}`; canvas `width:100%;height:auto;display:block;border-radius:8px;touch-action:none`; below 1024px `.home-grid{display:block}` and `.game-panel{position:static;margin:2rem 0 0;max-width:420px}`.

- [ ] **Step 4: Load script** — `<script src="/js/flappy.js" defer></script>` in head.

- [ ] **Step 5: Verify** — `python -m unittest discover -s tests -v` (7 pass) and Playwright: two columns at 1280px, stacked at 375px, canvas renders, no console errors other than the upstream font 404.

- [ ] **Step 6: Commit**

```bash
git add index.html
git commit -m "feat: english about from CV + two-column home with game panel"
```

---

### Task 3: English sweep on public pages

**Files:**
- Modify: `public/write.html`, `public/blog.html`, `public/post.html`, `public/contact.html` (user-facing strings only)

- [ ] **Step 1:** Translate remaining Vietnamese UI strings (titles, labels, buttons, hints, empty states) to English; leave `lang` attributes and structure untouched.
- [ ] **Step 2:** Verify in Playwright: `/public/write.html`, `/public/blog.html`, `/public/post.html?slug=x` (404 state), `/public/contact.html`; no console errors besides the font 404.
- [ ] **Step 3: Commit**

```bash
git add public/write.html public/blog.html public/post.html public/contact.html
git commit -m "chore: english copy sweep on public pages"
```

---

### Task 4: Full verification + deploy

- [ ] **Step 1:** `node --test tests/test_flappy_core.js` and `python -m unittest discover -s tests -v` — all green.
- [ ] **Step 2:** Playwright full pass locally: home (play a few flaps, score/best visible, best persists after reload), blog, write, post, contact.
- [ ] **Step 3:** Push to `main`, wait for Render auto-deploy, re-verify live home + game.
- [ ] **Step 4:** README note: game section (how to play, where score is stored).

## Self-Review

- Spec coverage: game (Task 1), layout + About (Task 2), English (Tasks 2–3), tests (Task 1 + existing suite), deploy (Task 4). No gaps.
- Placeholders: none.
- Type consistency: `createState/step/reset` used identically in tests and UI.
