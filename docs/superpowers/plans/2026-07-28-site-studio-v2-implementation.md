# PersonalSite Per-Text Site Studio V2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace section-wide typography and page-inline editing with a persistent sidebar that edits every visible text item independently and previews changes live.

**Architecture:** Keep `js/site-studio.js` as a dependency-free UMD controller, but upgrade its draft model to V2 with per-edit-key text styles and UI state. Generate the sidebar from registered `[data-edit-key]` elements after `js/script.js` renders dynamic content, and apply text/style changes back through stable keys. Preserve the existing language-aware DOM renderer and use element-level CSS variables for independent scaling without scaling images or Canvas content.

**Tech Stack:** Static HTML, CSS custom properties, browser DOM APIs, JavaScript ES5-compatible syntax, `localStorage`, Node.js built-in test runner.

## Global Constraints

- Work only in `D:\PersonalSite`; create local Git commits but never push GitHub.
- Keep the strong pixel-game visual style, Zpix Chinese rendering, and existing mixed-language splitting.
- Cover navigation, Hero, About, Projects, Resume, Terminal, and footer text registered with stable edit keys.
- Keep images, Emoji, Canvas, borders, spacing, navigation, project links, terminal commands, avatar state switching, and the mini game functional outside edit mode.
- Keep the global font scale control; per-item scale is `80%–140%` in `5%` steps and composes with the global scale.
- Keep mini-game speed fixed at start `1`, maximum `2.5`; do not add a speed control.
- Treat edited copy as plain text; never write user copy with `innerHTML`.

## File Map

- Modify `js/site-studio.js`: V2 normalization/migration, per-text controller methods, dynamic sidebar generation, persistent open/close behavior, live inputs, page-to-sidebar selection.
- Modify `js/script.js`: attach human-readable edit labels and multiline metadata to every dynamic text node; preserve normal interactions when editing is closed.
- Modify `index.html`: attach labels to static edit nodes and replace hard-coded section controls with a generated-list mount point.
- Modify `stylesheet.css`: per-item font/scale application, sidebar item layout, selection states, desktop/mobile persistence.
- Modify `tests/site-studio.test.js`: replace V1 section/inline-edit expectations with V2 model, controller, panel, registry, and CSS behavior tests.
- Keep `tests/site-behaviors.test.js`, `tests/font-scale.test.js`, and `tests/typography.test.js` passing as regression coverage.

---

### Task 1: V2 draft normalization and V1 migration

**Files:**
- Modify: `tests/site-studio.test.js`
- Modify: `js/site-studio.js`

**Interfaces:**
- Consumes: raw JSON/string draft and the current page edit keys.
- Produces: `createEmptyDraft()`, `normalizeDraft(value, knownKeys)`, and V2 shape `{version, text, textStyles, ui}`.

- [ ] **Step 1: Replace the V1 normalization test with failing V2 and migration tests**

```js
test('normalizes V2 text styles and UI state against known edit keys', function () {
  const draft = api.normalizeDraft({
    version: 2,
    text: { 'hero.title': '', unknown: 'drop me' },
    textStyles: {
      'hero.title': { font: 'terminal', scale: 120 },
      'hero.subtitle': { font: 'invalid', scale: 103 }
    },
    ui: { selectedKey: 'hero.title', openSections: ['hero', 'unknown'] }
  }, ['hero.title', 'hero.subtitle']);

  assert.equal(draft.text['hero.title'], '');
  assert.equal(draft.text.unknown, undefined);
  assert.deepEqual(draft.textStyles['hero.title'], { font: 'terminal', scale: 120 });
  assert.deepEqual(draft.textStyles['hero.subtitle'], { font: 'classic', scale: 100 });
  assert.deepEqual(draft.ui, { selectedKey: 'hero.title', openSections: ['hero'] });
});

test('migrates V1 section typography to each known text item', function () {
  const draft = api.normalizeDraft({
    version: 1,
    sections: { hero: { font: 'code', scale: 125 } },
    text: { 'hero.title': '新名字', unknown: 'drop me' }
  }, ['hero.title', 'hero.subtitle', 'about.intro']);

  assert.equal(draft.version, 2);
  assert.equal(draft.text['hero.title'], '新名字');
  assert.deepEqual(draft.textStyles['hero.title'], { font: 'code', scale: 125 });
  assert.deepEqual(draft.textStyles['hero.subtitle'], { font: 'code', scale: 125 });
  assert.equal(draft.textStyles['about.intro'], undefined);
});

test('controller writes a migrated V1 draft back as V2', function () {
  const harness = createStudioHarness(JSON.stringify({
    version: 1,
    sections: { hero: { font: 'terminal', scale: 115 } },
    text: { 'hero.title': '新名字' }
  }));
  api.createController(harness.doc, harness.storage);
  assert.equal(JSON.parse(harness.writes.at(-1)[1]).version, 2);
});
```

