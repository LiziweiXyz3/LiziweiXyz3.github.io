const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const api = require('../js/site-config.js');

const root = path.join(__dirname, '..');
const config = JSON.parse(fs.readFileSync(path.join(root, 'site-config.json'), 'utf8'));
const schema = JSON.parse(fs.readFileSync(path.join(root, 'site-config.schema.json'), 'utf8'));
const editorHtml = fs.readFileSync(path.join(root, 'editor.html'), 'utf8');
const editorScript = fs.readFileSync(path.join(root, 'js', 'studio-editor.js'), 'utf8');
const runtimeScript = fs.readFileSync(path.join(root, 'js', 'site-runtime.js'), 'utf8');
const serverScript = fs.readFileSync(path.join(root, 'scripts', 'studio-server.js'), 'utf8');
const startEditorScript = fs.readFileSync(path.join(root, 'start-editor.cmd'), 'utf8');

test('V3 config uses stable ids for reorderable content', function () {
  assert.equal(config.version, 3);
  assert.deepEqual(config.content.experiences.map((item) => item.id), [
    'huya-2024', 'jingdong-2023', 'southampton-2021'
  ]);
  assert.ok(config.content.projects.every((item) => typeof item.id === 'string'));
  assert.ok(config.content.about.skills.every((item) => typeof item.id === 'string'));
});

test('versioned JSON Schema describes the complete formal configuration', function () {
  assert.equal(schema.properties.version.const, 3);
  assert.equal(schema.properties.game.properties.maxSpeed.maximum, 2.5);
  assert.deepEqual(schema.required, [
    'version', 'content', 'theme', 'styles', 'cursor', 'effects', 'assets', 'game'
  ]);
});

test('normalization caps game speed and preserves per-element styles', function () {
  const next = api.clone(config);
  next.game.maxSpeed = 8;
  next.game.startSpeed = 5;
  next.game.hangFrames = 99;
  next.styles.elements['resume.huya-2024.title'] = {
    fontCn: 'lxgw-wenkai',
    fontEn: 'ibm-plex-mono',
    size: 26,
    mobileSize: 20,
    color: '#ffffff'
  };
  const normalized = api.normalizeConfig(next, config);
  assert.equal(normalized.game.maxSpeed, 2.5);
  assert.equal(normalized.game.startSpeed, 2.5);
  assert.equal(normalized.game.hangFrames, 30);
  assert.equal(normalized.styles.elements['resume.huya-2024.title'].fontCn, 'lxgw-wenkai');
  assert.equal(normalized.styles.elements['resume.huya-2024.title'].mobileSize, 20);
});

test('reordering experiences does not change their style keys', function () {
  const next = api.clone(config);
  next.styles.elements['resume.huya-2024.title'] = { color: '#ff0000' };
  next.content.experiences.reverse();
  const normalized = api.normalizeConfig(next, config);
  assert.equal(normalized.content.experiences[2].id, 'huya-2024');
  assert.equal(normalized.styles.elements['resume.huya-2024.title'].color, '#ff0000');
});

test('legacy V2 draft maps index-based resume settings to stable ids', function () {
  const migrated = api.migrateLegacyDraft({
    version: 2,
    text: { 'resume.0.title': '高级数据分析师' },
    textStyles: { 'resume.0.title': { font: 'code', scale: 125, bold: true, italic: false } }
  }, config);
  assert.equal(migrated.content.overrides.text['resume.huya-2024.title'], '高级数据分析师');
  assert.equal(migrated.styles.elements['resume.huya-2024.title'].fontEn, 'fira-code');
  assert.equal(migrated.styles.elements['resume.huya-2024.title'].weight, 700);
});

test('game validation rejects impossible compact obstacle gaps', function () {
  const next = api.clone(config);
  next.game.sequences[2].items[0].gap = 10;
  const validation = api.validateConfig(next);
  assert.equal(validation.valid, false);
  assert.match(validation.errors.join(' '), /内部间距至少为 24/);
});

test('game validation rejects jump physics that cannot clear the large obstacle', function () {
  const next = api.clone(config);
  next.game.jumpVelocity = -3;
  next.game.riseGravity = 0.5;
  const validation = api.validateConfig(next);
  assert.equal(validation.valid, false);
  assert.match(validation.errors.join(' '), /无法越过大仙人掌/);
});

test('formal save validation rejects incomplete configurations', function () {
  const incomplete = api.clone(config);
  delete incomplete.content.experiences;
  delete incomplete.cursor;
  const validation = api.validateConfig(incomplete);
  assert.equal(validation.valid, false);
  assert.match(validation.errors.join(' '), /缺少履历内容/);
  assert.match(validation.errors.join(' '), /缺少光标设置/);
});

test('editor exposes live preview, content structure, theme, assets, game and history', function () {
  assert.match(editorHtml, /index\.html\?studio-preview=1/);
  assert.match(editorHtml, /id="discardDraftButton"/);
  assert.match(editorHtml, /data-tab="element"/);
  assert.match(editorHtml, /data-tab="theme"/);
  assert.match(editorHtml, /data-tab="assets"/);
  assert.match(editorHtml, /data-tab="game"/);
  assert.match(editorHtml, /data-tab="history"/);
  assert.match(editorScript, /personal-site-studio-v3-draft/);
  assert.match(editorScript, /studio:apply-draft/);
});

test('preview bridge accepts only same-origin editor messages', function () {
  assert.match(runtimeScript, /event\.origin !== window\.location\.origin/);
  assert.match(runtimeScript, /studio:apply-draft/);
  assert.match(runtimeScript, /studio:select/);
  assert.match(runtimeScript, /studio:start-game/);
});

test('local server uses atomic saves, restricted assets and a 20 version history', function () {
  assert.match(serverScript, /fsp\.rename\(temp, filePath\)/);
  assert.match(serverScript, /files\.slice\(20\)/);
  assert.match(serverScript, /assets', 'custom/);
  assert.match(serverScript, /\['cursor', 'avatar', 'project-icon'\]/);
  assert.match(serverScript, /target\.startsWith\(ROOT \+ path\.sep\)/);
  assert.match(serverScript, /光标尺寸不能超过 128 × 128/);
  assert.match(serverScript, /素材文件内容与格式不匹配/);
});

test('editor starter reuses an existing local service and opens the editor directly', function () {
  assert.match(startEditorScript, /api\/health/);
  assert.match(startEditorScript, /start "" "%EDITOR_URL%"/);
  assert.doesNotMatch(startEditorScript, /studio-server\.js --open/);
});

test('public index remains editor-free', function () {
  const publicHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.doesNotMatch(publicHtml, /studio-editor\.js/);
  assert.doesNotMatch(publicHtml, /siteStudioToggle/);
  assert.match(publicHtml, /site-config\.js/);
  assert.match(publicHtml, /site-runtime\.js/);
});
