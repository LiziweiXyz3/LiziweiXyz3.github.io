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
    maxObstacles: 3
  });

  function firstObstacleX(width) {
    return Math.round(Number(width) * GAME_CONFIG.firstObstacleRatio);
  }

  function obstacleGap(randomValue) {
    var safe = Math.max(0, Math.min(1, Number(randomValue)));
    return Math.round(GAME_CONFIG.minObstacleGap +
      (GAME_CONFIG.maxObstacleGap - GAME_CONFIG.minObstacleGap) * safe);
  }

  function canSpawnObstacle(width, latestX, count, nextGap) {
    return count < GAME_CONFIG.maxObstacles && Number(width) - Number(latestX) >= Number(nextGap);
  }

  function createAvatarController(image, getScrollY) {
    var state = 'stand';
    var lastScroll = typeof getScrollY === 'function' ? getScrollY() : 0;

    function applyState(nextState) {
      state = nextState;
      if (!image) return;
      image.src = state === 'jump' ? 'selfie_jump.png' : 'selfie_stand.png';
      image.style.transform = state === 'jump' ? 'scale(0.78)' : '';
    }

    function onScroll() {
      var now = typeof getScrollY === 'function' ? getScrollY() : lastScroll;
      if (now - lastScroll > 10) {
        applyState('jump');
        lastScroll = now;
      } else if (lastScroll - now > 10) {
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