- [ ] **Step 2: Run the focused tests and verify RED**

Run: `node --test --test-name-pattern="normalizes V2|migrates V1" tests/site-studio.test.js`

Expected: FAIL because the current controller only accepts `version: 1` and returns `sections`.

- [ ] **Step 3: Implement the V2 draft model and migration**

Implement these exact contracts in `js/site-studio.js`:

```js
var CONFIG = Object.freeze({
  storageKey: 'personal-site-studio-draft',
  version: 2,
  sections: ['nav', 'hero', 'about', 'projects', 'resume', 'terminal', 'footer'],
  presets: ['classic', 'terminal', 'arcade', 'code'],
  minScale: 80,
  maxScale: 140,
  step: 5,
  defaultScale: 100,
  maxTextLength: 5000
});

function createEmptyDraft() {
  return {
    version: CONFIG.version,
    text: {},
    textStyles: {},
    ui: { selectedKey: null, openSections: [] }
  };
}

function sectionFromKey(key) {
  var section = String(key).split('.')[0];
  return CONFIG.sections.indexOf(section) >= 0 ? section : null;
}

function normalizeTextStyle(value) {
  var font = value && CONFIG.presets.indexOf(value.font) >= 0 ? value.font : 'classic';
  var scale = Number(value && value.scale);
  return { font: font, scale: isValidScale(scale) ? scale : CONFIG.defaultScale };
}
```

`normalizeDraft(value, knownKeys)` must parse strings safely, drop keys not present in `knownKeys`, preserve empty strings, migrate V1 `sections[section]` to every matching known key, validate `selectedKey`, and deduplicate/filter `openSections` against `CONFIG.sections`. `createController` must detect that the loaded raw value was V1 and immediately persist the normalized V2 draft once.

- [ ] **Step 4: Run the focused tests and verify GREEN**

Run: `node --test --test-name-pattern="normalizes V2|migrates V1" tests/site-studio.test.js`

Expected: 2 tests pass, 0 fail.

- [ ] **Step 5: Commit the model migration**

```powershell
git add -- js/site-studio.js tests/site-studio.test.js
git commit -m "refactor: migrate site studio drafts to v2"
```

---

### Task 2: Register every visible text item with sidebar metadata

**Files:**
- Modify: `tests/site-studio.test.js`
- Modify: `index.html`
- Modify: `js/script.js`

**Interfaces:**
- Consumes: existing stable edit keys and source text.
- Produces: `data-edit-label`, optional `data-edit-multiline="true"`, and `data-edit-section` on every editable element.

- [ ] **Step 1: Add failing registry coverage**

```js
test('static and dynamic edit keys expose human-readable sidebar metadata', function () {
  assert.match(html, /data-edit-key="nav\.brand"[^>]*data-edit-label="站点名称"/);
  assert.match(html, /data-edit-key="hero\.scrollHint"[^>]*data-edit-label="下滑提示"/);
  assert.match(html, /data-edit-key="terminal\.inputPlaceholder"[^>]*data-edit-label="输入框提示"/);
  assert.match(script, /setEditKey\(heroTitle, 'hero\.title', user\.name, '姓名'/);
  assert.match(script, /setEditKey\(heroDesc, 'hero\.description',[\s\S]*?'个人简介', true\)/);
  assert.match(script, /proj\.title \+ ' · 项目介绍'/);
  assert.match(script, /'第 ' \+ \(index \+ 1\) \+ ' 段经历 · 描述'/);
});
```

- [ ] **Step 2: Run the registry test and verify RED**

Run: `node --test --test-name-pattern="sidebar metadata" tests/site-studio.test.js`

Expected: FAIL because labels and multiline metadata do not exist.

