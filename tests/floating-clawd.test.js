const test = require('node:test');
const assert = require('node:assert/strict');
const physics = require('../js/floating-clawd.js');

test('floating speed crosses the viewport in the agreed 35 to 55 seconds', function () {
  assert.equal(physics.CROSSING_SECONDS_MIN, 35);
  assert.equal(physics.CROSSING_SECONDS_MAX, 55);
  assert.equal(physics.speedForViewport(1920, 35), 1920 / 35);
  assert.equal(physics.speedForViewport(1920, 55), 1920 / 55);
  assert.equal(physics.speedForViewport(1920, 10), 1920 / 35);
  assert.equal(physics.speedForViewport(1920, 80), 1920 / 55);
});

test('position integration is frame-rate independent', function () {
  const velocity = { x: 48, y: -24 };
  let sixtyFps = { x: 10, y: 20 };
  let thirtyFps = { x: 10, y: 20 };

  for (let index = 0; index < 60; index++) {
    sixtyFps = physics.advancePosition(sixtyFps, velocity, 1 / 60);
  }
  for (let index = 0; index < 30; index++) {
    thirtyFps = physics.advancePosition(thirtyFps, velocity, 1 / 30);
  }

  assert.ok(Math.abs(sixtyFps.x - thirtyFps.x) < 1e-9);
  assert.ok(Math.abs(sixtyFps.y - thirtyFps.y) < 1e-9);
});

test('circle collision reports the outward normal and penetration for visible blocks', function () {
  const collision = physics.circleRectCollision(
    { x: 95, y: 50, radius: 10 },
    { left: 100, right: 180, top: 20, bottom: 90 }
  );
  assert.deepEqual(collision.normal, { x: -1, y: 0 });
  assert.equal(collision.penetration, 5);
  assert.deepEqual(collision.point, { x: 100, y: 50 });
  assert.equal(physics.circleRectCollision(
    { x: 40, y: 40, radius: 8 },
    { left: 100, right: 180, top: 20, bottom: 90 }
  ), null);
});

test('a character spawned inside a block receives the shortest escape direction', function () {
  const collision = physics.circleRectCollision(
    { x: 105, y: 55, radius: 12 },
    { left: 100, right: 180, top: 20, bottom: 90 }
  );
  assert.deepEqual(collision.normal, { x: -1, y: 0 });
  assert.equal(collision.penetration, 17);
});

test('mouse cursor collision reports a stable outward direction and contact point', function () {
  const collision = physics.circleCircleCollision(
    { x: 120, y: 80, radius: 30 },
    { x: 100, y: 80, radius: 18 }
  );
  assert.deepEqual(collision.normal, { x: 1, y: 0 });
  assert.equal(collision.penetration, 28);
  assert.deepEqual(collision.point, { x: 118, y: 80 });
  assert.equal(physics.circleCircleCollision(
    { x: 200, y: 80, radius: 30 },
    { x: 100, y: 80, radius: 18 }
  ), null);
});

test('velocity reflects only when moving into a surface', function () {
  assert.deepEqual(
    physics.reflectVelocity({ x: 20, y: 5 }, { x: -1, y: 0 }, 1),
    { x: -20, y: 5 }
  );
  assert.deepEqual(
    physics.reflectVelocity({ x: -20, y: 5 }, { x: -1, y: 0 }, 1),
    { x: -20, y: 5 }
  );
});

test('free rotation supports a complete upside-down pose and wraps safely', function () {
  assert.equal(physics.advanceRotation(0, Math.PI, 1), Math.PI);
  assert.equal(physics.advanceRotation(0, Math.PI, 2), 0);
  assert.equal(physics.advanceRotation(0, -Math.PI / 2, 1), Math.PI * 1.5);
});

test('arm motion uses an independent two-and-a-half-second cycle', function () {
  assert.equal(physics.ARM_SWING_CYCLE_SECONDS, 2.5);
  const cycleSeconds = Math.PI * 2 / physics.ARM_SWING_RADIANS_PER_SECOND;
  assert.ok(Math.abs(cycleSeconds - 2.5) < 1e-9);
});

test('the second character uses the blue complementary body color', function () {
  assert.equal(physics.DEFAULT_BODY_COLOR, '#DA7756');
  assert.equal(physics.COMPLEMENTARY_BODY_COLOR, '#56B9DA');
});

test('wide screens expose two side lanes outside the central 1000px content corridor', function () {
  const lanes = physics.sideLaneGeometry(1920, 38, 18, 1000, 18);
  assert.equal(lanes.available, true);
  assert.deepEqual(lanes.corridor, { left: 460, right: 1460 });
  assert.deepEqual(lanes.left, { min: 56, max: 404 });
  assert.deepEqual(lanes.right, { min: 1516, max: 1864 });

  const narrow = physics.sideLaneGeometry(1200, 38, 18, 1000, 18);
  assert.equal(narrow.available, false);
});

test('leaving one outer edge wraps the character to the opposite side', function () {
  assert.deepEqual(
    physics.wrapAcrossViewport(-39, 38, 1920, 'left'),
    { x: 1958, lane: 'right', wrapped: true }
  );
  assert.deepEqual(
    physics.wrapAcrossViewport(1959, 38, 1920, 'right'),
    { x: -38, lane: 'left', wrapped: true }
  );
  assert.deepEqual(
    physics.wrapAcrossViewport(-38, 38, 1920, 'left'),
    { x: -38, lane: 'left', wrapped: false }
  );
});

test('collision targets use top-level visible blocks instead of nested labels', function () {
  [
    '.nav', '#heroAvatar', '#heroTitle', '.about-card',
    '.project-card', '.timeline-node', '.terminal', '.footer-text'
  ].forEach(function (selector) {
    assert.match(physics.COLLISION_SELECTOR, new RegExp(selector.replace(/[.#]/g, '\\$&')));
  });
  assert.doesNotMatch(physics.COLLISION_SELECTOR, /project-tag|node-tag|stat-row|skill-slot/);
  assert.equal(physics.COLLISION_COOLDOWN_MS, 180);
});

test('collision feedback is throttled during the 180ms cooldown', function () {
  assert.equal(physics.collisionReady(1000, 1179, 180), false);
  assert.equal(physics.collisionReady(1000, 1180, 180), true);
  assert.equal(physics.collisionReady(-Infinity, 0, 180), true);
});
