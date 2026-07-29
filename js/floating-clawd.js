(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FloatingClawd = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var TAU = Math.PI * 2;
  var CROSSING_SECONDS_MIN = 35;
  var CROSSING_SECONDS_MAX = 55;
  var COLLISION_COOLDOWN_MS = 180;
  var COLLISION_SELECTOR = [
    '.nav',
    '#heroAvatar',
    '#heroTitle',
    '#heroSubtitle',
    '.hero-divider',
    '#heroDesc',
    '.hero-scroll-hint',
    '.section-title',
    '.section-subtitle',
    '.about-card',
    '.project-card',
    '.timeline-node',
    '.terminal',
    '.footer-gameover',
    '.footer-colors',
    '.footer-text'
  ].join(',');

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function randomBetween(min, max, random) {
    return min + (max - min) * (random || Math.random)();
  }

  function speedForViewport(viewportWidth, crossingSeconds) {
    var width = Math.max(1, Number(viewportWidth) || 1);
    var seconds = clamp(Number(crossingSeconds) || CROSSING_SECONDS_MIN,
      CROSSING_SECONDS_MIN, CROSSING_SECONDS_MAX);
    return width / seconds;
  }

  function circleRectCollision(circle, rect) {
    var closestX = clamp(circle.x, rect.left, rect.right);
    var closestY = clamp(circle.y, rect.top, rect.bottom);
    var dx = circle.x - closestX;
    var dy = circle.y - closestY;
    var distanceSquared = dx * dx + dy * dy;
    var radiusSquared = circle.radius * circle.radius;
    if (distanceSquared > radiusSquared) return null;

    if (distanceSquared > 0.0001) {
      var distance = Math.sqrt(distanceSquared);
      return {
        normal: { x: dx / distance, y: dy / distance },
        penetration: circle.radius - distance,
        point: { x: closestX, y: closestY }
      };
    }

    var sides = [
      { distance: circle.x - rect.left, normal: { x: -1, y: 0 }, point: { x: rect.left, y: circle.y } },
      { distance: rect.right - circle.x, normal: { x: 1, y: 0 }, point: { x: rect.right, y: circle.y } },
      { distance: circle.y - rect.top, normal: { x: 0, y: -1 }, point: { x: circle.x, y: rect.top } },
      { distance: rect.bottom - circle.y, normal: { x: 0, y: 1 }, point: { x: circle.x, y: rect.bottom } }
    ];
    sides.sort(function (a, b) { return a.distance - b.distance; });
    return {
      normal: sides[0].normal,
      penetration: circle.radius + Math.max(0, sides[0].distance),
      point: sides[0].point
    };
  }

  function reflectVelocity(velocity, normal, restitution) {
    var dot = velocity.x * normal.x + velocity.y * normal.y;
    if (dot >= 0) return { x: velocity.x, y: velocity.y };
    var bounce = (1 + (Number(restitution) || 0.92)) * dot;
    return {
      x: velocity.x - bounce * normal.x,
      y: velocity.y - bounce * normal.y
    };
  }

  function advanceRotation(angle, angularVelocity, deltaSeconds) {
    var next = (angle + angularVelocity * deltaSeconds) % TAU;
    return next < 0 ? next + TAU : next;
  }

  function advancePosition(position, velocity, deltaSeconds) {
    return {
      x: position.x + velocity.x * deltaSeconds,
      y: position.y + velocity.y * deltaSeconds
    };
  }

  function collisionReady(lastHit, now, cooldownMs) {
    return now - lastHit >= (Number(cooldownMs) || COLLISION_COOLDOWN_MS);
  }

  function init(options) {
    options = options || {};
    var view = options.window || (typeof window !== 'undefined' ? window : null);
    var doc = options.document || (view && view.document);
    if (!view || !doc) return null;

    var canvas = options.canvas || doc.getElementById(options.canvasId || 'floatingClawd');
    if (!canvas || !canvas.getContext) return null;
    if (canvas.__floatingClawdController) return canvas.__floatingClawdController;

    var ctx = canvas.getContext('2d');
    var random = options.random || Math.random;
    var reducedMotion = view.matchMedia &&
      view.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var w = 0;
    var h = 0;
    var dpr = 1;
    var scale = 0.25;
    var spriteWidth = 255 * scale;
    var spriteHeight = 164 * scale;
    var collisionRadius = spriteWidth * 0.48;
    var margin = 18;
    var position = { x: 0, y: 0 };
    var target = { x: 0, y: 0 };
    var velocity = { x: 0, y: 0 };
    var speed = 0;
    var angle = reducedMotion ? 0 : random() * TAU;
    var baseAngularVelocity = random() < 0.5 ? -0.16 : 0.16;
    var angularVelocity = baseAngularVelocity;
    var sparks = [];
    var collisionTargets = [];
    var collisionDirty = true;
    var initialized = false;
    var stopped = false;
    var frameId = 0;
    var lastTime = 0;
    var elementCooldowns = typeof WeakMap !== 'undefined' ? new WeakMap() : null;
    var edgeCooldowns = Object.create(null);
    var observer = null;
    var palette = ['#4285F4', '#EA4335', '#FBBC05', '#34A853', '#00ff41', '#b388ff'];

    function readPalette() {
      if (!view.getComputedStyle) return;
      var style = view.getComputedStyle(doc.documentElement);
      var names = ['--blue', '--red', '--yellow', '--green', '--terminal', '--purple'];
      palette = names.map(function (name, index) {
        var value = style.getPropertyValue(name).trim();
        return value || palette[index];
      });
    }

    function chooseTarget(awayNormal) {
      var maxX = Math.max(margin + collisionRadius, w - margin - collisionRadius);
      var maxY = Math.max(margin + collisionRadius, h - margin - collisionRadius);
      var candidate = null;
      for (var attempt = 0; attempt < 16; attempt++) {
        candidate = {
          x: randomBetween(margin + collisionRadius, maxX, random),
          y: randomBetween(margin + collisionRadius, maxY, random)
        };
        if (!awayNormal) break;
        var dx = candidate.x - position.x;
        var dy = candidate.y - position.y;
        var length = Math.sqrt(dx * dx + dy * dy) || 1;
        if ((dx / length) * awayNormal.x + (dy / length) * awayNormal.y > 0.25) break;
      }
      target = candidate;
      speed = speedForViewport(w,
        randomBetween(CROSSING_SECONDS_MIN, CROSSING_SECONDS_MAX, random));
    }

    function isVisibleRect(rect) {
      return rect.width > 2 && rect.height > 2 &&
        rect.right > 0 && rect.bottom > 0 && rect.left < w && rect.top < h;
    }

    function refreshCollisionTargets() {
      collisionTargets = [];
      Array.prototype.forEach.call(doc.querySelectorAll(COLLISION_SELECTOR), function (element) {
        if (element === canvas || !element.getBoundingClientRect) return;
        var rect = element.getBoundingClientRect();
        if (!isVisibleRect(rect)) return;
        collisionTargets.push({
          element: element,
          rect: {
            left: rect.left,
            right: rect.right,
            top: rect.top,
            bottom: rect.bottom,
            width: rect.width,
            height: rect.height
          }
        });
      });
      collisionDirty = false;
    }

    function pointIsFree(x, y) {
      var circle = { x: x, y: y, radius: collisionRadius + 3 };
      return !collisionTargets.some(function (item) {
        return circleRectCollision(circle, item.rect);
      });
    }

    function placeAtFreePosition() {
      for (var attempt = 0; attempt < 40; attempt++) {
        var x = randomBetween(margin + collisionRadius, Math.max(margin + collisionRadius, w - margin - collisionRadius), random);
        var y = randomBetween(margin + collisionRadius, Math.max(margin + collisionRadius, h - margin - collisionRadius), random);
        if (pointIsFree(x, y)) {
          position.x = x;
          position.y = y;
          return;
        }
      }
      position.x = w - margin - collisionRadius;
      position.y = h - margin - collisionRadius;
    }

    function resize() {
      var oldW = w;
      var oldH = h;
      w = Math.max(1, view.innerWidth);
      h = Math.max(1, view.innerHeight);
      dpr = Math.min(view.devicePixelRatio || 1, 2);
      scale = w <= 640 ? 0.18 : 0.25;
      spriteWidth = 255 * scale;
      spriteHeight = 164 * scale;
      collisionRadius = Math.sqrt(
        spriteWidth * spriteWidth + spriteHeight * spriteHeight
      ) / 2;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = false;
      collisionDirty = true;

      if (initialized) {
        if (oldW > 0) position.x = position.x / oldW * w;
        if (oldH > 0) position.y = position.y / oldH * h;
        position.x = clamp(position.x, margin + collisionRadius, w - margin - collisionRadius);
        position.y = clamp(position.y, margin + collisionRadius, h - margin - collisionRadius);
        chooseTarget();
      }
    }

    function drawSprite(armAngle) {
      var ox = 9.23;
      var oy = 8.74;
      var color = '#DA7756';
      var px = -spriteWidth / 2;
      var py = -spriteHeight / 2;

      function rect(sx, sy, sw, sh, fill) {
        ctx.fillStyle = fill;
        ctx.fillRect(
          Math.round(px + (sx - ox) * scale),
          Math.round(py + (sy - oy) * scale),
          Math.max(1, Math.round(sw * scale)),
          Math.max(1, Math.round(sh * scale))
        );
      }

      function arm(pivotX, pivotY, armX, armY, armWidth, armHeight, sign) {
        ctx.save();
        ctx.translate(
          Math.round(px + (pivotX - ox) * scale),
          Math.round(py + (pivotY - oy) * scale)
        );
        ctx.rotate(armAngle * sign);
        ctx.fillStyle = color;
        ctx.fillRect(
          Math.round((armX - pivotX) * scale),
          Math.round((armY - pivotY) * scale),
          Math.max(1, Math.round(armWidth * scale)),
          Math.max(1, Math.round(armHeight * scale))
        );
        ctx.restore();
      }

      rect(40.9, 8.74, 191.6, 127.85, color);
      arm(48.9, 58.45, 9.23, 42.62, 39.67, 31.66, -1);
      arm(224, 58.45, 224, 42.62, 40.17, 31.66, 1);
      rect(57.4, 144.59, 15.39, 28.18, color);
      rect(89.29, 144.59, 15.76, 28.18, color);
      rect(168.67, 144.59, 15.6, 28.18, color);
      rect(200.04, 144.59, 15.18, 28.18, color);
      rect(73.24, 42.62, 16.26, 30.66, '#000');
      rect(183.9, 42.62, 16.26, 30.66, '#000');
    }

    function spawnSparks(point) {
      for (var index = 0; index < 6; index++) {
        var sparkAngle = random() * TAU;
        var sparkSpeed = randomBetween(22, 48, random);
        var life = randomBetween(0.3, 0.45, random);
        sparks.push({
          x: point.x,
          y: point.y,
          vx: Math.cos(sparkAngle) * sparkSpeed,
          vy: Math.sin(sparkAngle) * sparkSpeed,
          life: life,
          maxLife: life,
          size: random() < 0.35 ? 3 : 2,
          color: palette[Math.floor(random() * palette.length)]
        });
      }
    }

    function flashElement(element) {
      if (!element || !element.classList) return;
      element.classList.remove('floating-clawd-hit');
      void element.offsetWidth;
      element.classList.add('floating-clawd-hit');
      view.setTimeout(function () {
        element.classList.remove('floating-clawd-hit');
      }, COLLISION_COOLDOWN_MS);
    }

    function canTriggerElement(element, now) {
      if (!elementCooldowns) return true;
      var lastHit = elementCooldowns.get(element) || -Infinity;
      if (!collisionReady(lastHit, now, COLLISION_COOLDOWN_MS)) return false;
      elementCooldowns.set(element, now);
      return true;
    }

    function triggerImpact(element, point, normal, now, edgeName) {
      var canTrigger = true;
      if (element) canTrigger = canTriggerElement(element, now);
      if (edgeName) {
        var lastEdgeHit = edgeCooldowns[edgeName] || -Infinity;
        canTrigger = collisionReady(lastEdgeHit, now, COLLISION_COOLDOWN_MS);
        if (canTrigger) edgeCooldowns[edgeName] = now;
      }
      if (!canTrigger) return;

      if (element) flashElement(element);
      spawnSparks(point);
      var turn = normal.x * velocity.y - normal.y * velocity.x;
      var direction = turn === 0 ? (random() < 0.5 ? -1 : 1) : (turn < 0 ? -1 : 1);
      angularVelocity = clamp(-angularVelocity + direction * randomBetween(0.55, 1.05, random), -1.6, 1.6);
    }

    function bounceFromNormal(normal, point, now, element, edgeName) {
      var dot = velocity.x * normal.x + velocity.y * normal.y;
      if (dot >= -0.01) return;
      velocity = reflectVelocity(velocity, normal, 0.92);
      chooseTarget(normal);
      triggerImpact(element, point, normal, now, edgeName);
    }

    function collideWithViewport(now) {
      var left = margin + collisionRadius;
      var right = w - margin - collisionRadius;
      var top = margin + collisionRadius;
      var bottom = h - margin - collisionRadius;

      if (position.x < left) {
        position.x = left;
        bounceFromNormal({ x: 1, y: 0 }, { x: margin, y: position.y }, now, null, 'left');
      } else if (position.x > right) {
        position.x = right;
        bounceFromNormal({ x: -1, y: 0 }, { x: w - margin, y: position.y }, now, null, 'right');
      }
      if (position.y < top) {
        position.y = top;
        bounceFromNormal({ x: 0, y: 1 }, { x: position.x, y: margin }, now, null, 'top');
      } else if (position.y > bottom) {
        position.y = bottom;
        bounceFromNormal({ x: 0, y: -1 }, { x: position.x, y: h - margin }, now, null, 'bottom');
      }
    }

    function collideWithElements(now) {
      var circle = { x: position.x, y: position.y, radius: collisionRadius };
      for (var index = 0; index < collisionTargets.length; index++) {
        var item = collisionTargets[index];
        var collision = circleRectCollision(circle, item.rect);
        if (!collision) continue;
        position.x += collision.normal.x * (collision.penetration + 2);
        position.y += collision.normal.y * (collision.penetration + 2);
        bounceFromNormal(collision.normal, collision.point, now, item.element);
        break;
      }
    }

    function updateSparks(deltaSeconds) {
      for (var index = sparks.length - 1; index >= 0; index--) {
        var spark = sparks[index];
        spark.life -= deltaSeconds;
        if (spark.life <= 0) {
          sparks.splice(index, 1);
          continue;
        }
        spark.x += spark.vx * deltaSeconds;
        spark.y += spark.vy * deltaSeconds;
        spark.vx *= Math.pow(0.96, deltaSeconds * 60);
        spark.vy *= Math.pow(0.96, deltaSeconds * 60);
      }
    }

    function update(deltaSeconds, now) {
      if (collisionDirty) refreshCollisionTargets();
      var dx = target.x - position.x;
      var dy = target.y - position.y;
      var distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < collisionRadius * 1.5) {
        chooseTarget();
        dx = target.x - position.x;
        dy = target.y - position.y;
        distance = Math.sqrt(dx * dx + dy * dy);
      }

      var desiredX = distance ? dx / distance * speed : 0;
      var desiredY = distance ? dy / distance * speed : 0;
      var steering = 1 - Math.exp(-0.58 * deltaSeconds);
      velocity.x += (desiredX - velocity.x) * steering;
      velocity.y += (desiredY - velocity.y) * steering;
      position = advancePosition(position, velocity, deltaSeconds);

      collideWithViewport(now);
      collideWithElements(now);
      angularVelocity += (baseAngularVelocity - angularVelocity) *
        (1 - Math.exp(-0.65 * deltaSeconds));
      angle = advanceRotation(angle, angularVelocity, deltaSeconds);
      updateSparks(deltaSeconds);
    }

    function draw() {
      ctx.clearRect(0, 0, w, h);
      for (var index = 0; index < sparks.length; index++) {
        var spark = sparks[index];
        ctx.globalAlpha = spark.life / spark.maxLife;
        ctx.fillStyle = spark.color;
        ctx.fillRect(Math.round(spark.x), Math.round(spark.y), spark.size, spark.size);
      }
      ctx.globalAlpha = 1;
      ctx.save();
      ctx.translate(Math.round(position.x), Math.round(position.y));
      ctx.rotate(angle);
      drawSprite(Math.sin(angle * 1.7) * 0.22);
      ctx.restore();
    }

    function frame(now) {
      if (stopped) return;
      var deltaSeconds = lastTime ? Math.min(0.05, (now - lastTime) / 1000) : 1 / 60;
      lastTime = now;
      if (!reducedMotion) update(deltaSeconds, now);
      draw();
      if (!reducedMotion) frameId = view.requestAnimationFrame(frame);
    }

    function markCollisionDirty() {
      collisionDirty = true;
    }

    function handleResize() {
      resize();
      if (collisionDirty) refreshCollisionTargets();
      if (reducedMotion) draw();
    }

    function cleanup() {
      stopped = true;
      if (frameId) view.cancelAnimationFrame(frameId);
      view.removeEventListener('resize', handleResize);
      view.removeEventListener('scroll', markCollisionDirty);
      doc.removeEventListener('site:ready', markCollisionDirty);
      if (observer) observer.disconnect();
      canvas.__floatingClawdController = null;
    }

    resize();
    readPalette();
    refreshCollisionTargets();
    placeAtFreePosition();
    initialized = true;
    chooseTarget();
    var initialDistance = Math.sqrt(
      Math.pow(target.x - position.x, 2) + Math.pow(target.y - position.y, 2)
    ) || 1;
    velocity.x = (target.x - position.x) / initialDistance * speed;
    velocity.y = (target.y - position.y) / initialDistance * speed;

    view.addEventListener('resize', handleResize);
    view.addEventListener('scroll', markCollisionDirty, { passive: true });
    doc.addEventListener('site:ready', markCollisionDirty);
    if (view.MutationObserver && doc.body) {
      observer = new view.MutationObserver(markCollisionDirty);
      observer.observe(doc.body, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: ['style', 'hidden']
      });
    }

    var controller = {
      cleanup: cleanup,
      refreshCollisions: markCollisionDirty
    };
    canvas.__floatingClawdController = controller;
    frameId = view.requestAnimationFrame(frame);
    return controller;
  }

  return {
    CROSSING_SECONDS_MIN: CROSSING_SECONDS_MIN,
    CROSSING_SECONDS_MAX: CROSSING_SECONDS_MAX,
    COLLISION_COOLDOWN_MS: COLLISION_COOLDOWN_MS,
    COLLISION_SELECTOR: COLLISION_SELECTOR,
    speedForViewport: speedForViewport,
    circleRectCollision: circleRectCollision,
    reflectVelocity: reflectVelocity,
    advanceRotation: advanceRotation,
    advancePosition: advancePosition,
    collisionReady: collisionReady,
    init: init
  };
});
