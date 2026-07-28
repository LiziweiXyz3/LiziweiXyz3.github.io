const test = require('node:test');
const assert = require('node:assert/strict');
const api = require('../js/site-behaviors.js');

test('avatar begins standing, jumps on downward scroll and stands on upward scroll', function () {
  let y = 0;
  const image = { src: '', style: {} };
  const avatar = api.createAvatarController(image, function () { return y; });

  assert.equal(avatar.getState(), 'stand');
  assert.match(image.src, /selfie_stand\.png$/);

  y = 30;
  avatar.onScroll();
  assert.equal(avatar.getState(), 'jump');
  assert.match(image.src, /selfie_jump\.png$/);

  y = 0;
  avatar.onScroll();
  assert.equal(avatar.getState(), 'stand');
});

test('avatar accumulates smooth-scroll movement before changing state', function () {
  let y = 0;
  const image = { src: '', style: {} };
  const avatar = api.createAvatarController(image, function () { return y; });

  y = 4;
  avatar.onScroll();
  y = 8;
  avatar.onScroll();
  assert.equal(avatar.getState(), 'stand');

  y = 12;
  avatar.onScroll();
  assert.equal(avatar.getState(), 'jump');

  y = 7;
  avatar.onScroll();
  y = 1;
  avatar.onScroll();
  assert.equal(avatar.getState(), 'stand');
});

test('mini game difficulty uses the agreed capped speed constants', function () {
  assert.deepEqual(api.GAME_CONFIG, {
    startSpeed: 1,
    maxSpeed: 2.5,
    speedStep: 0.15,
    speedEveryFrames: 600,
    firstObstacleRatio: 0.6,
    minObstacleGap: 260,
    maxObstacleGap: 360,
    maxObstacles: 3,
    jumpVelocity: -6,
    riseGravity: 0.18,
    fallGravity: 0.08,
    anticipationFrames: 6
  });
});

test('mini game descends more slowly than it rises', function () {
  let y = 0;
  let velocity = api.GAME_CONFIG.jumpVelocity;
  let riseFrames = 0;
  let fallFrames = 0;

  do {
    y += velocity;
    if (velocity < 0) {
      velocity += api.GAME_CONFIG.riseGravity;
      riseFrames++;
    } else {
      velocity += api.GAME_CONFIG.fallGravity;
      fallFrames++;
    }
  } while (y < 0 && riseFrames + fallFrames < 180);

  assert.ok(riseFrames >= 33 && riseFrames <= 35);
  assert.ok(fallFrames >= 49 && fallFrames <= 51);
  assert.ok(fallFrames >= riseFrames * 1.4);
  assert.ok(velocity <= 4.2);
});

test('mini game pacing starts nearer and spaces at most three obstacles by distance', function () {
  assert.equal(api.firstObstacleX(800), 480);
  assert.equal(api.obstacleGap(0), 260);
  assert.equal(api.obstacleGap(0.5), 310);
  assert.equal(api.obstacleGap(1), 360);
  assert.equal(api.canSpawnObstacle(800, 600, 1, 260), false);
  assert.equal(api.canSpawnObstacle(800, 540, 1, 260), true);
  assert.equal(api.canSpawnObstacle(800, 400, 3, 260), false);
});
