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

test('language splitter keeps Resume highlight English independently editable', function () {
  assert.deepEqual(api.splitTextByLanguage('Text-to-SQL 数据增长策略'), [
    { lang: 'en', text: 'Text-to-SQL ' },
    { lang: 'zh-CN', text: '数据增长策略' }
  ]);
  assert.deepEqual(api.splitTextByLanguage('AB 测试设计'), [
    { lang: 'en', text: 'AB ' },
    { lang: 'zh-CN', text: '测试设计' }
  ]);
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
    startSpeed: 0.9,
    maxSpeed: 1.8,
    speedStep: 0.05,
    speedEveryFrames: 450,
    firstObstacleRatio: 0.6,
    minObstacleGap: 330,
    maxObstacleGap: 450,
    maxObstacles: 2,
    jumpVelocity: -6.2,
    riseGravity: 0.16,
    fallGravity: 0.065,
    hangFrames: 10,
    anticipationFrames: 3,
    landingFrames: 5,
    sequences: []
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

  assert.ok(riseFrames >= 38 && riseFrames <= 40);
  assert.ok(fallFrames >= 61 && fallFrames <= 63);
  assert.ok(fallFrames >= riseFrames * 1.4);
  assert.ok(velocity <= 4.2);
});

test('mini game pacing starts nearer and spaces at most two obstacles by distance', function () {
  assert.equal(api.firstObstacleX(800), 480);
  assert.equal(api.obstacleGap(0), 330);
  assert.equal(api.obstacleGap(0.5), 390);
  assert.equal(api.obstacleGap(1), 450);
  assert.equal(api.canSpawnObstacle(800, 600, 1, 330), false);
  assert.equal(api.canSpawnObstacle(800, 470, 1, 330), true);
  assert.equal(api.canSpawnObstacle(800, 400, 2, 330), false);
});

test('multi-obstacle sequences unlock only when the current speed makes them passable', function () {
  const config = {
    ...api.GAME_CONFIG,
    startSpeed: 0.9,
    maxSpeed: 1.8,
    maxObstacles: 2,
    jumpVelocity: -6.2,
    riseGravity: 0.16,
    fallGravity: 0.065,
    hangFrames: 10
  };
  const doubleSmall = {
    items: [
      { type: 'cactus-small', gap: 28 },
      { type: 'cactus-small', gap: 0 }
    ]
  };
  const mixed = {
    items: [
      { type: 'cactus-small', gap: 42 },
      { type: 'cactus-big', gap: 0 }
    ]
  };

  assert.equal(api.isSequencePlayable(doubleSmall, 0.9, config), true);
  assert.equal(api.isSequencePlayable(mixed, 0.9, config), false);
  assert.equal(api.isSequencePlayable(mixed, 1.2, config), true);
});

test('friendly progression delays and de-emphasizes multi-obstacle sequences', function () {
  const doubleSmall = {
    weight: 8,
    items: [
      { type: 'cactus-small', gap: 28 },
      { type: 'cactus-small', gap: 0 }
    ]
  };
  const mixed = {
    weight: 8,
    items: [
      { type: 'cactus-small', gap: 42 },
      { type: 'cactus-big', gap: 0 }
    ]
  };
  const single = { weight: 4, items: [{ type: 'cactus-small', gap: 0 }] };

  assert.equal(api.isSequenceUnlocked(doubleSmall, 1.8, 899), false);
  assert.equal(api.isSequenceUnlocked(doubleSmall, 1.05, 900), false);
  assert.equal(api.isSequenceUnlocked(doubleSmall, 1.1, 900), true);
  assert.equal(api.isSequenceUnlocked(mixed, 1.2, 1800), false);
  assert.equal(api.isSequenceUnlocked(mixed, 1.25, 1800), true);
  assert.equal(api.sequenceWeight(single), 4);
  assert.equal(api.sequenceWeight(doubleSmall), 1);
  assert.equal(api.sequenceWeight(mixed), 1);
});