- [ ] **Step 3: Extend the edit registration helper and all call sites**

Use this complete helper contract:

```js
function setEditKey(element, key, sourceText, label, multiline) {
  if (!element) return;
  element.setAttribute('data-edit-key', key);
  element.setAttribute('data-edit-section', key.split('.')[0]);
  element.setAttribute('data-edit-label', label);
  if (typeof sourceText === 'string') element.setAttribute('data-edit-source', sourceText);
  if (multiline) element.setAttribute('data-edit-multiline', 'true');
}
```

Apply labels to dynamic nodes:

- Navigation: `HOME 导航`, `ABOUT 导航`, `PROJECTS 导航`, `RESUME 导航`, `TERMINAL 导航`.
- Hero: `姓名`, `身份介绍`, `个人简介` (multiline).
- About: `个人介绍` (multiline), `学习热情 · 属性名称`, `学习热情 · 属性数值`, equivalent labels for MP/EXP, each skill name, `属性面板标题`, `技能面板标题`.
- Projects: `<项目名> · 状态`, `<项目名> · 项目标题`, optional English title, `<项目名> · 项目介绍` (multiline), `<项目名> · 标签 N`.
- Resume: `第 N 段经历 · 时间/职位/公司/描述/亮点 N`; descriptions are multiline.
- Terminal: `开场提示` (multiline).

Add equivalent attributes directly to every static key in `index.html`, including section headings, subtitles, terminal labels, footer copy, and the scroll hint registered statically by the controller.

- [ ] **Step 4: Run registry and existing rendering tests**

Run: `node --test --test-name-pattern="sidebar metadata|data-driven text|mixed content" tests/site-studio.test.js tests/typography.test.js`

Expected: all selected tests pass.

- [ ] **Step 5: Commit the metadata registry**

```powershell
git add -- index.html js/script.js tests/site-studio.test.js
git commit -m "feat: label all editable site copy"
```

---

### Task 3: Add per-text controller styles and scoped resets

**Files:**
- Modify: `tests/site-studio.test.js`
- Modify: `js/site-studio.js`

**Interfaces:**
- Consumes: V2 draft and registered edit elements.
- Produces: `setTextStyle(key, font, scale)`, `resetItem(key)`, `resetSection(name)`, `resetAll()`, and `setUi(selectedKey, openSections)`.

- [ ] **Step 1: Add failing controller tests for independent styles and resets**

```js
test('applies text styles independently and resets one item without touching siblings', function () {
  const harness = createStudioHarness(null);
  const controller = api.createController(harness.doc, harness.storage);

  controller.setTextStyle('hero.title', 'arcade', 90);
  controller.setTextStyle('hero.subtitle', 'terminal', 125);
  assert.equal(harness.heroTitle.getAttribute('data-studio-font'), 'arcade');
  assert.equal(harness.heroTitle.style.getPropertyValue('--studio-item-scale'), '0.9');
  assert.equal(harness.heroSubtitle.getAttribute('data-studio-font'), 'terminal');
  assert.equal(harness.heroSubtitle.style.getPropertyValue('--studio-item-scale'), '1.25');

  controller.resetItem('hero.title');
  assert.equal(controller.getDraft().textStyles['hero.title'], undefined);
  assert.deepEqual(controller.getDraft().textStyles['hero.subtitle'], { font: 'terminal', scale: 125 });
});

test('section and global resets clear the correct V2 scopes', function () {
  const harness = createStudioHarness(null);
  const controller = api.createController(harness.doc, harness.storage);
  controller.setText('hero.title', '新名字');
  controller.setTextStyle('hero.title', 'code', 110);
  controller.setTextStyle('about.intro', 'terminal', 120);
  controller.resetSection('hero');
  assert.equal(controller.getDraft().text['hero.title'], undefined);
  assert.equal(controller.getDraft().textStyles['hero.title'], undefined);
  assert.deepEqual(controller.getDraft().textStyles['about.intro'], { font: 'terminal', scale: 120 });
  controller.resetAll();
  assert.deepEqual(controller.getDraft(), api.createEmptyDraft());
});
```

- [ ] **Step 2: Run the controller tests and verify RED**

Run: `node --test --test-name-pattern="styles independently|V2 scopes" tests/site-studio.test.js`

