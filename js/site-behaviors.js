(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.SiteBehaviors = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var GAME_CONFIG = Object.freeze({
    startSpeed: 3,
    maxSpeed: 5,
    speedStep: 0.15,
    speedEveryFrames: 600
  });

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
      if (now - lastScroll > 10) applyState('jump');
      else if (lastScroll - now > 10) applyState('stand');
      lastScroll = now;
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
    createAvatarController: createAvatarController
  };
});
