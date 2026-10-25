/* Arctic flappy bird: pure state machine (Node-testable) + canvas UI (browser only). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.FlappyCore = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const W = 360, H = 480;
  const BIRD_X = 90, BIRD_R = 11;
  const GRAVITY = 0.35, FLAP = -5.2;
  const PIPE_W = 52, PIPE_GAP = 128, PIPE_SPEED = 2.2, SPAWN_EVERY = 96;

  function createState() {
    return {
      bird: { y: H / 2, vy: 0 },
      pipes: [], score: 0, best: 0, over: false, started: false, frame: 0,
    };
  }

  function step(state, flap) {
    if (state.over) return state;

    if (flap && !state.started) state.started = true;
    if (state.started) {
      state.bird.vy += GRAVITY;
      if (flap) state.bird.vy = FLAP;
      state.bird.y += state.bird.vy;
    }

    for (const pipe of state.pipes) pipe.x -= PIPE_SPEED;
    state.pipes = state.pipes.filter((pipe) => pipe.x > -PIPE_W);

    state.frame++;
    if (state.started && state.frame % SPAWN_EVERY === 0) {
      state.pipes.push({ x: W, gapY: 70 + Math.random() * (H - 140 - PIPE_GAP), passed: false });
    }

    for (const pipe of state.pipes) {
      if (!pipe.passed && pipe.x + PIPE_W < BIRD_X - BIRD_R) {
        pipe.passed = true;
        state.score++;
      }
    }

    if (state.started) {
      const top = state.bird.y - BIRD_R, bottom = state.bird.y + BIRD_R;
      let hit = top < 0 || bottom > H;
      for (const pipe of state.pipes) {
        const overlaps = BIRD_X + BIRD_R > pipe.x && BIRD_X - BIRD_R < pipe.x + PIPE_W;
        if (overlaps && (top < pipe.gapY || bottom > pipe.gapY + PIPE_GAP)) hit = true;
      }
      if (hit) {
        state.over = true;
        state.best = Math.max(state.best, state.score);
      }
    }
    return state;
  }

  function reset(state) {
    state.bird.y = H / 2;
    state.bird.vy = 0;
    state.pipes = [];
    state.score = 0;
    state.over = false;
    state.started = false;
    state.frame = 0;
    return state;
  }

  const BEST_KEY = 'flappyArcticBirdBestScore';
  const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

  function loadBest() {
    try {
      return parseInt(localStorage.getItem(BEST_KEY), 10) || 0;
    } catch (err) {
      return 0;
    }
  }

  function saveBest(value) {
    try {
      localStorage.setItem(BEST_KEY, String(value));
    } catch (err) {
      /* storage can be blocked (private mode); losing the best score is acceptable */
    }
  }

  function roundedRect(ctx, x, y, w, h, r) {
    if (h <= 0) return;
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
    ctx.fill();
  }

  function draw(ctx, state) {
    ctx.clearRect(0, 0, W, H);

    const ice = ctx.createLinearGradient(0, 0, 0, H);
    ice.addColorStop(0, '#9ad7ff');
    ice.addColorStop(1, '#5b9bd5');
    ctx.fillStyle = ice;
    for (const pipe of state.pipes) {
      roundedRect(ctx, pipe.x, 0, PIPE_W, pipe.gapY, 7);
      roundedRect(ctx, pipe.x, pipe.gapY + PIPE_GAP, PIPE_W, H - pipe.gapY - PIPE_GAP, 7);
    }

    const ground = ctx.createLinearGradient(0, H - 28, 0, H);
    ground.addColorStop(0, 'rgba(154,215,255,0)');
    ground.addColorStop(1, 'rgba(154,215,255,0.2)');
    ctx.fillStyle = ground;
    ctx.fillRect(0, H - 28, W, 28);

    ctx.save();
    ctx.translate(BIRD_X, state.bird.y);
    ctx.rotate(Math.max(-0.45, Math.min(0.9, state.bird.vy * 0.06)));
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, BIRD_R, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0a0e15';
    ctx.beginPath();
    ctx.arc(4, -4, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f08c3a';
    ctx.beginPath();
    ctx.moveTo(BIRD_R - 2, 1);
    ctx.lineTo(BIRD_R + 8, 4);
    ctx.lineTo(BIRD_R - 2, 7);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = 'rgba(255,255,255,0.94)';
    ctx.font = '700 46px ' + FONT;
    ctx.fillText(String(state.score), W / 2, 22);

    if (!state.started || state.over) {
      const lines = state.over
        ? ['game over', `score ${state.score} · best ${state.best}`, 'tap or press space to retry']
        : ['tap or press space to fly'];
      // pre-start hint sits below the bird; game-over box is centered
      const top = state.over ? H / 2 - (lines.length * 22) / 2 : H * 0.68;
      ctx.fillStyle = 'rgba(10,14,21,0.55)';
      ctx.fillRect(0, top - 14, W, lines.length * 22 + 28);
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#e9e7e2';
      ctx.font = '600 15px ' + FONT;
      lines.forEach((line, i) => ctx.fillText(line, W / 2, top + 11 + i * 22));
    }
  }

  function boot() {
    const canvas = document.querySelector('#game-panel canvas') || document.getElementById('flappy');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.width = '100%';
    canvas.style.height = 'auto';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const state = createState();
    state.best = loadBest();
    if (!canvas.hasAttribute('tabindex')) canvas.tabIndex = 0;
    let raf = 0;

    function afterStep() {
      draw(ctx, state);
      if (state.over) {
        saveBest(state.best);
        return;
      }
      if (!raf) raf = requestAnimationFrame(loop);
    }

    function loop() {
      raf = 0;
      step(state, false);
      afterStep();
    }

    function flap() {
      if (state.over) reset(state);
      step(state, true);
      afterStep();
    }

    canvas.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      canvas.focus();
      flap();
    });

    canvas.addEventListener('keydown', (event) => {
      if (event.code === 'Space' || event.key === ' ') {
        event.preventDefault();
        flap();
      }
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (raf) cancelAnimationFrame(raf);
        raf = 0;
      } else if (!state.over && state.started) {
        raf = requestAnimationFrame(loop);
      }
    });

    draw(ctx, state);
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
  }

  return { W, H, createState, step, reset };
});