Expected: FAIL because `setTextStyle` and `resetItem` do not exist.

- [ ] **Step 3: Implement the per-item controller API**

Use element-level application:

```js
function applyTextStyle(element, setting) {
  if (!element) return;
  var safe = normalizeTextStyle(setting);
  element.setAttribute('data-studio-font', safe.font);
  element.style.setProperty('--studio-item-scale', String(safe.scale / 100));
}

function clearTextStyle(element) {
  if (!element) return;
  element.removeAttribute('data-studio-font');
  element.style.removeProperty('--studio-item-scale');
}
```

Extend the test style shim with `removeProperty`. `setTextStyle` validates the key, stores only non-default values, applies immediately, and persists. `resetItem` clears both `text[key]` and `textStyles[key]`, restores source text/placeholder and source style, then persists. `resetSection` filters both maps by the key prefix. `resetAll` restores all source text and removes all per-item attributes while preserving the separate global font-scale storage key.

- [ ] **Step 4: Run all controller tests and verify GREEN**

Run: `node --test --test-name-pattern="text styles|resets|plain text|placeholder|mixed" tests/site-studio.test.js`

Expected: all selected tests pass.

- [ ] **Step 5: Commit controller behavior**

```powershell
git add -- js/site-studio.js tests/site-studio.test.js
git commit -m "feat: style editable text independently"
```

---

### Task 4: Generate the persistent live-edit sidebar

**Files:**
- Modify: `tests/site-studio.test.js`
- Modify: `index.html`
- Modify: `js/site-studio.js`

**Interfaces:**
- Consumes: controller methods from Task 3 and registered edit metadata from Task 2.
- Produces: generated section/item controls mounted in `#siteStudioSections`; page selection synchronized through stable keys.

- [ ] **Step 1: Add failing markup and interaction tests**

```js
test('page provides a generated-list mount instead of section-wide controls', function () {
  assert.match(html, /id="siteStudioSections"/);
  assert.doesNotMatch(html, /id="siteStudioEditMode"/);
  assert.doesNotMatch(html, /data-studio-font-control/);
});

test('sidebar stays open until close and page text selects its live editor', function () {
  const harness = createPanelHarnessV2();
  harness.toggle.fire('click');
  assert.equal(harness.panel.hidden, false);
  assert.equal(harness.root.getAttribute('data-site-studio-editing'), 'true');

  harness.doc.fire('click', { target: harness.outside });
  harness.doc.fire('keydown', { key: 'Escape' });
  assert.equal(harness.panel.hidden, false);

  harness.heroSubtitle.fire('click', {
    target: harness.heroSubtitle,
    preventDefault: function () { harness.prevented = true; },
    stopPropagation: function () {}
  });
  assert.equal(harness.prevented, true);
  assert.equal(harness.heroSubtitle.getAttribute('data-studio-selected'), 'true');
  assert.equal(harness.subtitleEditor.open, true);

  harness.subtitleInput.value = '> AI Product Manager';
  harness.subtitleInput.fire('input');
  assert.equal(harness.heroSubtitle.textContent, '> AI Product Manager');

  harness.close.fire('click');
  assert.equal(harness.panel.hidden, true);
  assert.equal(harness.root.getAttribute('data-site-studio-editing'), 'false');
  assert.equal(harness.toggle.focused, true);

  harness.toggle.fire('click');
  assert.equal(harness.subtitleEditor.open, true);
  assert.equal(harness.heroSubtitle.getAttribute('data-studio-selected'), 'true');
});
```

- [ ] **Step 2: Run the new panel tests and verify RED**

Run: `node --test --test-name-pattern="generated-list|stays open" tests/site-studio.test.js`

Expected: FAIL because the current panel is hard-coded, uses an edit-mode checkbox, and closes on outside click/Escape.

- [ ] **Step 3: Replace hard-coded controls with a mount point**

Use this panel skeleton in `index.html`:

```html
<aside class="site-studio-panel" id="siteStudioPanel" hidden aria-label="网站排版与文案编辑">
  <div class="site-studio-header">
    <span class="text-cn" lang="zh-CN">排版与文案</span>
    <button class="site-studio-close" id="siteStudioClose" type="button" aria-label="关闭编辑网站">×</button>
  </div>
  <p class="site-studio-help">点击页面文字可在此定位并实时编辑</p>
  <div class="site-studio-sections" id="siteStudioSections"></div>
  <button class="site-studio-reset-all" id="siteStudioResetAll" type="button">恢复全部默认值</button>
</aside>
```

