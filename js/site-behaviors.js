(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.SiteBehaviors = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var GAME_CONFIG = Object.freeze({
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
    hangFrames: 8,
    anticipationFrames: 6,
    landingFrames: 3,
    sequences: []
  });

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
    firstObstacleX: firstObstacleX,
    obstacleGap: obstacleGap,
    canSpawnObstacle: canSpawnObstacle,
    createAvatarController: createAvatarController
  };
});
