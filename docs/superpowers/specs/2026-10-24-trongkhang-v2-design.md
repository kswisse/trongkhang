# Design Document — Trong Khang v2

## Overview
V2 adds a quick-play Flappy-style arctic bird mini-game to the home page while preserving the existing minimalist dark-arctic about block. The design is a small, self-contained 2-column horizontal layout on desktop, full-width on mobile, featuring an always-visible game panel that demonstrates the site's unique polar/bird theme and adds an engaging micro‑interaction.

## Current State (v1)
- About: Vietnamese copy (original version maintained), with two-column design.
- Home page: single column.
- No interactive mini-game.

## Requirements
1. Renderizable with vanilla JS (no extra CDN, no frameworks) – core game is simple canvas + raf loop.
2. Sticky game panel (desktop) or full-width block (mobile) on the home page.
3. One-time score storage using localStorage (best score).
4. Minimal styling — follow the theme's aesthetic: dark arctic, white bird, light-blue pipes, transparent overlay for text.
5. Use the existing home page structure; modify the grid layout from single to horizontal (desktop) / stacked (mobile).
6. Site language: English copy (the About text in index.html and all documentation). Maintain existing Vietnamese-only sections where explicitly intended.
7. Include game instructions, score tracking, and a game-over screen with message (press space to fly to continue).

## Key Features
- **Game panel** – horizontal on desktop (sticky), stacked below About on mobile.
- **No authentication** – uses only localStorage.
- **Theme integration** – uses existing CSS (theme.css, style.css), integrates smoothly with color schemes.
- **Simple display** – game lives in its own panel; the About text remains unchanged.
- **Basic interactions** – spacebar or click to flap; game loop.
- **Cross-browser** – canvas fallback handling.

## Technologies
- HTML5 Canvas (vanilla JS)
- CSS grid/flex (desktop vs. mobile breakpoints)
- localStorage for persistence
- existing CSS (theme.css, style.css) – no new dependencies

## Game Logic (sketch)
- Bird initialization: start at x=100, y=mid, velocity=0.
- RAF loop:
  - Gravity: downward velocity (increment: 0.4).
  - Player action: upward impulse (+ -5) on space/click.
  - Update bird.y = bird.y + velocity.
  - Render bird (white circle with subtle shadow) and pipes (light-blue pillars).
  - Pipe generation: spawn a new pair at right edge; pipe x decreases by constant speed; high pipes use two arrays (low/high heights).
  - Score: increment when bird passes through pipe pair.
  - Collision: simple bounding box check (bird + pipes).
  - Game over: show <score>/<best> overlay; press space to restart.
- Storage: best score key = "flappyArcticBirdBestScore".
- Instructions: initial text "press space to fly" — disappears after first flap.

## Design Decisions & Constraints
- Keep codebase small and focused – vanilla JS ensures low footprint and no external dependencies.
- Grid layout: double-column (desktop), text left, game right; each panel has its own max-width and visual style.
- The game panel is sticky on desktop but sits below the About text on mobile.
- Canvas should handle redraw automatically on resize.
- Use minimal assets – rendering everything with canvas gives maximum control over performance.
- localStorage key: "flappyArcticBirdBestScore".
- Game must include clear instructions, score tracking, and a game-over screen with message (press space to fly to continue).

## Implementation Approach (baseline)
1. Extract game logic into `js/flappy.js`.
2. Add CSS panel styling: `.game-panel { border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; background: rgba(0,0,0,0.4); padding: 12px; }`.
3. Create horizontal grid in `index.html` around existing About text and the new game panel.
4. Write unit tests in `tests/test_flappy.js` – cover game-loop core and simple input actions.
5. Ensure localStorage uses key `flappyArcticBirdBestScore`.
6. Add README section on how to play.

## Timeline (max 2 days)
- Day 1: Polish – prepare CSS/SVG assets; implement core game logic and basic display.
- Day 2: Test – unit tests; game playability on desktop + mobile; integration with home page.