- [ ] **Step 4: Implement generated controls and live synchronization**

`bindPanel` must:

1. Scan registered text elements in DOM order and group by `data-edit-section`.
2. Build one section `details` and reset button per nonempty group.
3. Build one item `details` containing labeled text input/textarea, font select with all four presets, range input, output, and item reset. Opening or selecting one item closes other item details while leaving its containing section open.
4. On copy `input`, call `controller.setText(key, value)` and refresh the summary preview.
5. On font `change` and range `input`, call `controller.setTextStyle` and update the percentage.
6. On page text click while editing, prevent default/propagation, clear the previous selection, mark the new element with `data-studio-selected="true"`, open its section/item, save UI state, scroll the item into view, and focus its copy input.
7. Open editing immediately when the toggle opens the panel. Remove every `contenteditable` and terminal-placeholder inline-edit branch.
8. Ignore outside click and Escape for panel closing. Only the close button calls `setPanelOpen(false)`, removes selection, sets root editing state to false, and restores toggle focus.
9. Restore valid `ui.selectedKey` and `ui.openSections` when reopening, including page highlight and the selected editor's expanded state.

- [ ] **Step 5: Run panel, terminal, and navigation safety tests**

Run: `node --test --test-name-pattern="generated-list|stays open|terminal command|project" tests/site-studio.test.js`

Expected: all selected tests pass; no assertion expects `contenteditable`.

- [ ] **Step 6: Commit the generated sidebar**

```powershell
git add -- index.html js/site-studio.js tests/site-studio.test.js
git commit -m "feat: edit copy live from persistent sidebar"
```

---

### Task 5: Apply per-item pixel typography and responsive panel styling

**Files:**
- Modify: `tests/site-studio.test.js`
- Modify: `tests/typography.test.js`
- Modify: `stylesheet.css`

**Interfaces:**
- Consumes: `data-studio-font`, `--studio-item-scale`, and `data-studio-selected` from Tasks 3–4.
- Produces: independent font/scale visuals without modifying visual assets.

- [ ] **Step 1: Add failing CSS contract tests**

```js
test('studio CSS scales and fonts each edit key instead of its whole section', function () {
  assert.match(css, /\[data-edit-key\][\s\S]*--studio-item-scale:\s*1/);
  assert.match(css, /font-size:\s*calc\([^;]+var\(--studio-item-scale, 1\)\)/);
  assert.match(css, /\[data-edit-key\]\[data-studio-font="code"\]/);
  assert.match(css, /\[data-edit-key\]\[data-studio-selected="true"\]/);
  assert.doesNotMatch(css, /\[data-studio-section\][\s\S]{0,400}--studio-text-scale/);
  assert.doesNotMatch(css, /\.project-icon\s*\{[^}]*--studio-item-scale/);
});

test('mobile editable typography keeps each item scale', function () {
  assert.match(css, /\.hero-title\s*\{[^}]*var\(--studio-item-scale, 1\)/);
  assert.match(css, /\.nav-link\s*\{[^}]*var\(--studio-item-scale, 1\)/);
  assert.match(css, /@media \(max-width: 640px\)[\s\S]*\.site-studio-panel/);
});
```

- [ ] **Step 2: Run CSS tests and verify RED**

Run: `node --test --test-name-pattern="studio CSS|mobile editable" tests/site-studio.test.js tests/typography.test.js`

Expected: FAIL because the current CSS scales `[data-studio-section]` and has no item editor layout.

- [ ] **Step 3: Replace section-level studio CSS with per-item rules**

Add these base contracts and map each editable text class to its existing base size token:

```css
[data-edit-key] {
  --studio-item-scale: 1;
}

.hero-title {
  font-size: calc(var(--base-type-display) * var(--studio-item-scale, 1));
}

.hero-subtitle,
.project-title-cn,
.project-title-en {
  font-size: calc(var(--base-type-card-title) * var(--studio-item-scale, 1));
}

.hero-desc,
.project-desc,
.node-desc {
  font-size: calc(var(--base-type-body) * var(--studio-item-scale, 1));
}
```

