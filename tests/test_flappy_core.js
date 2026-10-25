const test = require('node:test');
const assert = require('node:assert');
const { createState, step, reset } = require('../js/flappy.js');

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
  // 40 steps, not 10: FLAP=-5.2 needs ~15 frames of gravity before the bird
  // stops rising, so 10 steps would still show a lower y.
  for (let i = 0; i < 40; i++) step(s, false);
  assert.ok(s.bird.y > firstY);
  for (let i = 0; i < 600 && !s.over; i++) step(s, false);
  assert.strictEqual(s.over, true);
});

test('score increments once per passed pipe and best is kept on death', () => {
  const s = createState();
  s.started = true;
  // x=20 so the pipe is already past the bird's trailing edge after one move;
  // gapY=200 keeps the bird inside the gap at y~235.
  s.pipes.push({ x: 20, gapY: 200, passed: false });
  step(s, true);
  assert.strictEqual(s.score, 1);
  step(s, true);
  assert.strictEqual(s.score, 1);
  for (let i = 0; i < 600 && !s.over; i++) step(s, false);
  assert.strictEqual(s.over, true);
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
