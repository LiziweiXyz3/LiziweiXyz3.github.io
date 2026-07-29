(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.SiteBehaviors = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var GAME_CONFIG = Object.freeze({
    startSpeed: 0.9,
    maxSpeed: 1.8,
    speedStep: 0.05,
    speedEveryFrames: 900,
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

  function splitTextByLanguage(value) {
    var parts = [];
    var current = '';
    var language = 'zh-CN';

    function flush() {
      if (!current) return;
      parts.push({ lang: language, text: current });
      current = '';
    }

    String(value || '').split('').forEach(function (character) {
      var nextLanguage = language;
      if (/[A-Za-z0-9_+#@&/.-]/.test(character)) nextLanguage = 'en';
      else if (/[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/.test(character)) nextLanguage = 'zh-CN';
      if (current && nextLanguage !== language) flush();
      language = nextLanguage;
      current += character;
    });
    flush();
    return parts;
  }

  function firstObstacleX(width, config) {
    var active = config || GAME_CONFIG;
    return Math.round(Number(width) * Number(active.firstObstacleRatio));
  }

  function obstacleGap(randomValue, config) {
    var active = config || GAME_CONFIG;
    var safe = Math.max(0, Math.min(1, Number(randomValue)));
    return Math.round(Number(active.minObstacleGap) +
      (Number(active.maxObstacleGap) - Number(active.minObstacleGap)) * safe);
  }

  function canSpawnObstacle(width, latestX, count, nextGap, config) {
    var active = config || GAME_CONFIG;
    return count < Number(active.maxObstacles) && Number(width) - Number(latestX) >= Number(nextGap);
  }

  function obstacleWidth(type) {
    return type === 'cactus-big' ? 16 : 10;
  }

  function sequenceSpan(sequence, config) {
    var active = config || GAME_CONFIG;
    var items = sequence && Array.isArray(sequence.items)
      ? sequence.items.slice(0, Number(active.maxObstacles) || 1) : [];
    return items.reduce(function (span, item, index) {
      var gap = index < items.length - 1 ? Math.max(24, Number(item.gap) || 40) : 0;
      return span + obstacleWidth(item.type) + gap;
    }, 0);
  }

  function jumpClearanceFrames(config, obstacleHeight) {
    var active = config || GAME_CONFIG;
    var velocity = Number(active.jumpVelocity);
    var riseGravity = Number(active.riseGravity);
    var fallGravity = Number(active.fallGravity);
    var hangFrames = Math.max(0, Number(active.hangFrames) || 0);
    var requiredRise = Math.max(0, Number(obstacleHeight) - 4);
    var displacement = 0;
    var hangTimer = 0;
    var clearFrames = 0;

    for (var frame = 0; frame < 360; frame++) {
      if (hangTimer > 0) {
        hangTimer--;
      } else {
        displacement -= velocity;
        var nextVelocity = velocity + (velocity < 0 ? riseGravity : fallGravity);
        if (velocity < 0 && nextVelocity >= 0 && hangFrames > 0) {
          velocity = 0;
          hangTimer = hangFrames;
        } else {
          velocity = nextVelocity;
        }
      }
      if (displacement >= requiredRise) clearFrames++;
      if (frame > 0 && displacement <= 0 && velocity > 0) break;
    }
    return clearFrames;
  }

  function isSequencePlayable(sequence, speed, config) {
    var active = config || GAME_CONFIG;
    var items = sequence && Array.isArray(sequence.items)
      ? sequence.items.slice(0, Number(active.maxObstacles) || 1) : [];
    if (items.length <= 1) return true;

    var tallest = items.some(function (item) { return item.type === 'cactus-big'; }) ? 38 : 26;
    var availableDistance = jumpClearanceFrames(active, tallest) * Math.max(0, Number(speed) || 0);
    var playerCollisionWidth = 30;
    var timingMargin = 8;
    var requiredDistance = sequenceSpan({ items: items }, active) + playerCollisionWidth + timingMargin;
    return availableDistance >= requiredDistance;
  }

  function createAvatarController(image, getScrollY, options) {
    options = options || {};
    var state = 'stand';
    var lastScroll = typeof getScrollY === 'function' ? getScrollY() : 0;
    var threshold = Math.max(1, Number(options.threshold) || 10);
    var standSrc = options.standSrc || 'selfie_stand.png';
    var jumpSrc = options.jumpSrc || 'selfie_jump.png';

    function applyState(nextState) {
      state = nextState;
      if (!image) return;
      image.src = state === 'jump' ? jumpSrc : standSrc;
      image.style.transform = state === 'jump' ? 'scale(0.78)' : '';
    }

    function onScroll() {
      var now = typeof getScrollY === 'function' ? getScrollY() : lastScroll;
      if (now - lastScroll > threshold) {
        applyState('jump');
        lastScroll = now;
      } else if (lastScroll - now > threshold) {
        applyState('stand');
        lastScroll = now;
      }
    }

    function toggle() {
      applyState(state === 'jump' ? 'stand' : 'jump');
    }

    applyState('stand');

    return {
      onScroll: onScroll,
      toggle: toggle,
      getState: function () { return state; }
    };
  }

  return {
    GAME_CONFIG: GAME_CONFIG,
    splitTextByLanguage: splitTextByLanguage,
    firstObstacleX: firstObstacleX,
    obstacleGap: obstacleGap,
    canSpawnObstacle: canSpawnObstacle,
    sequenceSpan: sequenceSpan,
    jumpClearanceFrames: jumpClearanceFrames,
    isSequencePlayable: isSequencePlayable,
    createAvatarController: createAvatarController
  };
});