Apply the same pattern to nav brand/link, scroll hint, section title/subtitle, About panel title/stat/skill, status/tag, resume period/title/company/highlight, Terminal title/body/prompt/input, and footer title/text. For nested section-title edit spans, assign their own base size rather than scaling the emoji sibling.

Font rules must keep `.text-cn` on Zpix and target English self/descendants for each preset. `classic` uses the original semantic body/display class; `terminal`, `arcade`, and `code` override English text only. Do not place `--studio-item-scale` on project icons, avatar images, emoji-only icons, or Canvas.

- [ ] **Step 4: Style generated controls and persistent selection**

Add compact pixel borders, item summary previews, textarea sizing, full-width selects/ranges, selected-page green highlight, and independent scrolling. Desktop stays fixed right; the `max-width: 640px` panel stays fixed at the bottom with `max-height: 75vh`. Add reduced-motion behavior:

```css
@media (prefers-reduced-motion: reduce) {
  .site-studio-panel,
  .site-studio-item-control {
    scroll-behavior: auto;
  }
}
```

- [ ] **Step 5: Run typography and studio suites**

Run: `node --test tests/typography.test.js tests/site-studio.test.js`

Expected: all tests pass with no visual-asset scaling assertions failing.

- [ ] **Step 6: Commit per-item styling**

```powershell
git add -- stylesheet.css tests/site-studio.test.js tests/typography.test.js
git commit -m "style: add per-text studio controls"
```

---

### Task 6: Integration regression and local delivery

**Files:**
- Modify if required by failures: `js/site-studio.js`, `js/script.js`, `index.html`, `stylesheet.css`, `tests/site-studio.test.js`
- Verify: `docs/superpowers/specs/2026-07-28-site-studio-v2-design.md`

**Interfaces:**
- Consumes: all V2 implementation tasks.
- Produces: a clean local branch ready for manual browser acceptance, with no GitHub push.

- [ ] **Step 1: Run the complete automated suite**

Run: `node --test "tests/*.test.js"`

Expected: every test passes, including game start `1` and cap `2.5`.

- [ ] **Step 2: Run structural and repository checks**

Run: `git diff --check`

Expected: exit code 0 and no whitespace errors.

Run: `rg -n "contenteditable|siteStudioEditMode|data-studio-font-control|--studio-text-scale" index.html js/site-studio.js stylesheet.css tests`

Expected: no production references to the retired inline/section-wide editor; test references occur only in negative assertions.

Run: `git status --short --branch`

Expected: only intentional V2 files are modified before the final commit.

- [ ] **Step 3: Audit every acceptance requirement against code/tests**

Confirm evidence for: only-`×` closing, per-item Hero independence, sidebar live text editing, page click localization, all dynamic registries, empty-string persistence, V1 migration, item/section/all resets, Terminal placeholder isolation, mixed-language rendering, mobile panel, normal link/terminal behavior after close, avatar regression, and game speed `1–2.5`.

- [ ] **Step 4: Commit any integration-only corrections**

If Step 1–3 required a correction, first add a failing regression test, apply the minimal fix, rerun the full suite, then commit only those files:

```powershell
git add -- js/site-studio.js js/script.js index.html stylesheet.css tests/site-studio.test.js tests/typography.test.js
git commit -m "fix: complete site studio v2 integration"
```

If no correction is required, do not create an empty commit.

- [ ] **Step 5: Prepare manual browser acceptance**

Open `file:///D:/PersonalSite/index.html` and provide this exact checklist to 岁安:

1. Open the editor; click outside, scroll, and press Escape—panel remains open.
2. Click “岁安” and the subtitle—each focuses its own sidebar item.
3. Enlarge only the subtitle; the name remains unchanged.
4. Type in the sidebar; the page updates on every keystroke and persists after refresh.
5. Check editable entries exist for navigation, About, both projects, all resume entries, Terminal, and footer.
6. Close with `×`; project cards open GitHub in a new tab, navigation and terminal commands work.
7. Resize to mobile width; every editor control remains reachable.
8. Run `game`; movement starts at speed `1` and never exceeds `2.5`.

- [ ] **Step 6: Report local-only completion**

Report the final commit(s), complete test count, clean/dirty status, and browser checklist. Explicitly state that nothing was pushed to GitHub.
