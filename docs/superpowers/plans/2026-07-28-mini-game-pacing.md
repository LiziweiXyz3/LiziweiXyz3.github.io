# Terminal Mini Game Pacing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace fixed-frame cactus spawning with the approved distance-based casual pacing.

**Architecture:** Add pure pacing helpers beside `GAME_CONFIG` in `js/site-behaviors.js`, then consume those helpers from the existing Canvas loop in `js/script.js`. Keep rendering, controls, collision, scoring, and speed progression unchanged.

**Tech Stack:** Static JavaScript, Canvas 2D, Node.js built-in test runner.

## Global Constraints

- Work only in `D:\PersonalSite` and do not push GitHub.
- Start speed stays `1`; maximum speed stays `2.5`.
- First obstacle ratio is `0.6`; gap range is `260–360` pixels; maximum obstacle count is `3`.
- Do not add difficulty controls, levels, items, or new UI.

---

### Task 1: Add the pure pacing model

**Files:**
- Modify: `tests/site-behaviors.test.js`
- Modify: `js/site-behaviors.js`

**Interfaces:**
- Produces: `firstObstacleX(width)`, `obstacleGap(randomValue)`, and `canSpawnObstacle(width, latestX, count, nextGap)`.

- [ ] **Step 1: Write failing tests**

```js
assert.equal(api.firstObstacleX(800), 480);
assert.equal(api.obstacleGap(0), 260);
assert.equal(api.obstacleGap(0.5), 310);
assert.equal(api.obstacleGap(1), 360);
assert.equal(api.canSpawnObstacle(800, 600, 1, 260), false);
assert.equal(api.canSpawnObstacle(800, 540, 1, 260), true);
assert.equal(api.canSpawnObstacle(800, 400, 3, 260), false);
```

- [ ] **Step 2: Verify RED**

Run: `node --test tests/site-behaviors.test.js`

Expected: FAIL because the pacing helpers do not exist.

- [ ] **Step 3: Implement the minimal pure helpers**

```js
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
```

- [ ] **Step 4: Verify GREEN**

Run: `node --test tests/site-behaviors.test.js`

Expected: all tests pass.

### Task 2: Connect pacing to the Canvas loop

**Files:**
- Modify: `tests/site-studio.test.js`
- Modify: `js/script.js`

**Interfaces:**
- Consumes: the three pure pacing helpers from Task 1.
- Produces: an initial obstacle at 60% width and distance-based subsequent obstacles.

- [ ] **Step 1: Write a failing integration contract test**

```js
assert.doesNotMatch(script, /frame % 60/);
assert.match(script, /firstObstacleX\(W\)/);
assert.match(script, /canSpawnObstacle\(W, latest\.x, obstacles\.length, nextObstacleGap\)/);
assert.match(script, /obstacleGap\(Math\.random\(\)\)/);
```

- [ ] **Step 2: Verify RED**

Run: `node --test --test-name-pattern="distance-based obstacle pacing" tests/site-studio.test.js`

Expected: FAIL because the loop still uses fixed 60-frame spawning.

- [ ] **Step 3: Replace the spawn scheduler**

Create the first obstacle in `restart()` using `firstObstacleX(W)`. In `spawnObstacle()`, inspect the latest obstacle and add a new obstacle at `W` only when `canSpawnObstacle(...)` returns true; then select the next gap with `obstacleGap(Math.random())`.

- [ ] **Step 4: Run complete verification**

Run: `node --test "tests/*.test.js"`

Expected: all tests pass, including speed `1–2.5`, avatar behavior, typography, and Site Studio.

Run: `node --check js/site-behaviors.js; node --check js/script.js; git diff --check`

Expected: exit code 0.

- [ ] **Step 5: Commit locally**

```powershell
git add js/site-behaviors.js js/script.js tests/site-behaviors.test.js tests/site-studio.test.js
git commit -m "fix: space terminal game obstacles"
```

