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
    speedEveryFrames: 600
  });
});
